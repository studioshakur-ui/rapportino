// src/pages/Login.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';

export default function Login() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log(
      '%cCORE AUTH — SHAKUR Engineering',
      'color:#22c55e;font-weight:bold;font-size:14px;'
    );
    console.log('[Login] Supabase client:', supabase);
  }, []);

  // Si déjà connecté → redirect
  useEffect(() => {
    if (!session || !profile) return;

    console.log('[Login] Session già attiva, redirect con app_role:', profile.app_role);

    if (profile.app_role === 'UFFICIO') navigate('/ufficio', { replace: true });
    else if (profile.app_role === 'DIREZIONE') navigate('/direction', { replace: true });
    else navigate('/app', { replace: true });
  }, [session, profile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    console.log('[Login] Submit start per', email);
    console.log('[Login] Verifica supabase.auth:', supabase && supabase.auth);

    if (!supabase || !supabase.auth || !supabase.auth.signInWithPassword) {
      console.error('[Login] supabase.auth.signInWithPassword è undefined!');
      setError('Configurazione autenticazione non valida (supabase).');
      setSubmitting(false);
      return;
    }

    try {
      // Petit timeout de sécurité pour éviter spinner infini
      const loginPromise = supabase.auth.signInWithPassword({ email, password });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout-auth')), 10000) // 10s
      );

      const { data, error: signInError } = await Promise.race([
        loginPromise,
        timeoutPromise,
      ]);

      console.log('[Login] Risultato signInWithPassword:', { data, signInError });

      if (signInError) {
        console.error('[Login] Errore login Supabase:', signInError);
        if (signInError.message?.includes('Failed to fetch')) {
          setError('Impossibile contattare il server di autenticazione (rete).');
        } else {
          setError('Credenziali non valide o account non autorizzato.');
        }
        return;
      }

      const user = data?.user;
      if (!user) {
        console.error('[Login] Nessun user restituito da Supabase');
        setError('Errore imprevisto durante il login.');
        return;
      }

      console.log('[Login] Login OK, user.id =', user.id);

      // Profil (optionnel)
      const { data: prof, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('[Login] Risultato query profilo:', { prof, profileError });

      const ruolo = prof?.app_role;

      if (ruolo === 'UFFICIO') {
        console.log('[Login] Redirect → /ufficio');
        navigate('/ufficio', { replace: true });
      } else if (ruolo === 'DIREZIONE') {
        console.log('[Login] Redirect → /direction');
        navigate('/direction', { replace: true });
      } else {
        console.log('[Login] Redirect → /app (CAPO o profilo mancante)');
        navigate('/app', { replace: true });
      }
    } catch (err) {
      console.error('[Login] Errore in handleSubmit:', err);
      if (err.message === 'timeout-auth') {
        setError(
          'La richiesta di accesso sta impiegando troppo tempo. Verifica la connessione o riprova.'
        );
      } else {
        setError('Errore di rete o configurazione. Contatta l’Ufficio.');
      }
    } finally {
      console.log('[Login] finally → setSubmitting(false)');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* En-tête */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full 
            border border-slate-700 bg-slate-900/90 text-[12px] uppercase tracking-[0.18em] text-slate-300 mb-2">
            SISTEMA CENTRALE DI CANTIERE
          </div>

          <div className="text-[12px] text-slate-500 font-mono mb-2">
            Auth Module · SHAKUR Engineering
          </div>

          <h1 className="text-3xl font-semibold text-slate-50 mb-2">
            Entra in CORE
          </h1>

          <p className="text-[14px] text-slate-400 leading-relaxed">
            Usa credenziali interne. Ogni accesso viene registrato.
          </p>
        </div>

        {/* Carte login */}
        <div className="rounded-2xl bg-slate-950 border border-slate-800 
          shadow-[0_0_40px_rgba(15,23,42,0.9)] p-6">

          {error && (
            <div className="text-[14px] text-amber-200 bg-amber-900/40 
              border border-amber-700 rounded-md px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] text-slate-200 mb-1">
                Email aziendale
              </label>
              <input
                type="email"
                required
                className="w-full rounded-md bg-slate-900 border border-slate-700 
                  px-3 py-2 text-[14px] text-slate-50 focus:ring-1 focus:ring-sky-500"
                placeholder="nome.cognome@core.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[13px] text-slate-200 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full rounded-md bg-slate-900 border border-slate-700 
                  px-3 py-2 text-[14px] text-slate-50 focus:ring-1 focus:ring-sky-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="text-[12px] text-slate-400">
              Ruoli supportati: CAPO · UFFICIO · DIREZIONE
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-2 rounded-md text-[14px] font-medium mt-1
                ${
                  submitting
                    ? 'bg-slate-700 text-slate-300 cursor-wait'
                    : 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                }`}
            >
              {submitting ? 'Accesso…' : 'Accedi'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-[12px] text-slate-500 space-y-1">
          <Link to="/" className="text-slate-300 hover:underline">
            Torna alla pagina di presentazione
          </Link>
          <div className="font-mono text-slate-600">
            CORE · SHAKUR Engineering · Trieste · La Spezia · Dakar
          </div>
        </div>
      </div>
    </div>
  );
}
