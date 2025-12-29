// src/components/ui/Modal.jsx
import React, { useEffect } from "react";

function cn(...p) {
  return p.filter(Boolean).join(" ");
}

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = "max-w-4xl",
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);

    // lock scroll (simple)
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // close on backdrop click
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {/* Backdrop (Tesla glass) */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[10px]" />

      <div
        className={cn(
          "relative w-full rounded-3xl border border-slate-700/60 bg-slate-950/55",
          "shadow-[0_10px_60px_rgba(0,0,0,0.65)]",
          "ring-1 ring-white/5",
          maxWidthClass
        )}
      >
        {/* Top glow to “allumer les lampes” */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-3xl bg-gradient-to-b from-white/10 to-transparent" />

        <div className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">CNCS / CORE</div>
            <div className="mt-1 text-xl font-semibold text-slate-100">{title}</div>
            {subtitle ? <div className="mt-1 text-[12px] text-slate-300/90">{subtitle}</div> : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              "shrink-0 rounded-full border border-slate-600/70 bg-slate-950/30 px-3 py-1.5 text-[11px]",
              "uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40",
              "focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
            )}
          >
            Chiudi
          </button>
        </div>

        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
