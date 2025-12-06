// src/components/CapoModuleSelect.jsx
import React from 'react';

export default function CapoModuleSelect({
  costruttore,
  onSelectModule,
  onChangeCostr,
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 shadow-[0_0_40px_rgba(15,23,42,0.9)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
              Nave selezionata
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700 bg-slate-900/80 text-[12px] text-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
              <span>COSTR. {costruttore}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onChangeCostr}
            className="text-[11px] px-3 py-1.5 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            Cambia COSTR
          </button>
        </div>

        <div className="mb-5">
          <h1 className="text-xl font-semibold text-slate-50 mb-1">
            Scegli il modulo per oggi
          </h1>
          <p className="text-[13px] text-slate-300">
            Puoi lavorare sul <strong>Rapportino giornaliero</strong> oppure
            sulla <strong>Lista Cavi (INCA)</strong> per la nave selezionata.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <button
            type="button"
            onClick={() => onSelectModule('RAPPORTINO')}
            className="text-left rounded-xl p-4 border border-emerald-500/60 bg-slate-900/80 hover:bg-slate-900 hover:border-emerald-400 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.25)]"
          >
            <div className="text-[13px] font-semibold text-emerald-200 mb-1">
              RAPPORTINO GIORNALIERO
            </div>
            <p className="text-[13px] text-slate-200 leading-snug">
              Attività, operatori, ore e note su carta digitale identica al
              modello di bordo.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('INCA')}
            className="text-left rounded-xl p-4 border border-sky-500/50 bg-slate-900/80 hover:bg-slate-900 hover:border-sky-400 transition-colors"
          >
            <div className="text-[13px] font-semibold text-sky-200 mb-1">
              LISTA CAVI · INCA
            </div>
            <p className="text-[13px] text-slate-200 leading-snug">
              Import, filtri e avanzamento cavi per il COSTR selezionato.
              (Vista CAPO in sviluppo controllato)
            </p>
          </button>
        </div>

        <p className="text-[11px] text-slate-500 text-center">
          Puoi tornare a questa schermata in ogni momento cambiando COSTR o
          modulo.
        </p>
      </div>
    </div>
  );
}
