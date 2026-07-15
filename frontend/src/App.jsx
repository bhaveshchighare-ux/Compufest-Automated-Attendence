import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { clearUser, getToken, isLoggedIn, saveUser } from './lib/auth'
import { authAPI } from './lib/api'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import MemberManagement from './pages/MemberManagement'
import Sessions from './pages/Sessions'
import AttendanceSession from './pages/AttendanceSession'
import AttendanceHistory from './pages/AttendanceHistory'

function CheckingSession() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-blue-900/20 border-t-blue-900 animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState(isLoggedIn() ? 'checking' : 'guest')

  useEffect(() => {
    let active = true

    const verifySession = async () => {
      if (!isLoggedIn()) {
        setStatus('guest')
        return
      }

      try {
        const data = await authAPI.getMe()
        if (!active) return
        saveUser(getToken(), data.user)
        setStatus('authenticated')
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          clearUser()
          if (active) setStatus('guest')
        } else {
          // If network error/aborted due to rapid navigation, don't force logout
          if (active) setStatus('authenticated')
        }
      }
    }

    verifySession()

    return () => {
      active = false
    }
  }, [])

  if (status === 'checking') return <CheckingSession />
  return status === 'authenticated' ? children : <Navigate to="/login" replace />
}

function GuestRoute({ children }) {
  useEffect(() => {
    if (isLoggedIn()) {
      window.location.replace('/dashboard')
    }
  }, [])

  return !isLoggedIn() ? children : null
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest only routes */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><MemberManagement /></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
        <Route path="/session/:id" element={<ProtectedRoute><AttendanceSession /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><AttendanceHistory /></ProtectedRoute>} />

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
