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
    const { data } = await supabase.auth.getSession()

    const currentSession = data?.session || null
    setSession(currentSession)

    if (!currentSession?.user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const p = await fetchProfile(currentSession.user.id)
    setProfile(p)
    setLoading(false)
  }

  useEffect(() => {
    hydrateSession()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!newSession) {
        setSession(null)
        setProfile(null)
        return
      }

      setSession(newSession)
      setLoading(true)
      const p = await fetchProfile(newSession.user.id)
      setProfile(p)
      setLoading(false)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthCtx.Provider value={{
      session,
      user: session?.user || null,
      profile,
      loading,
      signOut: () => supabase.auth.signOut()
    }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  return useContext(AuthCtx)
}
