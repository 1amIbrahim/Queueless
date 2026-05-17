import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const nav = [
  { to: '/issue',   label: 'Issue Token',   icon: '🎫' },
  { to: '/monitor', label: 'Queue Monitor',  icon: '📊' },
  { to: '/manage',  label: 'Manage Queues',  icon: '⚙️'  },
]

export default function Layout() {
  const { signOut, session } = useAuthStore()
  const email = session?.user?.email ?? ''

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col no-print">
        <div className="px-6 py-5 border-b border-slate-100">
          <p className="text-xl font-extrabold text-blue-600 tracking-tight">QueueLess</p>
          <p className="text-xs text-slate-400 mt-0.5">Receptionist Dashboard</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400 truncate mb-2">{email}</p>
          <button
            onClick={signOut}
            className="w-full text-sm text-slate-500 hover:text-red-600 text-left px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
