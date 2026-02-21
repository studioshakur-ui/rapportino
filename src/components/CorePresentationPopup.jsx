// src/components/CorePresentationPopup.jsx
import React from "react";

export default function CorePresentationPopup({ onOpen, onClose }) {
  // Fallbacks “anti-softlock” : même si le composant est monté sans props,
  // on ne bloque jamais l'app (clics et fermeture restent possibles).
  const safeOpen = typeof onOpen === "function" ? onOpen : () => {};
  const safeClose = typeof onClose === "function" ? onClose : () => {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* OVERLAY — clique dehors = ferme */}
      <button
        type="button"
        aria-label="Chiudi"
        title="Chiudi"
        onClick={safeClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      {/* CONTENEUR PRINCIPAL */}
      <div className="relative w-full max-w-2xl mx-4 rounded-3xl border border-slate-700 bg-[#0a0f14] shadow-2xl shadow-black/60 overflow-hidden">
        {/* BANDEAU HAUT */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-[0.28em] text-sky-400">
              CORE · Direzione
            </span>
            <span className="text-sm font-semibold text-slate-100">
              Radiografia del flusso operativo
            </span>
          </div>

          <button
            type="button"
            onClick={safeClose}
            className="text-[11px] px-3 py-1 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-900/60 transition"
          >
            Chiudi
          </button>
        </div>

        {/* ZONA CENTRALE */}
        <div className="px-8 py-10 text-center space-y-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-100 leading-tight">
            Qui non c’è una demo.
            <br />
            C’è un punto di vista sul sistema.
          </h1>

          <p className="text-[13px] text-slate-400 max-w-xl mx-auto leading-relaxed">
            Accesso riservato alla Direzione.
            <br />
            Lettura silenziosa. Nessuna azione richiesta.
          </p>
        </div>

        {/* ZONA BOTTOM AZIONI */}
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={safeOpen}
            className="px-6 py-2.5 rounded-full border border-sky-600 bg-sky-600/15 text-[13px] font-medium text-sky-200 hover:bg-sky-600/25 transition"
          >
            Apri la visualizzazione CORE
          </button>

          <button
            type="button"
            onClick={safeClose}
            className="px-5 py-2.5 rounded-full border border-slate-700 text-[12px] text-slate-400 hover:bg-slate-900/60 transition"
          >
            Magari dopo
          </button>
        </div>
      </div>
    </div>
  );
}
  
