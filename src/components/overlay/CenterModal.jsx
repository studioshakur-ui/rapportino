// src/components/overlay/CenterModal.jsx
import React, { useEffect } from "react";
import { cn } from "../../ui/cn";

export default function CenterModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  isDark = true,
  widthClass = "max-w-5xl",
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[1000] flex items-center justify-center p-4",
        "bg-black/55 backdrop-blur-md"
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Modal"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={cn(
          "w-full",
          widthClass,
          "rounded-3xl border shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_40px_120px_rgba(0,0,0,0.75)]",
          isDark ? "border-slate-800/70 bg-slate-950/80" : "border-slate-200 bg-white"
        )}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-white/5 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className={cn("text-lg sm:text-xl font-semibold", isDark ? "text-slate-50" : "text-slate-900")}>
              {title}
            </div>
            {subtitle ? (
              <div className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-600")}>{subtitle}</div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition",
              isDark
                ? "border-slate-700/70 bg-slate-950/30 text-slate-200 hover:bg-slate-900/40"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            Chiudi
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
