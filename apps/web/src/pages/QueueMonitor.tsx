import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../lib/api'
import { supabase } from '../lib/supabase'
import DoctorQueueCard from '../components/DoctorQueueCard'

interface Hospital { id: string; name: string }
interface QueueItem {
  id: string; status: string; queue_length: number
  estimated_wait_minutes: number; avg_minutes_per_patient: number
  last_called_number: number
  doctors: { id: string; name: string; specialty: string }
}

const LAHORE = { lat: 31.52, lng: 74.36 }

export default function QueueMonitor() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospital, setSelectedHospital] = useState('')
  const [queues, setQueues] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(false)
  const [callingNext, setCallingNext] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    apiGet<{ hospitals: Hospital[] }>(
      `/hospitals/nearby?lat=${LAHORE.lat}&lng=${LAHORE.lng}&radius_km=50`
    ).then(d => {
      setHospitals(d.hospitals)
      if (d.hospitals.length > 0) setSelectedHospital(d.hospitals[0].id)
    }).catch(() => {})
  }, [])

  const loadQueues = useCallback(async (hospitalId: string, quiet = false) => {
    if (!hospitalId) return
    if (!quiet) setLoading(true)
    try {
      const data = await apiGet<{ queues: QueueItem[] }>(`/hospitals/${hospitalId}/queues`)
      setQueues(data.queues.filter(q => q.doctors))
      setLastUpdated(new Date())
    } catch {}
    finally { setLoading(false) }
  }, [])

  // Load queues when hospital changes
  useEffect(() => {
    loadQueues(selectedHospital)
  }, [selectedHospital, loadQueues])

  // Auto-refresh every 20 seconds
  useEffect(() => {
    const t = setInterval(() => loadQueues(selectedHospital, true), 20_000)
    return () => clearInterval(t)
  }, [selectedHospital, loadQueues])

  // Supabase Realtime — refresh on any token change
  useEffect(() => {
    const channel = supabase
      .channel('monitor-tokens')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' },
        () => loadQueues(selectedHospital, true)
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedHospital, loadQueues])

  const callNext = async (queueId: string) => {
    setCallingNext(queueId)
    try {
      await apiPost('/tokens/call-next', { queue_id: queueId })
      await loadQueues(selectedHospital, true)
    } catch {}
    finally { setCallingNext(null) }
  }

  const totalWaiting = queues.reduce((s, q) => s + q.queue_length, 0)
  const openQueues = queues.filter(q => q.status === 'open').length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Queue Monitor</h1>
          <p className="text-slate-500 text-sm mt-1">
            Live view of all doctor queues · {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedHospital}
            onChange={e => setSelectedHospital(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <button
            onClick={() => loadQueues(selectedHospital)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Waiting" value={String(totalWaiting)} color="text-slate-900" />
        <StatCard label="Open Queues" value={String(openQueues)} color="text-green-600" />
        <StatCard label="Doctors Active" value={String(queues.length)} color="text-blue-600" />
      </div>

      {/* Queue cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : queues.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-4xl mb-3">🏥</p>
          <p className="font-medium">No queues found for this hospital today</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {queues.map(q => (
            <DoctorQueueCard
              key={q.id}
              queue={q}
              onCallNext={() => callNext(q.id)}
              callingNext={callingNext === q.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  )
}
