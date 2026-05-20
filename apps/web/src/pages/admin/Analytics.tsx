import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { supabase } from '../../lib/supabase'

interface HourBucket { hour: string; patients: number }
interface DoctorStat { name: string; completed: number; waiting: number; avgWait: number }

export default function AdminAnalytics() {
  const [hourly, setHourly] = useState<HourBucket[]>([])
  const [doctorStats, setDoctorStats] = useState<DoctorStat[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // All tokens today with issued_at
        const { data: tokens } = await supabase
          .from('tokens')
          .select(`
            id, status, issued_at,
            queues!inner (
              date, avg_minutes_per_patient,
              doctors ( name )
            )
          `)
          .eq('queues.date', today)

        if (!tokens) return

        // Hourly buckets 8am–8pm
        const buckets: Record<string, number> = {}
        for (let h = 8; h <= 20; h++) {
          buckets[`${h}:00`] = 0
        }
        for (const t of tokens) {
          const h = new Date(t.issued_at).getHours()
          const key = `${h}:00`
          if (key in buckets) buckets[key]++
        }
        setHourly(Object.entries(buckets).map(([hour, patients]) => ({ hour, patients })))

        // Doctor stats
        const statsMap: Record<string, DoctorStat> = {}
        for (const t of tokens) {
          const name = (t.queues as any)?.doctors?.name ?? 'Unknown'
          if (!statsMap[name]) statsMap[name] = { name, completed: 0, waiting: 0, avgWait: (t.queues as any)?.avg_minutes_per_patient ?? 10 }
          if (t.status === 'completed') statsMap[name].completed++
          if (t.status === 'waiting' || t.status === 'called') statsMap[name].waiting++
        }
        setDoctorStats(Object.values(statsMap).sort((a, b) => b.completed - a.completed))
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

  const totalToday = doctorStats.reduce((s, d) => s + d.completed + d.waiting, 0)

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric' })} · {totalToday} total patients
        </p>
      </div>

      {totalToday === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="font-medium text-slate-700">No data for today yet</p>
          <p className="text-sm text-slate-400 mt-1">Analytics will appear once patients start joining queues.</p>
        </div>
      ) : (
        <>
          {/* Hourly flow */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-700 mb-5">Patient Flow — Tokens Issued by Hour</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourly} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v: number) => [`${v} patients`, 'Issued']}
                />
                <Bar dataKey="patients" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Doctor stats */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-700 mb-5">By Doctor — Completed vs Still Waiting</h2>
            <ResponsiveContainer width="100%" height={Math.max(200, doctorStats.length * 50)}>
              <BarChart data={doctorStats} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <Bar dataKey="completed" name="Completed" fill="#16a34a" radius={[0, 4, 4, 0]} stackId="a" />
                <Bar dataKey="waiting" name="Waiting/Called" fill="#f59e0b" radius={[0, 4, 4, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Doctor', 'Completed', 'Still Waiting', 'Avg Min/Patient'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctorStats.map(d => (
                  <tr key={d.name} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-sm text-slate-900">{d.name}</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-semibold">{d.completed}</td>
                    <td className="px-4 py-3 text-sm text-amber-600 font-semibold">{d.waiting}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{d.avgWait} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
