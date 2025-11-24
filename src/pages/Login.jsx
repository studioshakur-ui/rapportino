import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { ensureProfile } from '../services/api'

export default function Login() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) nav('/')

  const signIn = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password: pass,
    })
    setLoading(false)
    if (error) return alert(error.message)

    await ensureProfile(data.user)
    nav('/')
  }

  const signUp = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email, password: pass,
    })
    setLoading(false)
    if (error) return alert(error.message)

    await ensureProfile(data.user)
    alert('Utente creato. Ora puoi entrare.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-[380px] space-y-4">
        <h1 className="text-xl font-bold">Rapportino — Login</h1>

        <input
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="password"
          type="password"
          value={pass}
          onChange={e => setPass(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={signIn}
            disabled={loading}
            className="flex-1 bg-emerald-600 text-white rounded px-3 py-2 text-sm hover:bg-emerald-700"
          >
            Entra
          </button>
          <button
            onClick={signUp}
            disabled={loading}
            className="flex-1 border rounded px-3 py-2 text-sm hover:bg-slate-50"
          >
            Crea utente
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          Ruolo predefinito: CAPO. (lo cambi da Supabase nella tabella profiles)
        </p>
      </div>
    </div>
  )
}
