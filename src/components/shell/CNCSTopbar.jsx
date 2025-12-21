// src/components/shell/CNCSTopbar.jsx
import React from "react";

function j(...p) {
  return p.filter(Boolean).join(" ");
}

/**
 * Topbar CNCS (style Direction) pour Ufficio / Capo / Direction.
 *
 * Props:
 * - isDark
 * - eyebrow: string (ex: "UFFICIO · CNCS / CORE")
 * - title: string (ex: "Rapportini", "INCA", "CORE Drive", "Dashboard Direzione")
 * - onLogout: () => void
 */
export default function CNCSTopbar({ isDark, eyebrow, title, onLogout }) {
  return (
    <header
      className={j(
        "no-print sticky top-0 z-30 rounded-2xl border backdrop-blur px-3 py-2",
        isDark ? "border-slate-800 bg-[#050910]/70" : "border-slate-200 bg-white/70"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500 truncate">{eyebrow}</div>
          <div className={j("text-sm font-semibold truncate", isDark ? "text-slate-100" : "text-slate-900")}>{title}</div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-900/25 transition"
          title="Logout"
          aria-label="Logout"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          Logout
        </button>
      </div>
    </header>
  );
}
