import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const receptionistNav = [
  { to: '/issue',   label: 'Issue Token',   icon: '🎫' },
  { to: '/monitor', label: 'Queue Monitor',  icon: '📊' },
  { to: '/manage',  label: 'Manage Queues',  icon: '⚙️'  },
]

const adminNav = [
  { to: '/admin/overview',       label: 'Overview',       icon: '🏥' },
  { to: '/admin/doctors',        label: 'Doctors',         icon: '👨‍⚕️' },
  { to: '/admin/staff-accounts', label: 'Staff Accounts',  icon: '👥' },
  { to: '/admin/analytics',      label: 'Analytics',       icon: '📈' },
]

export default function Layout() {
  const { signOut, session, userRole } = useAuthStore()
  const email = session?.user?.email ?? ''
  const initials = email.substring(0, 2).toUpperCase()

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col no-print shrink-0">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-slate-100">
          <p className="text-xl font-extrabold text-blue-600 tracking-tight">QueueLess</p>
          <p className="text-xs text-slate-400 mt-0.5">Staff Dashboard</p>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {/* Receptionist section */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 pt-2 pb-2">
            Receptionist
          </p>
          {receptionistNav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}

          {userRole === 'admin' && (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 pt-5 pb-2">
                Admin
              </p>
              {adminNav.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <span className="text-base">{icon}</span>
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <p className="text-xs text-slate-500 truncate">{email}</p>
          </div>
          <button
            onClick={signOut}
            className="w-full text-sm text-slate-500 hover:text-red-600 text-left px-3 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <span>↗</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
