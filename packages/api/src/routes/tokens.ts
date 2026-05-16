import { Router } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth'
import { IssueTokenResponse, CallNextPatientResponse } from '@queueless/shared'

const router = Router()

const issueTokenSchema = z.object({
  queue_id: z.string().uuid(),
  patient_id: z.string().uuid().optional(),
  patient_name: z.string().optional(),
  patient_phone: z.string().optional(),
  type: z.enum(['app', 'walkin']),
})

// POST /tokens — issue a new token (patient booking or receptionist walk-in)
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = issueTokenSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { queue_id, patient_id, patient_name, patient_phone, type } = parsed.data

  // Get current highest token number for this queue
  const { data: lastToken } = await supabase
    .from('tokens')
    .select('number')
    .eq('queue_id', queue_id)
    .order('number', { ascending: false })
    .limit(1)
    .single()

  const nextNumber = (lastToken?.number ?? 0) + 1

  const { data: token, error } = await supabase
    .from('tokens')
    .insert({
      queue_id,
      patient_id: patient_id ?? req.userId,
      patient_name,
      patient_phone,
      number: nextNumber,
      type,
      status: 'waiting',
    })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  // Compute position and wait time
  const { count: position } = await supabase
    .from('tokens')
    .select('id', { count: 'exact', head: true })
    .eq('queue_id', queue_id)
    .eq('status', 'waiting')
    .lte('number', nextNumber)

  const { data: queue } = await supabase
    .from('queues')
    .select('avg_minutes_per_patient')
    .eq('id', queue_id)
    .single()

  const estimatedWait = (position ?? 1) * (queue?.avg_minutes_per_patient ?? 10)

  const response: IssueTokenResponse = {
    token,
    position: position ?? 1,
    estimated_wait_minutes: estimatedWait,
  }

  res.status(201).json(response)
})

// GET /tokens/:id/position — live position for a patient's token
router.get('/:id/position', requireAuth, async (req, res) => {
  const { data: token, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error || !token) {
    res.status(404).json({ error: 'Token not found' })
    return
  }

  if (token.status !== 'waiting') {
    res.json({ token, position: 0, estimated_wait_minutes: 0 })
    return
  }

  const { count } = await supabase
    .from('tokens')
    .select('id', { count: 'exact', head: true })
    .eq('queue_id', token.queue_id)
    .eq('status', 'waiting')
    .lt('number', token.number)

  const position = (count ?? 0) + 1

  const { data: queue } = await supabase
    .from('queues')
    .select('avg_minutes_per_patient')
    .eq('id', token.queue_id)
    .single()

  res.json({
    token,
    position,
    estimated_wait_minutes: position * (queue?.avg_minutes_per_patient ?? 10),
  })
})

// PATCH /tokens/:id/cancel
router.patch('/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  const { data: token } = await supabase
    .from('tokens')
    .select('patient_id')
    .eq('id', req.params.id)
    .single()

  if (!token) {
    res.status(404).json({ error: 'Token not found' })
    return
  }

  // Patients can only cancel their own token; receptionists/admins can cancel any
  if (req.userRole === 'patient' && token.patient_id !== req.userId) {
    res.status(403).json({ error: 'Cannot cancel another patient\'s token' })
    return
  }

  const { error } = await supabase
    .from('tokens')
    .update({ status: 'cancelled' })
    .eq('id', req.params.id)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ success: true })
})

// POST /tokens/call-next — doctor calls next patient (advances queue)
router.post('/call-next', requireAuth, requireRole('doctor', 'receptionist', 'admin'), async (req: AuthRequest, res) => {
  const { queue_id } = req.body

  if (!queue_id) {
    res.status(400).json({ error: 'queue_id is required' })
    return
  }

  // Mark current "called" token as completed
  await supabase
    .from('tokens')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('queue_id', queue_id)
    .eq('status', 'called')

  // Find the next waiting token
  const { data: nextToken } = await supabase
    .from('tokens')
    .select('*')
    .eq('queue_id', queue_id)
    .eq('status', 'waiting')
    .order('number', { ascending: true })
    .limit(1)
    .single()

  if (!nextToken) {
    res.json({ called_token: null, next_token: null, remaining: 0 })
    return
  }

  // Mark it as called
  const { data: calledToken, error } = await supabase
    .from('tokens')
    .update({ status: 'called', called_at: new Date().toISOString() })
    .eq('id', nextToken.id)
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  // Update queue's current_number
  await supabase
    .from('queues')
    .update({ last_called_number: calledToken.number })
    .eq('id', queue_id)

  // Peek at next waiting token
  const { data: afterNext } = await supabase
    .from('tokens')
    .select('*')
    .eq('queue_id', queue_id)
    .eq('status', 'waiting')
    .order('number', { ascending: true })
    .limit(1)
    .single()

  const { count: remaining } = await supabase
    .from('tokens')
    .select('id', { count: 'exact', head: true })
    .eq('queue_id', queue_id)
    .eq('status', 'waiting')

  const response: CallNextPatientResponse = {
    called_token: calledToken,
    next_token: afterNext ?? null,
    remaining: remaining ?? 0,
  }

  res.json(response)
})

export default router
