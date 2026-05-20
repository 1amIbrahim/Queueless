import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../lib/api'
import ReceiptModal from '../components/ReceiptModal'
import { useAuthStore } from '../store/authStore'

interface Hospital { id: string; name: string; address: string }
interface QueueItem {
  id: string; status: string; queue_length: number; estimated_wait_minutes: number
  doctors: { id: string; name: string; specialty: string }
}

const LAHORE = { lat: 31.52, lng: 74.36 }

export default function TokenGenerator() {
  const { userRole, hospitalId } = useAuthStore()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [queues, setQueues] = useState<QueueItem[]>([])
  const [selectedHospital, setSelectedHospital] = useState('')
  const [selectedQueue, setSelectedQueue] = useState('')
  const [patientName, setPatientName] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [hospitalError, setHospitalError] = useState<string | null>(null)
  const [loadingQueues, setLoadingQueues] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<any>(null)

  // Fetch hospitals on mount
  useEffect(() => {
    apiGet<{ hospitals: Hospital[] }>(
      `/hospitals/nearby?lat=${LAHORE.lat}&lng=${LAHORE.lng}&radius_km=50`
    )
      .then(d => {
        if (userRole !== 'admin' && hospitalId) {
          const own = d.hospitals.find(h => h.id === hospitalId)
          setHospitals(own ? [own] : [])
          setSelectedHospital(own?.id ?? '')
        } else {
          setHospitals(d.hospitals)
        }
      })
      .catch(e => {
        console.error('Failed to load hospitals:', e)
        setHospitalError(`Could not load hospitals: ${e.message}. Is the API running on ${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}?`)
      })
  }, [hospitalId, userRole])

  // Fetch queues when hospital changes
  const loadQueues = useCallback(async (hospitalId: string) => {
    if (!hospitalId) { setQueues([]); return }
    setLoadingQueues(true)
    try {
      const data = await apiGet<{ queues: QueueItem[] }>(`/hospitals/${hospitalId}/queues`)
      setQueues(data.queues.filter(q => q.doctors && q.status === 'open'))
    } catch { setQueues([]) }
    finally { setLoadingQueues(false) }
  }, [])

  useEffect(() => {
    setSelectedQueue('')
    loadQueues(selectedHospital)
  }, [selectedHospital, loadQueues])

  const selectedQ = queues.find(q => q.id === selectedQueue)
  const selectedH = hospitals.find(h => h.id === selectedHospital)

  const issueToken = async () => {
    if (!selectedQueue) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiPost<any>('/tokens', {
        queue_id: selectedQueue,
        patient_name: patientName.trim() || undefined,
        patient_phone: patientPhone.trim() || undefined,
        type: 'walkin',
      })
      setReceipt({
        tokenNumber: res.token.number,
        doctorName: selectedQ?.doctors.name ?? '',
        hospitalName: selectedH?.name ?? '',
        specialty: selectedQ?.doctors.specialty ?? '',
        estimatedWait: res.estimated_wait_minutes,
        position: res.position,
        tokenId: res.token.id,
      })
      setPatientName('')
      setPatientPhone('')
    } catch (e: any) {
      try { setError(JSON.parse(e.message)?.error ?? e.message) }
      catch { setError(e.message) }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-6 py-10 max-w-5xl mx-auto">
        {receipt && (
          <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />
        )}

      {/* Page header */}
      <div className="mb-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-semibold">Token Desk</p>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-2">Issue Walk-in Token</h1>
          <p className="text-slate-500 text-sm mt-2 max-w-xl">
            Every token issued here feeds the live queue. Patients tracking the app see it instantly.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-[0.2em]">Status</p>
          <p className="text-lg font-semibold text-slate-900 mt-1">Live sync active</p>
        </div>
      </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-700 text-white">
            <p className="text-xs uppercase tracking-[0.25em] text-white/70">QueueLess Boarding Pass</p>
            <h2 className="text-xl font-semibold mt-2">Create a walk-in token</h2>
            <p className="text-sm text-white/80 mt-1">Use this when patients arrive without the app.</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Hospital selector */}
            {hospitalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {hospitalError}
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hospital</label>
                {userRole === 'admin' ? (
                  <select
                    value={selectedHospital}
                    onChange={e => setSelectedHospital(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select hospital…</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 text-slate-600">
                    {hospitals[0]?.name ?? 'Assigned hospital'}
                  </div>
                )}
              </div>

              {/* Doctor / Queue selector */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Doctor</label>
                <select
                  value={selectedQueue}
                  onChange={e => setSelectedQueue(e.target.value)}
                  disabled={!selectedHospital || loadingQueues}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">
                    {!selectedHospital ? 'Select a hospital first…'
                      : loadingQueues ? 'Loading doctors…'
                      : queues.length === 0 ? 'No open queues right now'
                      : 'Select doctor…'}
                  </option>
                  {queues.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.doctors.name} — {q.queue_length} waiting (~{q.estimated_wait_minutes} min)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.25em] mb-4">Patient Details (optional)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    placeholder="e.g. Hassan Ali"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone (for SMS alert)</label>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={e => setPatientPhone(e.target.value)}
                    placeholder="+923001234567"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Issue button */}
            <button
              onClick={issueToken}
              disabled={!selectedQueue || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-lg transition-colors shadow-sm"
            >
              {loading ? 'Issuing…' : 'Issue Walk-in Token'}
            </button>

            {selectedQ && (
              <p className="text-center text-xs text-slate-400">
                Next token will be added to {selectedQ.doctors.name}'s queue · {selectedQ.queue_length} currently waiting
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
