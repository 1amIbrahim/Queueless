import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPatch } from '../lib/api'

interface Hospital { id: string; name: string }
interface Token {
  id: string; number: number; type: string; status: string
  patient_name: string | null; patient_phone: string | null; issued_at: string
  queues: { doctors: { name: string; specialty: string } }
}

const STATUS_STYLE: Record<string, string> = {
  waiting:   'bg-amber-100 text-amber-700',
  called:    'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
  no_show:   'bg-red-100 text-red-600',
}

const LAHORE = { lat: 31.52, lng: 74.36 }

export default function QueueManagement() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospital, setSelectedHospital] = useState('')
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    apiGet<{ hospitals: Hospital[] }>(
      `/hospitals/nearby?lat=${LAHORE.lat}&lng=${LAHORE.lng}&radius_km=50`
    ).then(d => {
      setHospitals(d.hospitals)
      if (d.hospitals.length > 0) setSelectedHospital(d.hospitals[0].id)
    }).catch(() => {})
  }, [])

  const loadTokens = useCallback(async (hospitalId: string) => {
    if (!hospitalId) return
    setLoading(true)
    try {
      const data = await apiGet<{ queues: any[] }>(`/hospitals/${hospitalId}/queues`)
      // Fetch tokens for each queue
      const all: Token[] = []
      for (const q of data.queues) {
        const qData = await apiGet<{ tokens: Token[] }>(`/queues/${q.id}`)
        all.push(...(qData.tokens ?? []))
      }
      setTokens(all.sort((a, b) => a.number - b.number))
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadTokens(selectedHospital) }, [selectedHospital, loadTokens])

  const cancelToken = async (id: string) => {
    setActing(id)
    try {
      await apiPatch(`/tokens/${id}/cancel`)
      setTokens(prev => prev.map(t => t.id === id ? { ...t, status: 'cancelled' } : t))
    } catch {}
    finally { setActing(null) }
  }

  const filtered = filter === 'all' ? tokens : tokens.filter(t => t.status === filter)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Queue Management</h1>
          <p className="text-slate-500 text-sm mt-1">View and manage all tokens issued today</p>
        </div>
        <select
          value={selectedHospital}
          onChange={e => setSelectedHospital(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {['all', 'waiting', 'called', 'completed', 'cancelled', 'no_show'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s === 'all' ? `All (${tokens.length})` : `${s.replace('_', ' ')} (${tokens.filter(t => t.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="font-medium">No tokens match this filter</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Token', 'Doctor', 'Patient', 'Phone', 'Type', 'Status', 'Time', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-blue-600 text-sm">#{t.number}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{t.queues?.doctors?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{t.patient_name ?? <span className="text-slate-400">Anonymous</span>}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{t.patient_phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${t.type === 'walkin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {t.type === 'walkin' ? 'Walk-in' : 'App'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[t.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(t.issued_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    {t.status === 'waiting' && (
                      <button
                        onClick={() => cancelToken(t.id)}
                        disabled={acting === t.id}
                        className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                      >
                        {acting === t.id ? '…' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
