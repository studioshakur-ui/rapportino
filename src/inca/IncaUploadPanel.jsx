// src/inca/IncaUploadPanel.jsx
import React, { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import IncaImportModal from "./IncaImportModal";

/**
 * Launcher d'import INCA (XLSX).
 * IMPORTANT : pas de parsing local / pas de write DB ici.
 * Tout passe par Edge Function via IncaImportModal.
 */
export default function IncaUploadPanel({ onImported }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  const defaultCostr = profile?.default_costr || "";
  const defaultCommessa = profile?.default_commessa || "";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Importa file INCA (XLSX)
          </div>
          <div className="text-xs text-slate-300 max-w-xl">
            Wizard robusto: Analisi (dry-run) → Import definitivo (commit).
            Stato cavo (P/B/T/E/R) e metri letti dal foglio.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center px-3 py-1.5 rounded-full border border-emerald-500/70 bg-emerald-500/15 text-[12px] font-medium text-emerald-100 hover:bg-emerald-500/25"
        >
          ＋ Apri wizard Import INCA
        </button>
      </div>

      <IncaImportModal
        open={open}
        onClose={() => setOpen(false)}
        defaultCostr={defaultCostr}
        defaultCommessa={defaultCommessa}
        onImported={(dataset) => {
          setOpen(false);
          if (typeof onImported === "function") onImported(dataset);
        }}
      />
    </div>
  );
}
