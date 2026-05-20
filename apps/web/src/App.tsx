import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import TokenGenerator from './pages/TokenGenerator'
import QueueMonitor from './pages/QueueMonitor'
import QueueManagement from './pages/QueueManagement'
import AdminOverview from './pages/admin/Overview'
import AdminDoctors from './pages/admin/Doctors'
import AdminAnalytics from './pages/admin/Analytics'
import Layout from './components/Layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, initialized } = useAuthStore()
  if (!initialized) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { init } = useAuthStore()
  useEffect(() => { init() }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
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
          <Route path="admin"           element={<Navigate to="/admin/overview" replace />} />
          <Route path="admin/overview"  element={<AdminOverview />} />
          <Route path="admin/doctors"   element={<AdminDoctors />} />
          <Route path="admin/analytics" element={<AdminAnalytics />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
