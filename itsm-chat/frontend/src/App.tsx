/**
 * Main application with routing and authentication
 */

import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useWebSocket, IssueNotification } from './hooks/useWebSocket'
import Sidebar from './components/Sidebar'
import NotificationToast from './components/NotificationToast'
import LoginPage from './pages/LoginPage'
import ChatPage from './pages/ChatPage'
import ConversationsPage from './pages/ConversationsPage'
import IssuesPage from './pages/IssuesPage'

// Animated background component
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, transparent 70%)',
          top: '-200px',
          right: '-100px',
          animation: 'float 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
          bottom: '-150px',
          left: '-100px',
          animation: 'float 25s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute w-[300px] h-[300px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
          top: '40%',
          left: '60%',
          animation: 'pulse-glow 15s ease-in-out infinite',
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 211, 238, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  )
}

// Protected layout with sidebar
function ProtectedLayout() {
  const { isAuthenticated } = useAuth()
  const [notification, setNotification] = useState<IssueNotification | null>(null)

  // Set up WebSocket for authenticated users
  const { isConnected } = useWebSocket({
    onNotification: (notif) => {
      setNotification(notif)
    },
  })

  return (
    <div className="h-screen w-full flex relative" style={{ background: 'var(--bg-primary)' }}>
      <AnimatedBackground />

      {/* Sidebar */}
      <div className="relative z-20">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 relative z-10 overflow-hidden">
        <Outlet />
      </main>

      {/* Notifications */}
      {isAuthenticated && <NotificationToast notification={notification} />}

      {/* WebSocket status indicator (dev only) */}
      {import.meta.env.DEV && isAuthenticated && (
        <div className="fixed bottom-4 left-4 z-50">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400' : 'bg-red-400'
            }`}
            title={isConnected ? 'Real-time connected' : 'Real-time disconnected'}
          />
        </div>
      )}
    </div>
  )
}

// Auth-only routes (redirect to chat if not authenticated)
function AuthRequiredLayout() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

// Main App component
function App() {
  const { checkAuth, isLoading } = useAuth()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div
        className="h-screen w-full flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <AnimatedBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login page (standalone, no sidebar) */}
        <Route
          path="/login"
          element={
            <div
              className="h-screen w-full relative"
              style={{ background: 'var(--bg-primary)' }}
            >
              <AnimatedBackground />
              <div className="relative z-10">
                <LoginPage />
              </div>
            </div>
          }
        />

        {/* Main app with sidebar */}
        <Route element={<ProtectedLayout />}>
          {/* Public routes (work with or without auth) */}
          <Route path="/" element={<ChatPage />} />

          {/* Auth-required routes */}
          <Route element={<AuthRequiredLayout />}>
            <Route path="/conversations" element={<ConversationsPage />} />
            <Route path="/issues" element={<IssuesPage />} />
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
