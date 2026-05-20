import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { apiPost } from '../../lib/api'

interface Doctor {
  id: string
  name: string
  specialty: string
  is_active: boolean
  hospital_id: string
  hospitals: { name: string }
  departments: { name: string } | null
}

const SPECIALTIES = ['general','cardiology','dermatology','orthopedics','pediatrics','gynecology','neurology','ophthalmology','ent','psychiatry','urology','oncology']

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [openingQueue, setOpeningQueue] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterSpec, setFilterSpec] = useState('all')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('doctors')
      .select('*, hospitals(name), departments(name)')
      .order('name')
    setDoctors((data as any) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleActive = async (doctor: Doctor) => {
    await supabase
      .from('doctors')
      .update({ is_active: !doctor.is_active })
      .eq('id', doctor.id)
    setDoctors(prev => prev.map(d => d.id === doctor.id ? { ...d, is_active: !d.is_active } : d))
  }

  const openQueue = async (doctorId: string) => {
    setOpeningQueue(doctorId)
    try {
      await apiPost('/queues', { doctor_id: doctorId })
      alert('Queue opened for today!')
    } catch (e: any) {
      try {
        const msg = JSON.parse(e.message)
        alert(msg.error ?? e.message)
      } catch { alert(e.message) }
    }
    setOpeningQueue(null)
  }

  const filtered = doctors.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.hospitals?.name?.toLowerCase().includes(search.toLowerCase())
    const matchSpec = filterSpec === 'all' || d.specialty === filterSpec
    return matchSearch && matchSpec
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctor Management</h1>
          <p className="text-slate-500 text-sm mt-1">{doctors.length} doctors registered across all hospitals</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or hospital…"
          className="flex-1 border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterSpec}
          onChange={e => setFilterSpec(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Specialties</option>
          {SPECIALTIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Doctor', 'Hospital', 'Department', 'Specialty', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {doc.name.replace('Dr. ', '').charAt(0)}
                      </div>
                      <span className="font-medium text-slate-900 text-sm">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{doc.hospitals?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{doc.departments?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-slate-600 capitalize bg-slate-100 px-2 py-1 rounded-full">
                      {doc.specialty}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(doc)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                        doc.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {doc.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openQueue(doc.id)}
                      disabled={openingQueue === doc.id || !doc.is_active}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-40"
                    >
                      {openingQueue === doc.id ? 'Opening…' : 'Open Today\'s Queue'}
                    </button>
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
