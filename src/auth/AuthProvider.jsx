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
      console.warn('fetchProfile error', error)
      return null
    }

    return data
  }

  useEffect(() => {
    let mounted = true

    async function init() {
      setLoading(true)
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        console.error('getSession error', error)
        setSession(null)
        setProfile(null)
        setLoading(false)
        return
      }

      const currentSession = data?.session || null
      setSession(currentSession)

      if (currentSession?.user) {
        const p = await fetchProfile(currentSession.user.id)
        if (!mounted) return
        setProfile(p)
      } else {
        setProfile(null)
      }

      setLoading(false)
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!newSession?.user) {
          setSession(null)
          setProfile(null)
          setLoading(false)
          return
        }

        setSession(newSession)
        setLoading(true)

        const p = await fetchProfile(newSession.user.id)
        setProfile(p)
        setLoading(false)
      }
    )

    return () => {
      mounted = false
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
