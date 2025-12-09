import React from "react";

export default function CorePresentationPopup({ onOpen, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f1620] border border-slate-800 rounded-2xl px-10 py-8 w-full max-w-lg space-y-6 relative">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-200"
        >
          ✕
        </button>

        <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
          CORE · Direzione
        </div>

        <h2 className="text-2xl font-bold text-slate-100">
          Pagina dedicata alla Direzione
        </h2>

        <p className="text-sm text-slate-400">
          Una pagina mostra il confronto tra l’architettura attuale e uno
          scenario con CORE. Nessun marketing. Nessuna richiesta.
        </p>

        <div className="flex justify-end gap-4 pt-4">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            Magari dopo
          </button>
          <button
            onClick={onOpen}
            className="bg-emerald-600 hover:bg-emerald-500 text-black text-sm px-4 py-2 rounded-lg font-semibold"
          >
            Apri presentazione
          </button>
        </div>
      </div>
    </div>
  );
}
