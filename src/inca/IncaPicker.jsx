import React from "react";

export default function IncaPicker({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-3xl rounded-xl bg-core-card border-core p-6">
        <header className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-inca">
            INCA · Selezione cavo
          </h2>
          <button onClick={onClose} className="text-muted hover:text-core">
            ✕
          </button>
        </header>

        <input
          autoFocus
          placeholder="Cerca marca cavo…"
          className="w-full mb-4 rounded-lg bg-core-section border-core px-3 py-2 text-core focus:outline-none focus:ring-2 focus:ring-[var(--inca-400)]"
        />

        <div className="space-y-2">
          {/* Riga esempio */}
          <div className="flex items-center justify-between rounded-lg bg-core-section px-4 py-3 hover:bg-core-card cursor-pointer">
            <div>
              <div className="text-core font-medium">CB-2345-A</div>
              <div className="text-muted text-sm">Sezione 6mm · Stato P</div>
            </div>
            <span className="text-muted text-sm">120 m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
