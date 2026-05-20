import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'

interface StaffUser {
  id: string
  name: string
  phone: string
  role: string
  hospital_id: string | null
  created_at: string
  hospitals: { name: string } | null
}

const ROLE_STYLE: Record<string, string> = {
  receptionist: 'bg-purple-100 text-purple-700',
  doctor:       'bg-teal-100 text-teal-700',
  admin:        'bg-red-100 text-red-700',
  patient:      'bg-slate-100 text-slate-500',
}

export default function AdminStaffAccounts() {
  const [users, setUsers] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('users')
      .select('*, hospitals(name)')
      .neq('role', 'patient')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setUsers((data as any) ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = users.filter(u => {
    const matchRole = filter === 'all' || u.role === filter
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.hospitals?.name?.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Accounts</h1>
          <p className="text-slate-500 text-sm mt-1">
            All registered receptionists, doctors, and admins
          </p>
        </div>
        <Link
          to="/staff-register"
          target="_blank"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
        >
          + Add Staff Member
        </Link>
      </div>

      {/* How roles work */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <RoleInfo
          icon="🗂️" role="Receptionist" color="bg-purple-50 border-purple-100"
          description="Issues walk-in tokens and monitors queues via the web dashboard. Needs a hospital assigned."
        />
        <RoleInfo
          icon="🩺" role="Doctor" color="bg-teal-50 border-teal-100"
          description="Manages their patient queue via the mobile app. Must be linked to a doctor profile."
        />
        <RoleInfo
          icon="👑" role="Admin" color="bg-red-50 border-red-100"
          description="Full access to web dashboard including analytics, doctor management, and staff oversight."
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or hospital…"
          className="flex-1 border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          {['all', 'receptionist', 'doctor', 'admin'].map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === r ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {r} {r !== 'all' && `(${users.filter(u => u.role === r).length})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-3xl mb-3">👥</p>
          <p className="font-medium text-slate-700">No staff accounts yet</p>
          <p className="text-sm text-slate-400 mt-1">Use the "Add Staff Member" button to register receptionists and doctors.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Role', 'Hospital', 'Phone', 'Registered'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {(u.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900 text-sm">{u.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${ROLE_STYLE[u.role] ?? 'bg-slate-100 text-slate-500'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.hospitals?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(u.created_at).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RoleInfo({ icon, role, color, description }: { icon: string; role: string; color: string; description: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="font-semibold text-slate-800 text-sm">{role}</span>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
    </div>
  )
}
