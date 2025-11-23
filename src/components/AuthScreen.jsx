import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AuthScreen() {
  const [mode, setMode] = useState('login') // login | signup
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const signIn = async e => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) alert(error.message)
  }

  const signUp = async e => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })
    setLoading(false)
    if (error) return alert(error.message)
    alert('Account creato. Ora fai login.')
    setMode('login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">RAPPORTINO</h1>
          <p className="text-sm text-slate-500">
            Accesso digitale Capo / Ufficio
          </p>
        </div>

        <div className="flex gap-2 text-xs">
          <button
            className={`flex-1 rounded-lg px-3 py-2 border ${
              mode === 'login'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            className={`flex-1 rounded-lg px-3 py-2 border ${
              mode === 'signup'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
            onClick={() => setMode('signup')}
          >
            Signup
          </button>
        </div>

        {mode === 'signup' && (
          <div className="space-y-1">
            <label className="text-xs text-slate-600 font-medium">
              Nome e Cognome
            </label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Es. Maiga Hamidou"
            />
          </div>
        )}

        <form onSubmit={mode === 'login' ? signIn : signUp} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-600 font-medium">Email</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nome@azienda.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 font-medium">Password</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? '...' : mode === 'login' ? 'Entra' : 'Crea account'}
          </button>
        </form>
      </div>
    </div>
  )
}
