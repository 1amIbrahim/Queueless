import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { apiGet } from '../../lib/api'

interface Stats {
  totalPatients: number
  activeQueues: number
  avgWaitMinutes: number
  busiestHospital: string
  tokensByStatus: Record<string, number>
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Tokens today
        const { data: tokens } = await supabase
          .from('tokens')
          .select('status, queues!inner(date)')
          .eq('queues.date', today)

        const byStatus: Record<string, number> = {}
        for (const t of tokens ?? []) {
          byStatus[t.status] = (byStatus[t.status] ?? 0) + 1
        }
        const total = Object.values(byStatus).reduce((s, v) => s + v, 0)

        // Active queues
        const { count: activeQueues } = await supabase
          .from('queues')
          .select('id', { count: 'exact', head: true })
          .eq('date', today)
          .eq('status', 'open')

        // Hospitals for busiest
        const hospitalsData = await apiGet<{ hospitals: any[] }>(
          '/hospitals/nearby?lat=31.52&lng=74.36&radius_km=50'
        )
        const busiest = hospitalsData.hospitals.sort(
          (a: any, b: any) => b.min_wait_minutes - a.min_wait_minutes
        )[0]

        // Avg wait (completed tokens with called_at and completed_at)
        const { data: completed } = await supabase
          .from('tokens')
          .select('called_at, completed_at, queues!inner(date, avg_minutes_per_patient)')
          .eq('queues.date', today)
          .eq('status', 'completed')
          .not('called_at', 'is', null)

        const avgWait = completed && completed.length > 0
          ? Math.round(completed.reduce((s: number, t: any) => s + (t.queues?.avg_minutes_per_patient ?? 10), 0) / completed.length)
          : 0

        setStats({
          totalPatients: total,
          activeQueues: activeQueues ?? 0,
          avgWaitMinutes: avgWait,
          busiestHospital: busiest?.name ?? '—',
          tokensByStatus: byStatus,
        })
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [today])

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const statusColors: Record<string, string> = {
    waiting: 'bg-amber-100 text-amber-700',
    called: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-slate-100 text-slate-500',
    no_show: 'bg-red-100 text-red-600',
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Hospital Overview</h1>
        <p className="text-slate-500 text-sm mt-1">
          Live stats for {new Date().toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Patients Today" value={String(stats?.totalPatients ?? 0)} icon="👥" color="text-blue-600" />
        <MetricCard label="Open Queues" value={String(stats?.activeQueues ?? 0)} icon="🟢" color="text-green-600" />
        <MetricCard label="Avg Wait" value={`${stats?.avgWaitMinutes ?? 0} min`} icon="⏱️" color="text-amber-600" />
        <MetricCard label="Busiest Hospital" value={stats?.busiestHospital ?? '—'} icon="🏥" color="text-slate-700" small />
      </div>

      {/* Token breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Tokens by Status — Today</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats?.tokensByStatus ?? {}).map(([status, count]) => (
            <div key={status} className={`px-4 py-2 rounded-full text-sm font-semibold ${statusColors[status] ?? 'bg-slate-100 text-slate-600'}`}>
              {status.replace('_', ' ')}: {count}
            </div>
          ))}
          {Object.keys(stats?.tokensByStatus ?? {}).length === 0 && (
            <p className="text-slate-400 text-sm">No tokens issued today yet.</p>
          )}
        </div>
      </div>

      {/* Queue status tip */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
        <p className="text-sm font-semibold text-blue-800 mb-1">💡 Daily Reminder</p>
        <p className="text-sm text-blue-600">
          Queues are date-specific. If no queues appear in the app today, run <code className="bg-blue-100 px-1 rounded">select public.create_daily_queues()</code> in Supabase SQL Editor, or go to <strong>Doctor Management</strong> and use the "Open Today's Queue" button.
        </p>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon, color, small }: {
  label: string; value: string; icon: string; color: string; small?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-bold ${small ? 'text-base' : 'text-3xl'} ${color} truncate`}>{value}</p>
    </div>
  )
}
