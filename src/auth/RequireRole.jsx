import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RequireRole({ allow = [], children }) {
  const { user, profile, loading } = useAuth()

  // Toujours en chargement global
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Caricamento...
      </div>
    )
  }

  // Pas connecté → login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // User sans profil → on considère encore en chargement
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Caricamento...
      </div>
    )
  }

  // Normalisation rôle
  const effectiveRole = profile.role || profile.app_role || null

  if (!effectiveRole) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Caricamento...
      </div>
    )
  }

  // Contrôle d'accès
  if (allow.length > 0 && !allow.includes(effectiveRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-rose-700">
        Accesso negato per il tuo ruolo. ({String(effectiveRole)})
      </div>
    )
  }

  return children
}
