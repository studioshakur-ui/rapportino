// src/pages/Login.jsx

import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login({ globalError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        console.error('Errore login:', error);
        setLocalError(
          'Accesso non riuscito. Controlla email e password oppure riprova tra qualche minuto.'
        );
      } else {
        // L’AuthProvider rileverà la sessione e reindirizzerà l’utente.
      }
    } catch (err) {
      console.error('Errore inatteso durante il login:', err);
      setLocalError('Si è verificato un errore inatteso. Riprovare più tardi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveError = localError || globalError || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header visuel */}
          <div className="bg-slate-900 text-slate-100 px-6 py-4 flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/40 text-emerald-300 text-xs font-semibold uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                CORE
              </div>
              <h1 className="mt-2 text-lg font-semibold">
                Rapportino Giornaliero
              </h1>
              <p className="text-xs text-slate-300">
                Accesso per Capi squadra, Ufficio e Direzione
              </p>
            </div>
          </div>

          {/* Contenu form */}
          <div className="px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Email di lavoro
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/60 focus:outline-none"
                  placeholder="es. maiga@core.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 pr-20 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/60 focus:outline-none"
                    placeholder="Inserisci la tua password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? 'Nascondi' : 'Mostra'}
                  </button>
                </div>
              </div>

              {/* Message d’erreur */}
              {effectiveError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {effectiveError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Accesso in corso…' : 'Accedi a CORE'}
              </button>
            </form>

            <div className="mt-4 text-[11px] text-slate-500 text-center">
              In caso di problemi con l&apos;accesso, contatta il referente CORE
              o l&apos;Ufficio per il reset delle credenziali.
            </div>
          </div>
        </div>

        {/* Petit texte en bas */}
        <div className="mt-3 text-[11px] text-slate-400 text-center">
          CORE · Strumento interno per la produzione e il controllo rapportini
        </div>
      </div>
    </div>
  );
}
