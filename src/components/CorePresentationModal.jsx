// src/components/CorePresentationModal.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const DISMISS_KEY = "core-conit-presentation-dismissed-v2";

export default function CorePresentationModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // ➜ On montre le popup une seule fois par navigateur
  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY);
      if (!dismissed) {
        setOpen(true);
      }
    } catch {
      // Si localStorage KO, on ouvre quand même une fois
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  const handleClose = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const handleOpenPresentation = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
    // ➜ Route de ta page de présentation
    navigate("/direction/presentazione");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl px-5 py-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-sky-400 mb-1">
          CORE · Presentazione dedicata
        </div>
        <h2 className="text-sm sm:text-base font-semibold text-slate-50 mb-2">
          Presentazione operativa di CORE per CONIT
        </h2>
        <p className="text-xs text-slate-300 mb-3">
          Questa non è una presentazione commerciale, ma una spiegazione
          operativa di dove CORE si inserisce rispetto al vostro modo
          di lavorare (Navemaster, rapportini, INCA, archivio).
        </p>
        <p className="text-[11px] text-slate-400 mb-4">
          Puoi aprirla adesso: è una pagina statica dentro CORE, pensata
          solo per chiarire il flusso e i punti dove toglie lavoro dalle spalle.
        </p>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 rounded-full border border-slate-600 text-[11px] text-slate-300 hover:bg-slate-800/80 transition-colors"
          >
            Più tardi
          </button>
          <button
            type="button"
            onClick={handleOpenPresentation}
            className="px-3 py-1.5 rounded-full border border-sky-500 bg-sky-500/10 text-[11px] font-medium text-sky-100 hover:bg-sky-500/25 transition-colors"
          >
            Apri la presentazione CORE per CONIT
          </button>
        </div>
      </div>
    </div>
  );
}
