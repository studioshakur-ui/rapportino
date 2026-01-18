// src/components/rapportino/page/ToastOverlay.tsx
import React from "react";

type Toast = {
  type?: "info" | "success" | "error";
  message?: string;
  detail?: string;
} | null;

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export default function ToastOverlay({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}): JSX.Element | null {
  const t = toast;
  if (!t?.message) return null;

  const tone =
    t.type === "error"
      ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
      : t.type === "success"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
      : "border-slate-700/50 bg-slate-950/60 text-slate-100";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-3 no-print">
      <div
        className={cn(
          "pointer-events-auto",
          "max-w-[min(720px,96vw)] w-full sm:w-auto",
          "rounded-2xl border shadow-[0_18px_60px_rgba(0,0,0,0.45)]",
          "backdrop-blur",
          "px-3 py-2.5",
          tone
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-semibold leading-5 truncate">{t.message}</div>
            {t.detail ? <div className="mt-0.5 text-[11px] text-slate-300 whitespace-pre-wrap">{t.detail}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700/60 bg-slate-950/40 px-2.5 py-1 text-[11px] font-semibold text-slate-100 hover:bg-slate-900/35"
            aria-label="Chiudi"
            title="Chiudi"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
