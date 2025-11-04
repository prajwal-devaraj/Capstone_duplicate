// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { getUser } from '@/lib/auth'

// Auth
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'

// Onboarding
import Balance from '@/pages/onboarding/Balance'
import PayCadence from '@/pages/onboarding/PayCadence'
import BillsOB from '@/pages/onboarding/Bills'

// App pages
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Bills from '@/pages/Bills'
import Insights from '@/pages/Insights'
import Goals from '@/pages/Goals'
import Accumulates from '@/pages/accumulates'


// Profile center (no Categories per your request)
import ProfilePage from '@/pages/profile/Profile'
import NotificationsPage from '@/pages/profile/Notifications'
import GoalPrefsPage from '@/pages/profile/GoalPrefs'
import { JSX } from 'react'

// ---- Helpers ----
function ProtectedRoute({ element }: { element: JSX.Element }) {
  const user = getUser()
  return user ? element : <Navigate to="/login" replace />
}

export default function App() {
  const user = getUser()

  return (
    <Routes>
      {/* Root: send authed users to dashboard, others to login */}
      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
      />

      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Onboarding (kept open for now; you can guard later if you like) */}
      <Route path="/onboarding/balance" element={<Balance />} />
      <Route path="/onboarding/pay-cadence" element={<PayCadence />} />
      <Route path="/onboarding/bills" element={<BillsOB />} />

      {/* Authenticated app */}
      <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
      <Route path="/transactions" element={<ProtectedRoute element={<Transactions />} />} />
      <Route path="/bills" element={<ProtectedRoute element={<Bills />} />} />
      <Route path="/insights" element={<ProtectedRoute element={<Insights />} />} />
      <Route path="/goals" element={<ProtectedRoute element={<Goals />} />} />
      <Route path="/accumulates" element={<ProtectedRoute element={<Accumulates />} />} />


      {/* Profile menu routes */}
      <Route path="/profile" element={<ProtectedRoute element={<ProfilePage />} />} />
      <Route path="/profile/notifications" element={<ProtectedRoute element={<NotificationsPage />} />} />
      <Route path="/profile/goals" element={<ProtectedRoute element={<GoalPrefsPage />} />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
