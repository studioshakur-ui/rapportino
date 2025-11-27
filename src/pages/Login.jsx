// src/pages/Login.jsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { resetBrowserSession } from '../services/sessionUtils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    // Supabase va déclencher le changement de session,
    // ton AuthProvider fera le reste (redirection CAPO, etc.)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="w-full max-w-md px-6 py-8 rounded-2xl bg-slate-900/80 shadow-2xl border border-slate-800">
        <h1 className="text-center text-2xl font-semibold mb-6">
          CORE – Connexion
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Mot de passe</label>
            <input
              type="password"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 mt-1">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        {/* ⬇️ Petit lien discret pour reset la session */}
        <button
          type="button"
          onClick={resetBrowserSession}
          className="mt-4 w-full text-[11px] text-slate-400 hover:text-slate-200 underline decoration-dotted"
        >
          Problème de session ? Réinitialiser ce navigateur
        </button>
      </div>
    </div>
  );
}
