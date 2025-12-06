// src/direzione/DirectionDashboard.jsx
import React from 'react';

export default function DirectionDashboard() {
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Titre + sous-titre */}
      <header className="mb-2">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-50">
          Dashboard Direzione
        </h1>
        <p className="text-xs md:text-sm text-slate-400 mt-1">
          Vista sintetica di avanzamento, carico squadre e qualità dei dati.
          Dati dimostrativi per la versione attuale.
        </p>
      </header>

      {/* Bandeau KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Rapportini validati
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-slate-50">32</span>
            <span className="text-[11px] text-emerald-400">+5 vs settimana scorsa</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full w-3/4 bg-emerald-500/80" />
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Obiettivo: 40 / settimana
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Squadre attive oggi
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-slate-50">7</span>
            <span className="text-[11px] text-slate-400">capisquadra</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Elettricista, Carpenteria, Montaggio
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Coerenza dati INCA
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-slate-50">96%</span>
            <span className="text-[11px] text-emerald-400">verde</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full w-[96%] bg-sky-500/80" />
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Dati INCA importati correttamente (demo).
          </div>
        </div>

        {/* KPI 4 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Rapportini rimandati
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-slate-50">3</span>
            <span className="text-[11px] text-amber-400">da verificare</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full w-1/4 bg-amber-400/80" />
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Motivi tipici: ore, commessa, note mancanti.
          </div>
        </div>
      </section>

      {/* Bloc 2 colonnes : avancamento + rischi */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Avanzamento nave */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Avanzamento nave (demo)
              </div>
              <div className="text-sm text-slate-200">
                Confronto teorico vs reale per macro-aree.
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              Dati dimostrativi · non produttivi
            </div>
          </div>

          <div className="space-y-2 mt-2 text-[12px]">
            {[
              { label: 'Impianti e locali tecnici', teorico: 80, reale: 72 },
              { label: 'Cabine passeggeri', teorico: 65, reale: 60 },
              { label: 'Aree pubbliche', teorico: 50, reale: 46 },
              { label: 'Sistemi critici nave', teorico: 40, reale: 38 },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-200">{row.label}</span>
                  <span className="text-[11px] text-slate-400">
                    Teorico {row.teorico}% · Reale {row.reale}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-slate-600/70"
                    style={{ width: `${row.teorico}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500/80"
                    style={{ width: `${row.reale}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pannello rischi / attenzione */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-2">
            Pannello rischi (demo)
          </div>
          <ul className="space-y-2 text-[12px]">
            <li className="border border-slate-700 rounded-lg px-3 py-2 bg-slate-950/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-100 font-medium">
                  Rapportini mancanti
                </span>
                <span className="text-[11px] text-amber-400">Medium</span>
              </div>
              <p className="text-slate-400">
                2 giornate non ancora ricevute da un Capo (demo).
              </p>
            </li>
            <li className="border border-slate-700 rounded-lg px-3 py-2 bg-slate-950/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-100 font-medium">
                  Dati INCA da aggiornare
                </span>
                <span className="text-[11px] text-sky-400">Basso</span>
              </div>
              <p className="text-slate-400">
                Nuova revisione INCA caricata, in attesa di verifica Ufficio.
              </p>
            </li>
            <li className="border border-slate-700 rounded-lg px-3 py-2 bg-slate-950/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-100 font-medium">
                  Coerenza rapportino / cavi
                </span>
                <span className="text-[11px] text-emerald-400">OK</span>
              </div>
              <p className="text-slate-400">
                Nessuna anomalia critica rilevata sui dati demo.
              </p>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
