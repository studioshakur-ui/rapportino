// src/DirectionShell.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';

function DirectionHome() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Bandeau titre */}
      <section>
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-1">
          Area Direzione · Panoramica cantiere
        </div>
        <h1 className="text-2xl font-semibold text-slate-50 mb-2">
          Cruscotto di produzione e avanzamento cavi
        </h1>
        <p className="text-[14px] text-slate-400 max-w-2xl leading-relaxed">
          Questa vista raccoglierà i dati consolidati dall&apos;Archivio: ore
          validate, metri di cavo posati, squadre attive e scostamenti rispetto
          ai piani. Progettata per decisioni rapide e verificabili.
        </p>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Ore validate (giorno)',
            value: '—',
            hint: 'Totale ore approvate dai rapportini di oggi.',
          },
          {
            label: 'Metri cavo posati (stimati)',
            value: '—',
            hint: 'Derivato da attività e stati cavi in Archivio.',
          },
          {
            label: 'Squadre attive',
            value: '—',
            hint: 'Numero di squadre con rapportino inviato.',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 flex flex-col justify-between shadow-[0_0_24px_rgba(15,23,42,0.8)]"
          >
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-1.5">
              {kpi.label}
            </div>
            <div className="text-2xl font-semibold text-slate-50 mb-1">
              {kpi.value}
            </div>
            <div className="text-[11px] text-slate-500">{kpi.hint}</div>
          </div>
        ))}
      </section>

      {/* Blocs charts placeholders */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Curva produzione (ore / metri)
            </div>
            <span className="text-[11px] text-slate-500">
              S vs S-1 · placeholder grafico
            </span>
          </div>
          <div className="h-40 md:h-48 rounded-lg bg-gradient-to-br from-sky-500/10 via-emerald-500/5 to-slate-900 border border-slate-800/80 flex items-center justify-center text-[12px] text-slate-500">
            Qui verrà integrato il grafico di avanzamento (React + charts).
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-2">
            Indicatori di rischio
          </div>
          <ul className="space-y-1.5 text-[13px] text-slate-300">
            <li>• Rapportini mancanti per data / nave.</li>
            <li>• Cavi critici con stato incompleto.</li>
            <li>• Zone con ore oltre soglia pianificata.</li>
            <li>• Alert HSE derivati da note in Archivio.</li>
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">
            I dati saranno generati a partire dalle regole definite con la
            Direzione e l&apos;Ufficio.
          </p>
        </div>
      </section>
    </div>
  );
}

export default function DirectionShell() {
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  const displayName =
    profile?.full_name || profile?.display_name || profile?.email || 'Direzione';

  const ruolo = profile?.app_role || 'DIREZIONE';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Header Direzione */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-900 bg-slate-950/95">
        <div className="flex flex-col gap-0.5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            CORE · Area Direzione
          </div>
          <div className="text-sm text-slate-300">
            Cruscotto strategico basato sui dati dell&apos;Archivio
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-emerald-500/60 bg-emerald-500/10 text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
            <span>Dati consolidati</span>
          </span>
          <div className="text-right text-slate-400">
            <div>
              Utente:{' '}
              <span className="text-slate-100 font-medium">{displayName}</span>
            </div>
            <div>
              Ruolo:{' '}
              <span className="text-emerald-300 font-semibold tracking-wide">
                {ruolo}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-md border border-slate-600 text-[11px] text-slate-100 hover:bg-slate-900"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Contenu routes Direzione */}
      <main className="flex-1 px-4 md:px-6 py-5 overflow-y-auto">
        <Routes>
          <Route path="/" element={<DirectionHome />} />
          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
