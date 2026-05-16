import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

const twilioClient = (() => {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('twilio')(sid, token)
})()

async function sendSms(to: string, body: string) {
  if (!twilioClient) {
    console.log(`[SMS mock] To: ${to} | ${body}`)
    return
  }
  await twilioClient.messages.create({ from: process.env.TWILIO_PHONE, to, body })
}

async function sendWhatsApp(to: string, body: string) {
  if (!twilioClient) {
    console.log(`[WhatsApp mock] To: ${to} | ${body}`)
    return
  }
  await twilioClient.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`,
    body,
  })
}

// Called internally when queue position reaches threshold
// POST /notifications/send
router.post('/send', requireAuth, requireRole('admin', 'receptionist', 'doctor'), async (req, res) => {
  const { token_id } = req.body

  const { data: token } = await supabase
    .from('tokens')
    .select('*, queues(avg_minutes_per_patient, doctors(name, hospitals(name)))')
    .eq('id', token_id)
    .single()

  if (!token || !token.patient_phone) {
    res.status(404).json({ error: 'Token not found or no phone number' })
    return
  }

  const { count: position } = await supabase
    .from('tokens')
    .select('id', { count: 'exact', head: true })
    .eq('queue_id', token.queue_id)
    .eq('status', 'waiting')
    .lt('number', token.number)

  const waitMins = ((position ?? 0) + 1) * (token.queues?.avg_minutes_per_patient ?? 10)
  const doctorName = token.queues?.doctors?.name ?? 'your doctor'
  const hospitalName = token.queues?.doctors?.hospitals?.name ?? 'the hospital'

  const message = `Your token #${token.number} at ${hospitalName} (Dr. ${doctorName}) is ${(position ?? 0) + 1} patient(s) away. Est. wait: ${waitMins} min.`

  const logs: { channel: string; success: boolean }[] = []

  try {
    await sendSms(token.patient_phone, message)
    logs.push({ channel: 'sms', success: true })
    await supabase.from('notifications').insert({ token_id, channel: 'sms', message, sent_at: new Date().toISOString(), delivered: true })
  } catch {
    logs.push({ channel: 'sms', success: false })
  }

  try {
    await sendWhatsApp(token.patient_phone, message)
    logs.push({ channel: 'whatsapp', success: true })
    await supabase.from('notifications').insert({ token_id, channel: 'whatsapp', message, sent_at: new Date().toISOString(), delivered: true })
  } catch {
    logs.push({ channel: 'whatsapp', success: false })
  }

  res.json({ sent: logs })
})

export default router
