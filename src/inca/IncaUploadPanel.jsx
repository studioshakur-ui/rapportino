// src/inca/IncaUploadPanel.jsx
import React, { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import IncaImportModal from "./IncaImportModal";

export default function IncaUploadPanel({ onImported }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  const defaultCostr = profile?.default_costr || "";
  const defaultCommessa = profile?.default_commessa || "";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Import INCA
          </div>
          <div className="text-xs text-slate-300 max-w-xl">
            Importazione intelligente INCA.
            <br />
            Formati supportati: <b>XLSX</b> e <b>PDF</b>. Analisi tecnica obbligatoria prima del commit.
          </div>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-full border border-sky-500/60 bg-sky-500/15 text-sky-100 text-sm hover:bg-sky-500/25"
        >
          ＋ Importa file INCA
        </button>
      </div>

      <IncaImportModal
        open={open}
        onClose={() => setOpen(false)}
        defaultCostr={defaultCostr}
        defaultCommessa={defaultCommessa}
        onImported={(data) => {
          setOpen(false);
          onImported?.(data);
        }}
      />
    </div>
  );
}
