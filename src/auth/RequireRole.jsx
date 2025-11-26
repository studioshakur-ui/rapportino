import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RequireRole({ allow = [], children }) {
  const { user, profile } = useAuth()

  // 1. Pas connecté → login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 2. Normalisation du rôle venant du profil
  const effectiveRole = profile?.role || profile?.app_role || null

  // 3. Si aucun rôle encore (profil en cours de fetch, ou profil incomplet) → on ne bloque pas
  if (!effectiveRole) {
    return children
  }

  // 4. Si des rôles sont exigés ET que le rôle courant n'est pas dedans → accès refusé
  if (allow.length > 0 && !allow.includes(effectiveRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-rose-700">
        Accesso negato per il tuo ruolo. ({String(effectiveRole)})
      </div>
    )
  }

  // 5. Tout bon → on affiche la page
  return children
}
