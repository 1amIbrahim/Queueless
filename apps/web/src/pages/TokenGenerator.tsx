import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../lib/api'
import ReceiptModal from '../components/ReceiptModal'

interface Hospital { id: string; name: string; address: string }
interface QueueItem {
  id: string; status: string; queue_length: number; estimated_wait_minutes: number
  doctors: { id: string; name: string; specialty: string }
}

const LAHORE = { lat: 31.52, lng: 74.36 }

export default function TokenGenerator() {
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
      .then(d => setHospitals(d.hospitals))
      .catch(e => {
        console.error('Failed to load hospitals:', e)
        setHospitalError(`Could not load hospitals: ${e.message}. Is the API running on ${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}?`)
      })
  }, [])

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
    <div className="p-8 max-w-2xl">
      {receipt && (
        <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />
      )}

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Issue Walk-in Token</h1>
        <p className="text-slate-500 text-sm mt-1">
          Every token issued here feeds the live queue — patients tracking the app see it instantly.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        {/* Hospital selector */}
        {hospitalError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {hospitalError}
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hospital</label>
          <select
            value={selectedHospital}
            onChange={e => setSelectedHospital(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select hospital…</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>

        {/* Doctor / Queue selector */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Doctor</label>
          <select
            value={selectedQueue}
            onChange={e => setSelectedQueue(e.target.value)}
            disabled={!selectedHospital || loadingQueues}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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

        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Patient Details (optional)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
              <input
                type="text"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                placeholder="e.g. Hassan Ali"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone (for SMS alert)</label>
              <input
                type="tel"
                value={patientPhone}
                onChange={e => setPatientPhone(e.target.value)}
                placeholder="+923001234567"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-sm"
        >
          {loading ? 'Issuing…' : '🎫  Issue Walk-in Token'}
        </button>

        {selectedQ && (
          <p className="text-center text-xs text-slate-400">
            Next token will be added to {selectedQ.doctors.name}'s queue · {selectedQ.queue_length} currently waiting
          </p>
        )}
      </div>
    </div>
  )
}
