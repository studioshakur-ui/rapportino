import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RequireRole({ allow = [], children }) {
  const { user, profile, loading } = useAuth()

  // 1) Encore en chargement global
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Caricamento...
      </div>
    )
  }

  // 2) Pas d'utilisateur → go login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 3) Si l'utilisateur est là mais le profil pas encore chargé,
  //    on considère que c'est toujours du "Caricamento..."
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Caricamento...
      </div>
    )
  }

  // 4) Rôle effectif : enum "role" puis fallback sur "app_role"
  const effectiveRole = profile.role || profile.app_role || null

  // Si on n'a toujours pas de rôle → encore chargement (ou profil incomplet)
  if (!effectiveRole) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Caricamento...
      </div>
    )
  }

  // 5) Check des rôles autorisés
  if (allow.length > 0 && !allow.includes(effectiveRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-rose-700">
        Accesso negato per il tuo ruolo ({String(effectiveRole)}).
      </div>
    )
  }

  // 6) Tout est ok → on affiche la page
  return children
}
