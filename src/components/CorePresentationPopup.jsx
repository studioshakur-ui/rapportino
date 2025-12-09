// src/components/CorePresentationPopup.jsx
import React from "react";

export default function CorePresentationPopup({ onOpen, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f1620] border border-slate-800 rounded-2xl px-8 py-7 w-full max-w-lg space-y-5 relative shadow-2xl shadow-black/60">
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 text-sm"
        >
          ✕
        </button>

        {/* Eyebrow */}
        <div className="text-[11px] uppercase tracking-[0.28em] text-sky-400">
          CORE · Direzione
        </div>

        {/* Titre */}
        <h2 className="text-2xl font-semibold text-slate-100">
          Pagina dedicata alla Direzione
        </h2>

        {/* Phrase unique */}
        <p className="text-sm text-slate-400">
          È disponibile una pagina che mostra, senza marketing, il confronto
          tra l’architettura operativa attuale e uno scenario con CORE.
        </p>

        {/* Boutons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:bg-slate-900"
          >
            Magari dopo
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="text-xs px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
          >
            Apri presentazione
          </button>
        </div>
      </div>
    </div>
  );
}
