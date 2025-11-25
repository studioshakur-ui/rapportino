import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RequireRole({ allow = [], children }) {
  const { user, profile, loading } = useAuth()

  // 🔹 1. Si pas d'utilisateur => login direct (peu importe loading)
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 🔹 2. Pendant que le profil charge encore
  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Caricamento...
      </div>
    )
  }

  // 🔹 3. Rôle effectif
  const effectiveRole = profile.role || profile.app_role || null

  if (!effectiveRole) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Caricamento...
      </div>
    )
  }

  // 🔹 4. Contrôle d'accès
  if (allow.length > 0 && !allow.includes(effectiveRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-rose-700">
        Accesso negato per il tuo ruolo. ({String(effectiveRole)})
      </div>
    )
  }

  return children
}
