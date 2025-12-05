// src/components/CostrSelect.jsx
import React from 'react';
import { useAuth } from '../auth/AuthProvider';

const COSTR_OPTIONS = [
  { value: '6368', label: '6368 · Nave Crociera' },
  { value: '6358', label: '6358 · De-Icing / Unitá tecnica' },
];

export default function CostrSelect({ onSelect }) {
  const { profile } = useAuth();

  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    profile?.email?.split('@')[0] ||
    'Capo';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-[0_0_40px_rgba(15,23,42,0.9)] p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-slate-700 bg-slate-900/80 text-[11px] uppercase tracking-[0.18em] text-slate-300 mb-2">
            Sistema Centrale di Cantiere
          </div>
          <h1 className="text-2xl font-semibold text-slate-50 mb-1">
            Seleziona il COSTR / Nave
          </h1>
          <p className="text-[13px] text-slate-300">
            Ciao{' '}
            <span className="font-semibold text-slate-100">{displayName}</span>
            , scegli la nave su cui stai lavorando oggi.
          </p>
        </div>

        <div className="space-y-3 mb-4">
          {COSTR_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onSelect(c.value)}
              className="w-full text-left px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/80 hover:border-emerald-400 hover:bg-slate-900 text-sm flex items-center justify-between transition-colors"
            >
              <div>
                <div className="font-medium text-slate-50">{c.label}</div>
                <div className="text-[12px] text-slate-400">
                  Rapporto giornaliero e Lista Cavi dedicati
                </div>
              </div>
              <span className="text-[11px] px-2 py-1 rounded-full border border-emerald-500/60 text-emerald-300 bg-emerald-500/10">
                Seleziona
              </span>
            </button>
          ))}
        </div>

        <p className="text-[11px] text-slate-500 text-center">
          Il <span className="font-semibold text-slate-300">COSTR</span>{' '}
          determina il modello di rapportino e le liste cavi collegate.
        </p>
      </div>
    </div>
  );
}
