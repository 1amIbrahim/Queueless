import { Router } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { haversineKm } from '../lib/distance'
import { HospitalWithWait, Specialty } from '@queueless/shared'

const router = Router()

const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_km: z.coerce.number().default(20),
  specialty: z.string().optional(),
})

// GET /hospitals/nearby?lat=&lng=&radius_km=&specialty=
router.get('/nearby', async (req, res) => {
  const parsed = nearbySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }
  const { lat, lng, radius_km, specialty } = parsed.data

  const { data: hospitals, error } = await supabase.from('hospitals').select('*')
  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  const today = new Date().toISOString().split('T')[0]

  const results: HospitalWithWait[] = []

  for (const hospital of hospitals) {
    const dist = haversineKm(lat, lng, hospital.lat, hospital.lng)
    if (dist > radius_km) continue

    // Fetch today's open queues for this hospital (optionally filtered by specialty)
    let queueQuery = supabase
      .from('queues')
      .select('id, avg_minutes_per_patient, doctors!inner(hospital_id, specialty)')
      .eq('date', today)
      .eq('status', 'open')
      .eq('doctors.hospital_id', hospital.id)

    if (specialty) {
      queueQuery = queueQuery.eq('doctors.specialty', specialty as Specialty)
    }

    const { data: queues } = await queueQuery

    // Count waiting tokens per queue to compute real wait time
    let minWait = 999
    let activeQueues = 0

    if (queues && queues.length > 0) {
      for (const queue of queues) {
        const { count } = await supabase
          .from('tokens')
          .select('id', { count: 'exact', head: true })
          .eq('queue_id', queue.id)
          .eq('status', 'waiting')

        const waiting = count ?? 0
        const waitMins = waiting * (queue.avg_minutes_per_patient ?? 10)
        if (waitMins < minWait) minWait = waitMins
        activeQueues++
      }
    }

    results.push({
      ...hospital,
      distance_km: Math.round(dist * 10) / 10,
      min_wait_minutes: minWait === 999 ? 0 : minWait,
      active_queues: activeQueues,
    })
  }

  results.sort((a, b) => a.min_wait_minutes - b.min_wait_minutes)

  res.json({ hospitals: results })
})

// GET /hospitals/:id/queues
router.get('/:id/queues', requireAuth, async (req: AuthRequest, res) => {
  if ((req.userRole === 'receptionist' || req.userRole === 'doctor') && req.userHospitalId && req.userHospitalId !== req.params.id) {
    res.status(403).json({ error: 'Access restricted to your hospital' })
    return
  }
  const today = new Date().toISOString().split('T')[0]

  // Fetch doctor IDs belonging to this hospital first, then query queues by doctor_id.
  // This avoids the PostgREST limitation where filtering on a joined table sets the
  // join result to null instead of excluding the row.
  const { data: hospitalDoctors, error: docError } = await supabase
    .from('doctors')
    .select('id')
    .eq('hospital_id', req.params.id)
    .eq('is_active', true)

  if (docError) {
    res.status(500).json({ error: docError.message })
    return
  }

  const doctorIds = (hospitalDoctors ?? []).map((d: any) => d.id)

  if (doctorIds.length === 0) {
    res.json({ queues: [] })
    return
  }

  const { data: queues, error } = await supabase
    .from('queues')
    .select(`
      *,
      doctors (
        id, name, specialty,
        departments ( name )
      )
    `)
    .eq('date', today)
    .in('doctor_id', doctorIds)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  // Attach live token counts, skip any queue whose doctor join is null
  const enriched = await Promise.all(
    (queues ?? [])
      .filter((q: any) => q.doctors !== null)
      .map(async (q: any) => {
        const { count } = await supabase
          .from('tokens')
          .select('id', { count: 'exact', head: true })
          .eq('queue_id', q.id)
          .eq('status', 'waiting')

        return {
          ...q,
          queue_length: count ?? 0,
          estimated_wait_minutes: (count ?? 0) * (q.avg_minutes_per_patient ?? 10),
        }
      })
  )

  res.json({ queues: enriched })
})

export default router
