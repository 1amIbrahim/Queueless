import { supabase } from './supabase'

const twilioClient = (() => {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token || sid.startsWith('AC' + 'x')) return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('twilio')(sid, token)
})()

async function sendSms(to: string, body: string) {
  if (!twilioClient) { console.log(`[SMS] ${to} → ${body}`); return }
  await twilioClient.messages.create({ from: process.env.TWILIO_PHONE, to, body })
}

async function sendWhatsApp(to: string, body: string) {
  if (!twilioClient) { console.log(`[WhatsApp] ${to} → ${body}`); return }
  await twilioClient.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`,
    body,
  })
}

// Notify a single token holder that their turn is approaching
export async function notifyToken(tokenId: string) {
  const { data: token } = await supabase
    .from('tokens')
    .select('*, queues(avg_minutes_per_patient, doctors(name, hospitals(name)))')
    .eq('id', tokenId)
    .single()

  if (!token?.patient_phone) return

  const { count: ahead } = await supabase
    .from('tokens')
    .select('id', { count: 'exact', head: true })
    .eq('queue_id', token.queue_id)
    .eq('status', 'waiting')
    .lt('number', token.number)

  const position = (ahead ?? 0) + 1
  const waitMins = position * (token.queues?.avg_minutes_per_patient ?? 10)
  const doctor = token.queues?.doctors?.name ?? 'your doctor'
  const hospital = token.queues?.doctors?.hospitals?.name ?? 'the hospital'

  const message =
    position === 1
      ? `You're next! Token #${token.number} at ${hospital} (Dr. ${doctor}). Please make your way to the room.`
      : `Your token #${token.number} at ${hospital} (Dr. ${doctor}) is ${position - 1} patient(s) away. Est. wait: ~${waitMins} min.`

  const inserts: Promise<any>[] = []

  try {
    await sendSms(token.patient_phone, message)
    inserts.push(supabase.from('notifications').insert({ token_id: tokenId, channel: 'sms', message, sent_at: new Date().toISOString(), delivered: true }))
  } catch (e) {
    console.error('[notify] SMS failed:', e)
  }

  try {
    await sendWhatsApp(token.patient_phone, message)
    inserts.push(supabase.from('notifications').insert({ token_id: tokenId, channel: 'whatsapp', message, sent_at: new Date().toISOString(), delivered: true }))
  } catch (e) {
    console.error('[notify] WhatsApp failed:', e)
  }

  await Promise.allSettled(inserts)
}

// After calling next in a queue, notify patients now at positions 1, 2, 3
export async function notifyApproachingPatients(queueId: string) {
  const { data: tokens } = await supabase
    .from('tokens')
    .select('id, patient_phone, number')
    .eq('queue_id', queueId)
    .eq('status', 'waiting')
    .order('number', { ascending: true })
    .limit(3)

  if (!tokens) return

  for (const t of tokens) {
    if (t.patient_phone) {
      // Fire and forget — don't block the response
      notifyToken(t.id).catch(() => {})
    }
  }
}
