import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RequireRole({ allow = [], children }) {
  const { user, loading } = useAuth()

  // Chargement initial de l'auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
        Caricamento...
      </div>
    )
  }

  // Pas d'utilisateur connecté → login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 🔥 TEMPORAIRE : on ignore completely "allow" et les rôles
  // Tous les utilisateurs connectés peuvent voir la page
  return children
}
