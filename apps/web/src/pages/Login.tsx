import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const { signIn, session, userRole, loading, error, clearError } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!session) return
    if (userRole === 'admin') navigate('/admin/overview', { replace: true })
    else navigate('/issue', { replace: true })
  }, [session, userRole])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    await signIn(email.trim().toLowerCase(), password)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-blue-600 flex-col justify-center px-16">
        <h1 className="text-4xl font-extrabold text-white leading-tight">QueueLess</h1>
        <p className="text-blue-100 mt-3 text-lg">Receptionist Dashboard</p>
        <p className="text-blue-200 mt-6 text-sm leading-relaxed max-w-sm">
          Issue walk-in tokens, monitor live queues, and keep your hospital running smoothly — all from one screen.
        </p>
        <div className="mt-10 space-y-3">
          {['One tap to issue a token', 'Live queue counts across all doctors', 'Print receipts for walk-in patients'].map(f => (
            <div key={f} className="flex items-center gap-3 text-blue-100 text-sm">
              <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-xs">✓</span>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign in</h2>
          <p className="text-slate-500 text-sm mb-8">Use your hospital staff account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="staff@hospital.com"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 text-sm"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 mb-2">New staff member?</p>
            <Link
              to="/staff-register"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Create a staff account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
