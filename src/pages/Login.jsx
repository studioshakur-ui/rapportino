// src/pages/Login.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthProvider';

export default function Login() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Si déjà connecté → redirect selon ruolo
  useEffect(() => {
    if (!session || !profile) return;

    if (profile.app_role === 'UFFICIO') {
      navigate('/ufficio', { replace: true });
    } else if (profile.app_role === 'DIREZIONE') {
      navigate('/direction', { replace: true });
    } else {
      // CAPO (ou fallback)
      navigate('/', { replace: true });
    }
  }, [session, profile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email,
        password,
      }
    );

    if (signInError) {
      console.error('Errore login:', signInError);
      setError('Credenziali non valide o account non autorizzato.');
      setSubmitting(false);
      return;
    }

    const user = data?.user;
    if (!user) {
      setError('Errore imprevisto durante il login.');
      setSubmitting(false);
      return;
    }

    // On lit le profilo pour connaitre app_role
    const { data: prof, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setSubmitting(false);

    if (profileError || !prof) {
      console.error('Errore caricando il profilo:', profileError);
      // Fallback: on envoie sur la route CAPO
      navigate('/', { replace: true });
      return;
    }

    if (prof.app_role === 'UFFICIO') {
      navigate('/ufficio', { replace: true });
    } else if (prof.app_role === 'DIREZIONE') {
      navigate('/direction', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-stretch justify-center">
      <div className="w-full max-w-6xl mx-auto px-4 py-8 md:py-12 flex flex-col md:flex-row gap-8">

        {/* HERO / PRESENTATION CORE */}
        <section className="flex-1 flex flex-col justify-between">
          {/* Badge + titre */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700 bg-slate-900/60 text-[11px] uppercase tracking-[0.18em] text-slate-300 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              Sistema centrale di cantiere
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-50 mb-3">
              CORE
              <span className="ml-2 text-slate-400 text-xl md:text-2xl font-normal">
                – controllo totale, precisione navale.
              </span>
            </h1>

            <p className="text-sm md:text-[13px] text-slate-300 max-w-xl mb-6">
              Pensato per cantieri complessi, navi da crociera e unità militari:
              rapportini di bordo, squadre, cavi e produzione in un’unica plancia
              digitale. Veloce per il Capo, affidabile per l’Ufficio, leggibile per
              la Direzione.
            </p>

            {/* Visuel style "blueprint" navires */}
            <div className="relative mb-7">
              <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_top,_#22d3ee_0,_transparent_55%),_radial-gradient(circle_at_bottom,_#38bdf8_0,_transparent_60%)]" />
                <div className="absolute inset-0 opacity-[0.14] mix-blend-screen bg-[linear-gradient(120deg,rgba(148,163,184,0.4)_0,transparent_40%,transparent_60%,rgba(148,163,184,0.4)_100%)]" />

                <div className="relative px-4 py-4 md:px-5 md:py-5">
                  <div className="flex flex-col gap-3 text-[11px] text-slate-300">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 px-2 items-center rounded-full border border-sky-500/60 bg-sky-500/10 text-sky-100 font-medium text-[10px]">
                          Cruise Line
                        </span>
                        <span className="inline-flex h-6 px-2 items-center rounded-full border border-emerald-500/60 bg-emerald-500/10 text-emerald-100 font-medium text-[10px]">
                          Military
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">
                        v1 · early access
                      </span>
                    </div>

                    {/* Schéma style fil de lumière */}
                    <div className="mt-1 grid grid-cols-1 gap-3">
                      <div className="relative h-20 md:h-[5.5rem]">
                        <div className="absolute inset-0 opacity-60">
                          <div className="h-[55%] w-full rounded-xl border border-slate-600/70 bg-slate-900/70" />
                          <div className="absolute inset-x-4 top-2 h-[0.1rem] bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-400 blur-[2px]" />
                          <div className="absolute top-1.5 left-6 h-2 w-6 rounded-full border border-sky-300/70" />
                          <div className="absolute top-4 right-10 h-2 w-10 rounded-full border border-sky-300/40" />
                          <div className="absolute inset-x-10 bottom-2 h-[0.06rem] bg-slate-500/40" />
                        </div>
                        <div className="absolute bottom-1 left-3 text-[10px] text-slate-400">
                          Nave da crociera – impianti, cavi, cabine, servizi.
                        </div>
                      </div>

                      <div className="relative h-16 md:h-[4.5rem]">
                        <div className="absolute inset-0 opacity-80">
                          <div className="h-[60%] w-full rounded-xl border border-slate-700/80 bg-slate-950/80" />
                          <div className="absolute inset-x-3 top-2 h-[0.09rem] bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 blur-[1px]" />
                          <div className="absolute top-3 left-10 h-2 w-8 rounded-full border border-emerald-300/80" />
                          <div className="absolute top-4 right-6 h-2 w-5 rounded-full border border-emerald-300/40" />
                          <div className="absolute inset-x-8 bottom-1 h-[0.06rem] bg-slate-500/50" />
                        </div>
                        <div className="absolute bottom-1 left-3 text-[10px] text-slate-400">
                          Unità militare – tracciabilità e sicurezza dei dati.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Strip des modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              {/* Rapportino */}
              <div className="border border-slate-800 rounded-xl bg-slate-950/70 px-3 py-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    RAPPORTINO · CAPO
                  </span>
                  <span className="inline-flex h-5 items-center px-2 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/40 text-[10px]">
                    Attivo
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-snug">
                  Compilazione giornaliera in meno di 2 minuti: attività, squadre,
                  prodotto totale e PDF pulito, allineato al cartaceo di bordo.
                </p>
              </div>

              {/* Ufficio */}
              <div className="border border-slate-800 rounded-xl bg-slate-950/70 px-3 py-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    UFFICIO · CONTROLLO
                  </span>
                  <span className="inline-flex h-5 items-center px-2 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/40 text-[10px]">
                    Attivo
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-snug">
                  Tutti i rapportini in un’unica vista: verifica, approvazione,
                  note di ritorno ai Capi e storico ufficiale delle giornate.
                </p>
              </div>

              {/* Archivio */}
              <div className="border border-slate-800 rounded-xl bg-slate-950/85 px-3 py-3 flex flex-col gap-1.5 shadow-[0_0_25px_rgba(15,23,42,0.9)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                    ARCHIVIO · REGISTRO
                  </span>
                  <span className="inline-flex h-5 items-center px-2 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/50 text-[10px]">
                    Cuore dati
                  </span>
                </div>
                <p className="text-slate-200 text-[11px] leading-snug">
                  Registro ufficiale di cantiere: giornate, squadre, lista cavi,
                  stati e note Ufficio. Se non è in Archivio, non è successo.
                </p>
                <p className="text-slate-400 text-[10px] mt-0.5">
                  Squadra · Lista cavi · Storico per nave, zona, commessa.
                </p>
              </div>

              {/* Percorso */}
              <div className="border border-dashed border-slate-800 rounded-xl bg-slate-950/60 px-3 py-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    PERCORSO · CAVI
                  </span>
                  <span className="inline-flex h-5 items-center px-2 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/40 text-[10px]">
                    Coming soon
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-snug">
                  Dal disegno al metro posato: tracciamento digitale dei percorsi
                  cavo su IPC, sincronizzato con INCA e con i rapportini giornalieri.
                </p>
              </div>
            </div>
          </div>

          {/* Bas de page / disclaimer */}
          <div className="mt-6 text-[10px] text-slate-500">
            Accesso riservato a personale autorizzato (Capo, Ufficio, Direzione).
            Ogni accesso viene registrato a fini di controllo interno.
          </div>
        </section>

        {/* FORMULAIRE DE LOGIN */}
        <section className="w-full md:w-[320px] lg:w-[340px]">
          <div className="h-full rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-sm shadow-[0_0_40px_rgba(15,23,42,0.9)] flex flex-col px-4 py-5 md:px-5 md:py-6">
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-1">
                Accesso
              </div>
              <h2 className="text-lg font-semibold text-slate-50">
                Entra in CORE
              </h2>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Usa le credenziali fornite dal tuo Ufficio. Il ruolo (Capo,
                Ufficio, Direzione) viene riconosciuto automaticamente.
              </p>
            </div>

            {error && (
              <div className="mb-3 text-[11px] text-amber-200 bg-amber-900/40 border border-amber-700 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-[12px]">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[11px] font-medium text-slate-200 mb-1"
                >
                  Email di lavoro
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-[12px] text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="nome.cognome@azienda.it"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[11px] font-medium text-slate-200 mb-1"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-[12px] text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  Ruoli supportati:{' '}
                  <span className="text-slate-200">
                    CAPO · UFFICIO · DIREZIONE
                  </span>
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full mt-2 inline-flex items-center justify-center rounded-md border text-[12px] font-medium px-3 py-2 transition-colors ${
                  submitting
                    ? 'bg-slate-700 text-slate-300 border-slate-600 cursor-wait'
                    : 'bg-sky-500 text-slate-950 border-sky-400 hover:bg-sky-400'
                }`}
              >
                {submitting ? 'Accesso in corso…' : 'Accedi a CORE'}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 space-y-1.5">
              <p>
                Problemi di accesso? Contatta l&apos;Ufficio o la Direzione per
                verificare il tuo profilo in CORE.
              </p>
              <p className="text-slate-600">
                I dati di accesso vengono gestiti tramite Supabase Auth, in linea
                con le policy interne di sicurezza.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
