import { Router } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

// GET /queues/:id — full queue state
router.get('/:id', requireAuth, async (req, res) => {
  const { data: queue, error } = await supabase
    .from('queues')
    .select(`*, doctors(name, specialty)`)
    .eq('id', req.params.id)
    .single()

  if (error || !queue) {
    res.status(404).json({ error: 'Queue not found' })
    return
  }

  const { data: tokens } = await supabase
    .from('tokens')
    .select('*')
    .eq('queue_id', req.params.id)
    .in('status', ['waiting', 'called'])
    .order('number', { ascending: true })

  res.json({ queue, tokens: tokens ?? [] })
})

const patchQueueSchema = z.object({
  status: z.enum(['open', 'paused', 'closed']).optional(),
  avg_minutes_per_patient: z.number().positive().optional(),
})

// PATCH /queues/:id — admin/receptionist update queue status or avg time
router.patch('/:id', requireAuth, requireRole('admin', 'receptionist'), async (req, res) => {
  const parsed = patchQueueSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { data, error } = await supabase
    .from('queues')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ queue: data })
})

// POST /queues — create a new queue for today (doctor or admin)
router.post('/', requireAuth, requireRole('admin', 'receptionist', 'doctor'), async (req, res) => {
  const { doctor_id } = req.body
  if (!doctor_id) {
    res.status(400).json({ error: 'doctor_id required' })
    return
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('queues')
    .select('id')
    .eq('doctor_id', doctor_id)
    .eq('date', today)
    .single()

  if (existing) {
    res.status(409).json({ error: 'Queue already exists for today', queue_id: existing.id })
    return
  }

  const { data, error } = await supabase
    .from('queues')
    .insert({ doctor_id, date: today, status: 'open', current_number: 0, last_called_number: 0, avg_minutes_per_patient: 10 })
    .select()
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.status(201).json({ queue: data })
})

export default router
