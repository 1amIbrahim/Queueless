import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { apiPost } from '../lib/api'

type Role = 'receptionist' | 'doctor'
type Step = 'role' | 'hospital' | 'doctor-profile' | 'details' | 'success'

interface Hospital { id: string; name: string; address: string }
interface DoctorProfile { id: string; name: string; specialty: string }

export default function StaffRegister() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('role')
  const [role, setRole] = useState<Role | null>(null)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [doctorProfiles, setDoctorProfiles] = useState<DoctorProfile[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('hospitals').select('id, name, address').then(({ data }) => {
      setHospitals(data ?? [])
    })
  }, [])

  const loadDoctors = async (hospitalId: string) => {
    const { data } = await supabase
      .from('doctors')
      .select('id, name, specialty')
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)
      .is('user_id', null) // only unlinked doctor profiles
    setDoctorProfiles(data ?? [])
  }

  const selectHospital = (h: Hospital) => {
    setSelectedHospital(h)
    if (role === 'doctor') {
      loadDoctors(h.id)
      setStep('doctor-profile')
    } else {
      setStep('details')
    }
  }

  const submit = async () => {
    if (!form.name || !form.email || !form.password || !selectedHospital) return
    setLoading(true)
    setError('')
    try {
      await apiPost('/auth/register', {
        role,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        hospital_id: selectedHospital.id,
        doctor_id: role === 'doctor' ? selectedDoctor?.id : undefined,
        specialty: role === 'doctor' ? selectedDoctor?.specialty : undefined,
      })

      setStep('success')
    } catch (e: any) {
      const raw = e?.message ?? 'Registration failed'
      const isNetwork = raw.includes('Failed to fetch') || raw.includes('NetworkError')
      setError(isNetwork
        ? 'Could not reach the API server. Make sure the backend is running on http://localhost:4000.'
        : raw
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-600 tracking-tight">QueueLess</h1>
          <p className="text-slate-500 mt-1 text-sm">Staff Account Registration</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Progress bar */}
          {step !== 'success' && (
            <div className="h-1 bg-slate-100">
              <div
                className="h-1 bg-blue-600 transition-all duration-500"
                style={{ width: { role: '25%', hospital: '50%', 'doctor-profile': '67%', details: '85%', success: '100%' }[step] }}
              />
            </div>
          )}

          <div className="p-8">
            {/* Step: Role selection */}
            {step === 'role' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">What is your role?</h2>
                <p className="text-slate-500 text-sm mb-6">Select the role that matches your job at the hospital</p>
                <div className="space-y-3">
                  <RoleCard
                    icon="🗂️"
                    title="Receptionist"
                    description="Issue walk-in tokens, monitor queues, manage daily operations from the web dashboard"
                    selected={role === 'receptionist'}
                    onClick={() => { setRole('receptionist'); setStep('hospital') }}
                  />
                  <RoleCard
                    icon="🩺"
                    title="Doctor"
                    description="Manage your patient queue from the mobile app — call next patient with one tap"
                    selected={role === 'doctor'}
                    onClick={() => { setRole('doctor'); setStep('hospital') }}
                  />
                </div>
              </div>
            )}

            {/* Step: Hospital */}
            {step === 'hospital' && (
              <div>
                <button onClick={() => setStep('role')} className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1">
                  ← Back
                </button>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Which hospital?</h2>
                <p className="text-slate-500 text-sm mb-6">Select the hospital you work at</p>
                <div className="space-y-2">
                  {hospitals.map(h => (
                    <button
                      key={h.id}
                      onClick={() => selectHospital(h)}
                      className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                      <p className="font-semibold text-slate-900 group-hover:text-blue-700">{h.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{h.address}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Doctor profile (only for doctors) */}
            {step === 'doctor-profile' && (
              <div>
                <button onClick={() => setStep('hospital')} className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1">
                  ← Back
                </button>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Select your profile</h2>
                <p className="text-slate-500 text-sm mb-6">
                  Find your name in the list below. This links your account to your doctor profile.
                </p>
                {doctorProfiles.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-3xl mb-2">🔍</p>
                    <p className="font-medium text-slate-600">No unlinked profiles found</p>
                    <p className="text-sm mt-1">All doctor profiles at this hospital are already linked to accounts, or none exist yet. Contact your admin.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {doctorProfiles.map(d => (
                      <button
                        key={d.id}
                        onClick={() => { setSelectedDoctor(d); setStep('details') }}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selectedDoctor?.id === d.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <p className="font-semibold text-slate-900">{d.name}</p>
                        <p className="text-xs text-slate-500 capitalize mt-0.5">{d.specialty}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step: Account details */}
            {step === 'details' && (
              <div>
                <button onClick={() => setStep(role === 'doctor' ? 'doctor-profile' : 'hospital')} className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1">
                  ← Back
                </button>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Create your account</h2>
                <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 flex items-center gap-2">
                  <span>{role === 'doctor' ? '🩺' : '🗂️'}</span>
                  <span>
                    <strong>{role === 'doctor' ? selectedDoctor?.name : 'Receptionist'}</strong>
                    {' · '}{selectedHospital?.name}
                  </span>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <Field label="Full Name" type="text" placeholder="Dr. Imran Khalid"
                    value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
                  <Field label="Phone (for notifications)" type="tel" placeholder="+923001234567"
                    value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
                  <Field label="Email" type="email" placeholder="imran@hospital.com"
                    value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
                  <Field label="Password" type="password" placeholder="Min. 6 characters"
                    value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} />
                </div>

                <button
                  onClick={submit}
                  disabled={loading || !form.name || !form.email || !form.password}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  {loading ? 'Creating account…' : 'Create Staff Account'}
                </button>
              </div>
            )}

            {/* Step: Success */}
            {step === 'success' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✓</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Account Created!</h2>
                <p className="text-slate-500 text-sm mb-6">
                  {role === 'doctor'
                    ? 'Your doctor account is ready. Log in on the QueueLess mobile app to start managing your queue.'
                    : 'Your receptionist account is ready. Log in at the web dashboard to start issuing tokens.'}
                </p>
                <div className="bg-slate-50 rounded-xl p-4 text-left mb-6">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Next Steps</p>
                  {role === 'doctor' ? (
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>📱 Open the QueueLess mobile app</li>
                      <li>🔑 Log in with your email and password</li>
                      <li>🩺 You'll land directly on your queue screen</li>
                    </ul>
                  ) : (
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>🌐 Go to the web dashboard</li>
                      <li>🔑 Log in with your email and password</li>
                      <li>🎫 Start issuing tokens from the "Issue Token" tab</li>
                    </ul>
                  )}
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Go to Login
                </button>
              </div>
            )}
          </div>
        </div>

        {step !== 'success' && (
          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  )
}

function RoleCard({ icon, title, description, selected, onClick }: {
  icon: string; title: string; description: string; selected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  )
}

function Field({ label, type, placeholder, value, onChange }: {
  label: string; type: string; placeholder: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )
}
