import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RequireRole({ allow = [], children }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Caricamento...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 🔥 Le rôle réel : role (enum) ou app_role (fallback)
  const effectiveRole = profile?.role || profile?.app_role || null

  if (allow.length > 0 && !allow.includes(effectiveRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-rose-700">
        Accesso negato per il tuo ruolo.
      </div>
    )
  }

  return children
}
