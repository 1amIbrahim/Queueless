import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../lib/api'
import { supabase } from '../lib/supabase'
import DoctorQueueCard from '../components/DoctorQueueCard'
import { useAuthStore } from '../store/authStore'

interface Hospital { id: string; name: string }
interface QueueItem {
  id: string; status: string; queue_length: number
  estimated_wait_minutes: number; avg_minutes_per_patient: number
  last_called_number: number
  doctors: { id: string; name: string; specialty: string }
}

const LAHORE = { lat: 31.52, lng: 74.36 }

export default function QueueMonitor() {
  const { userRole, hospitalId } = useAuthStore()
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
      if (userRole !== 'admin' && hospitalId) {
        const own = d.hospitals.find(h => h.id === hospitalId)
        setHospitals(own ? [own] : [])
        if (own) setSelectedHospital(own.id)
      } else {
        setHospitals(d.hospitals)
        if (d.hospitals.length > 0) setSelectedHospital(d.hospitals[0].id)
      }
    }).catch(() => {})
  }, [hospitalId, userRole])

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
    <div className="min-h-screen bg-slate-50">
      <div className="px-6 py-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Operations</p>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-2">Queue Monitor</h1>
            <p className="text-slate-500 text-sm mt-2">
              Live view of all doctor queues · {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            {userRole === 'admin' ? (
              <select
                value={selectedHospital}
                onChange={e => setSelectedHospital(e.target.value)}
                className="border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            ) : (
              <div className="border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white text-slate-600">
                {hospitals[0]?.name ?? 'Assigned hospital'}
              </div>
            )}
            <button
              onClick={() => loadQueues(selectedHospital)}
              className="bg-slate-900 text-white rounded-xl px-4 py-3 text-sm hover:bg-slate-800 transition-colors"
            >
              Refresh Live View
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Waiting" value={String(totalWaiting)} color="text-slate-900" />
          <StatCard label="Open Queues" value={String(openQueues)} color="text-emerald-600" />
          <StatCard label="Doctors Active" value={String(queues.length)} color="text-blue-600" />
        </div>

        {/* Queue cards */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : queues.length === 0 ? (
          <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-4xl mb-3">🏥</p>
            <p className="font-medium">No queues found for this hospital today</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs uppercase tracking-[0.25em] text-slate-400 mt-2">{label}</p>
    </div>
  )
}
