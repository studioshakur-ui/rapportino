import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RequireRole({ allow = [], children }) {
  const { user, profile, loading } = useAuth()

  // 1. Still loading?
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Caricamento...
      </div>
    )
  }

  // 2. Not logged in
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 3. Profile not yet fetched
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Caricamento...
      </div>
    )
  }

  // 4. Normalise
  const effectiveRole = profile.role || profile.app_role || null

  if (!effectiveRole) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Caricamento...
      </div>
    )
  }

  // 5. Role refused
  if (allow.length > 0 && !allow.includes(effectiveRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-rose-700">
        Accesso negato per il tuo ruolo. ({String(effectiveRole)})
      </div>
    )
  }

  return children
}
