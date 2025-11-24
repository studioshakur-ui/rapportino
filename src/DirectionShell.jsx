import React from 'react'
import ConnectionIndicator from './components/ConnectionIndicator'
import { useAuth } from './auth/AuthProvider'

export default function DirectionShell() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="no-print bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Logged as <b>{profile?.full_name}</b> (DIREZIONE)
          </div>
          <div className="flex items-center gap-3">
            <ConnectionIndicator />
            <button
              onClick={signOut}
              className="text-xs px-2 py-1 border rounded hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Coming soon */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center space-y-3">
          <h1 className="text-xl font-bold tracking-tight">PERCORSO — Direzione</h1>
          <p className="text-sm text-slate-600">
            Modulo Direzione in sviluppo.
          </p>
          <div className="text-xs text-slate-500 italic">
            Coming soon
          </div>
        </div>
      </main>
    </div>
  )
}
