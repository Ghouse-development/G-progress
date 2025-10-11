import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { PermissionsProvider } from './contexts/PermissionsContext'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

// プロテクトされたルートコンポーネント
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-black mb-4"></div>
          <p className="text-xl font-bold text-gray-900">読み込み中...</p>
        </div>
      </div>
    )
  }

  // 開発モード用の後方互換性
  const devAuth = localStorage.getItem('auth') === 'true'

  if (!user && !devAuth) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <PermissionsProvider>
              <AppRoutes />
            </PermissionsProvider>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
