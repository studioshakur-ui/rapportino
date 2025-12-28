// /src/components/charts/CoreEmptyState.jsx
// CORE / CNCS — Standard Empty / Loading states for charts

import React from "react";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function CoreLoading({ label = "Caricamento…", isDark = true }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[220px] items-center justify-center rounded-xl border",
        isDark
          ? "border-slate-800 bg-slate-950/40 text-slate-300"
          : "border-slate-200 bg-white text-slate-700"
      )}
    >
      <div className="text-[12px]">{label}</div>
    </div>
  );
}

export function CoreEmpty({ label = "Nessun dato", hint, isDark = true }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[220px] items-center justify-center rounded-xl border px-3",
        isDark
          ? "border-slate-800 bg-slate-950/40 text-slate-400"
          : "border-slate-200 bg-white text-slate-600"
      )}
    >
      <div className="text-center">
        <div className="text-[12px] font-medium">{label}</div>
        {hint ? <div className="mt-1 text-[11px] opacity-80">{hint}</div> : null}
      </div>
    </div>
  );
}
