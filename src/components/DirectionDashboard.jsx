// src/components/DirectionDashboard.jsx
import React from 'react';

const HEADCOUNT_MOCK = [
  {
    id: 'MONFALCONE',
    label: 'Monfalcone',
    previsti: 140,
    presenti: 132,
    assenti: 8,
  },
  {
    id: 'MARGHERA',
    label: 'Marghera',
    previsti: 110,
    presenti: 104,
    assenti: 6,
  },
  {
    id: 'MUGGIANO_RIVA',
    label: 'Muggiano · Riva Trigoso',
    previsti: 80,
    presenti: 74,
    assenti: 6,
  },
];

function getSeverityColor(assenti, previsti) {
  const ratio = previsti > 0 ? assenti / previsti : 0;
  if (ratio < 0.05) return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40';
  if (ratio < 0.12) return 'text-amber-300 bg-amber-500/10 border-amber-500/40';
  return 'text-rose-300 bg-rose-500/10 border-rose-500/40';
}

export default function DirectionDashboard() {
  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const dateLabel = dateFormatter.format(today);
  const timeLabel = timeFormatter.format(today);

  return (
    <div className="space-y-6">
      {/* Bandeau titre */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 mb-1">
            Direzione · Panoramica giornaliera
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-slate-50">
            Presenze oggi per cantiere
          </h1>
          <p className="text-[13px] text-slate-400 mt-1">
            Uno sguardo veloce su quanti operatori sono presenti nei tre cantieri principali.
          </p>
        </div>

        <div className="text-right text-[11px] text-slate-400 font-mono">
          <div className="text-slate-300">{dateLabel}</div>
          <div className="text-slate-500">Aggiornato alle {timeLabel}</div>
          <div className="mt-1 text-[10px] text-slate-500">
            Dati forniti da ARCHIVIO (spec SHAKUR Engineering)
          </div>
        </div>
      </div>

      {/* Cartes presenze per cantiere */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {HEADCOUNT_MOCK.map((cantiere) => {
          const { id, label, previsti, presenti, assenti } = cantiere;
          const severity = getSeverityColor(assenti, previsti);

          const presenzaPerc =
            previsti > 0 ? Math.round((presenti / previsti) * 100) : 0;

          return (
            <div
              key={id}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-[0_0_24px_rgba(15,23,42,0.9)] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-100">
                  {label}
                </h2>
                <span
                  className={[
                    'inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-mono',
                    severity,
                  ].join(' ')}
                >
                  {assenti} assenti
                </span>
              </div>

              <div className="mt-2 flex items-end justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-[0.16em] mb-1">
                    Presenti / Previsti
                  </div>
                  <div className="text-xl font-semibold text-slate-50">
                    {presenti}
                    <span className="text-slate-500 text-base"> / {previsti}</span>
                  </div>
                  <div className="text-[12px] text-slate-400 mt-0.5">
                    {presenzaPerc}% copertura
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-[11px] text-slate-400 uppercase tracking-[0.16em] mb-1">
                    Assenti
                  </div>
                  <div className="text-lg font-semibold text-slate-50">
                    {assenti}
                  </div>
                  <div className="mt-2 h-1.5 w-20 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{
                        width: `${Math.min(presenzaPerc, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-500">
                <span className="font-mono text-slate-400">Spec Direzione ·</span>{' '}
                Questo riepilogo è pensato per dare a Vincenzo un colpo d&apos;occhio
                immediato sulle presenze nei tre cantieri.
              </div>
            </div>
          );
        })}
      </section>

      {/* Placeholder pour KPI futuri */}
      <section className="mt-2 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-3 text-[12px] text-slate-400">
        <div className="font-semibold text-slate-300 mb-1">
          KPI avanzamento (coming soon)
        </div>
        <p>
          In una fase successiva, questa pagina ospiterà anche grafici di avanzamento,
          produttività per cantiere e trend delle assenze. I dati verranno letti
          direttamente da ARCHIVIO e dai rapportini giornalieri.
        </p>
      </section>
    </div>
  );
}
