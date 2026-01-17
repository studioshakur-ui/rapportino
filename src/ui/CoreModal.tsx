import React, { useEffect } from "react";

type CoreModalProps = {
  open: boolean;
  title?: React.ReactNode;
  onClose?: () => void;
  children?: React.ReactNode;
};

export default function CoreModal({ open, title, onClose, children }: CoreModalProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div className="absolute inset-0 bg-black/70" onClick={() => onClose?.()} />
      <div className="relative w-[min(920px,92vw)] max-h-[86vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Direzione · CNCS / CORE</div>
            <div className="text-[14px] font-semibold text-slate-50 truncate">{title || "Dettaglio"}</div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-[12px] text-slate-200 hover:bg-slate-900"
          >
            Chiudi
          </button>
        </div>

        <div className="max-h-[calc(86vh-56px)] overflow-auto px-4 py-3">{children}</div>
      </div>
    </div>
  );
}
