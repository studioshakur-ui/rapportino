import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RequireRole({ allow = [], children }) {
  const { user, profile } = useAuth()

  // 1. Pas connecté -> login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 2. Petit log pour voir ce qu'on reçoit côté front
  console.log('USER:', user)
  console.log('PROFILE:', profile)

  // 3. 🔥 TEMPORAIRE : ON NE BLOQUE PLUS SUR LE RÔLE
  //    On laisse passer tous les utilisateurs connectés
  return children
}
