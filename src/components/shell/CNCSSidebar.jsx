// src/components/shell/CNCSSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import ConnectionIndicator from "../ConnectionIndicator";
import { NavIcon } from "./CNCShellIcons";

function j(...p) {
  return p.filter(Boolean).join(" ");
}

/**
 * Sidebar CNCS (style Direction) + fonctionnalité collapse+peek (comme Ufficio/App).
 *
 * Props:
 * - isDark: boolean
 * - title: string ("Direzione", "Ufficio", "Capo")
 * - roleLabel: string (ex: "DIREZIONE", "UFFICIO", "CAPO")
 * - storageKey: string (clé localStorage pour collapsed)
 * - navItems: [{ to, label, icon, end? }]
 * - collapsed: boolean
 * - setCollapsed: (fn|bool) => void
 * - sidebarPeek: boolean
 * - setSidebarPeek: (bool) => void
 */
export default function CNCSSidebar({
  isDark,
  title,
  roleLabel,
  navItems,
  collapsed,
  setCollapsed,
  sidebarPeek,
  setSidebarPeek,
}) {
  const effectiveCollapsed = collapsed && !sidebarPeek;

  const navItemClasses = (active) => {
    const base = "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm border transition-colors";
    if (active) {
      return isDark
        ? `${base} bg-sky-500/12 border-sky-500/55 text-slate-100`
        : `${base} bg-sky-50 border-sky-400 text-slate-900`;
    }
    return isDark
      ? `${base} bg-slate-950/20 border-slate-800 text-slate-300 hover:bg-slate-900/35`
      : `${base} bg-white border-slate-200 text-slate-700 hover:bg-slate-50`;
  };

  return (
    <aside
      className={j(
        "sticky top-0 h-screen border-r",
        isDark ? "border-slate-800 bg-[#050910]" : "border-slate-200 bg-white",
        effectiveCollapsed ? "w-16" : "w-64",
        "transition-all"
      )}
      onMouseEnter={() => setSidebarPeek(true)}
      onMouseLeave={() => setSidebarPeek(false)}
      onFocusCapture={() => setSidebarPeek(true)}
      onBlurCapture={() => setSidebarPeek(false)}
    >
      <div className="p-3">
        {/* header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={j("h-9 w-9 rounded-xl border", isDark ? "border-slate-800 bg-slate-950/30" : "border-slate-200 bg-slate-50")} />
            {!effectiveCollapsed && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">CNCS</div>
                <div className="text-sm font-semibold">{title}</div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className={j(
              "rounded-xl border px-2 py-2",
              isDark ? "border-slate-800 bg-slate-950/20" : "border-slate-200 bg-white"
            )}
            title="Toggle sidebar"
            aria-label="Toggle sidebar"
          >
            {effectiveCollapsed ? "›" : "‹"}
          </button>
        </div>

        {/* role */}
        <div className={j("mt-3 rounded-2xl border p-3", isDark ? "border-slate-800 bg-slate-950/20" : "border-slate-200 bg-slate-50")}>
          <div className="flex items-center justify-between gap-2">
            {!effectiveCollapsed && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Ruolo</div>
                <div className="text-sm font-semibold">{roleLabel}</div>
              </div>
            )}
            <ConnectionIndicator compact />
          </div>
        </div>

        {/* nav */}
        <nav className="mt-3 space-y-2">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={Boolean(it.end)}
              title={it.label}
              className={({ isActive }) => navItemClasses(isActive)}
            >
              {effectiveCollapsed ? (
                <NavIcon name={it.icon} className={j(it.colorClass || "text-sky-400", "mx-auto")} />
              ) : (
                <>
                  <NavIcon name={it.icon} className={it.colorClass || "text-sky-400"} />
                  <span>{it.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
