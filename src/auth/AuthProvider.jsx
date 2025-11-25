import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.warn('Profile fetch error:', error)
      return null
    }

    return data
  }

  async function hydrateSession() {
    setLoading(true)

    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error('getSession error:', error)
      await supabase.auth.signOut()
      setSession(null)
      setProfile(null)
      setLoading(false)
      return
    }

    const currentSession = data?.session || null

    // Pas de session → pas de user, pas de profil
    if (!currentSession?.user) {
      setSession(null)
      setProfile(null)
      setLoading(false)
      return
    }

    // On a un user, on va chercher le profil
    const p = await fetchProfile(currentSession.user.id)

    // Si pas de profil → on force un logout (session fantôme)
    if (!p) {
      console.warn('No profile for user, forcing signOut')
      await supabase.auth.signOut()
      setSession(null)
      setProfile(null)
      setLoading(false)
      return
    }

    setSession(currentSession)
    setProfile(p)
    setLoading(false)
  }

  useEffect(() => {
    hydrateSession()

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!newSession?.user) {
          // Logout → on nettoie tout
          setSession(null)
          setProfile(null)
          setLoading(false)
          return
        }

        // Login / token refresh
        setSession(newSession)
        setLoading(true)

        const p = await fetchProfile(newSession.user.id)

        if (!p) {
          console.warn('No profile on auth change, forcing signOut')
          await supabase.auth.signOut()
          setSession(null)
          setProfile(null)
          setLoading(false)
          return
        }

        setProfile(p)
        setLoading(false)
      }
    )

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = {
    session,
    user: session?.user || null,
    profile,
    loading,
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  return useContext(AuthCtx)
}
