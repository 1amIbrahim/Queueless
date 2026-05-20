import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import StaffRegister from './pages/StaffRegister'
import TokenGenerator from './pages/TokenGenerator'
import QueueMonitor from './pages/QueueMonitor'
import QueueManagement from './pages/QueueManagement'
import AdminOverview from './pages/admin/Overview'
import AdminDoctors from './pages/admin/Doctors'
import AdminAnalytics from './pages/admin/Analytics'
import AdminStaffAccounts from './pages/admin/StaffAccounts'
import Layout from './components/Layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, initialized } = useAuthStore()
  if (!initialized) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading QueueLess…</p>
      </div>
    </div>
  )
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { userRole } = useAuthStore()
  if (!roles.includes(userRole)) return <Navigate to="/issue" replace />
  return <>{children}</>
}

export default function App() {
  const { init } = useAuthStore()
  useEffect(() => { init() }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/staff-register" element={<StaffRegister />} />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/issue" replace />} />
          {/* Receptionist */}
          <Route path="issue"   element={<TokenGenerator />} />
          <Route path="monitor" element={<QueueMonitor />} />
          <Route path="manage"  element={<QueueManagement />} />
          {/* Admin */}
          <Route path="admin" element={
            <RoleRoute roles={["admin"]}>
              <Navigate to="/admin/overview" replace />
            </RoleRoute>
          } />
          <Route path="admin/overview" element={
            <RoleRoute roles={["admin"]}>
              <AdminOverview />
            </RoleRoute>
          } />
          <Route path="admin/doctors" element={
            <RoleRoute roles={["admin"]}>
              <AdminDoctors />
            </RoleRoute>
          } />
          <Route path="admin/analytics" element={
            <RoleRoute roles={["admin"]}>
              <AdminAnalytics />
            </RoleRoute>
          } />
          <Route path="admin/staff-accounts" element={
            <RoleRoute roles={["admin"]}>
              <AdminStaffAccounts />
            </RoleRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
