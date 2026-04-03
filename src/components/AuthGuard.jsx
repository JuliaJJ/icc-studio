import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthGuard({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="auth-loading">
        <span>Loading…</span>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}
