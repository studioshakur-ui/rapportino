// src/components/shell/CNCSTopbar.jsx
import React from "react";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function CNCSTopbar({
  isDark,
  kickerLeft,
  title,
  right,
}) {
  return (
    <header
      className={cn(
        "no-print sticky top-0 z-30",
        "rounded-2xl border backdrop-blur",
        "px-3 py-2",
        isDark ? "border-slate-800 bg-[#050910]/70" : "border-slate-200 bg-white/70"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {kickerLeft ? (
            <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500 truncate">
              {kickerLeft}
            </div>
          ) : null}
          <div className="text-sm font-semibold truncate">{title}</div>
        </div>

        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
