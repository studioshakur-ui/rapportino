// src/components/shell/CNCSSidebar.jsx
import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import ConnectionIndicator from "../ConnectionIndicator";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function NavIcon({ name, className = "" }) {
  const base = "h-4 w-4";
  switch (name) {
    case "dashboard":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" />
          <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" />
          <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" />
          <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" />
        </svg>
      );
    case "presentation":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <path d="M4 5h16v10H4z" stroke="currentColor" />
          <path d="M8 19h8" stroke="currentColor" />
        </svg>
      );
    case "ufficio":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <path d="M4 21V7l8-4 8 4v14" stroke="currentColor" />
          <path d="M9 21v-6h6v6" stroke="currentColor" />
        </svg>
      );
    case "inca":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <path d="M4 18V6" stroke="currentColor" />
          <path d="M20 18V6" stroke="currentColor" />
          <path d="M7 12h10" stroke="currentColor" />
          <path d="M7 9h6" stroke="currentColor" />
          <path d="M7 15h8" stroke="currentColor" />
        </svg>
      );
    case "rapportino":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <path d="M7 3h7l3 3v15H7z" stroke="currentColor" />
          <path d="M9 11h6" stroke="currentColor" />
          <path d="M9 15h6" stroke="currentColor" />
        </svg>
      );
    case "archive":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="6" rx="2" stroke="currentColor" />
          <rect x="3" y="10" width="18" height="10" rx="2" stroke="currentColor" />
        </svg>
      );
    case "history":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <path d="M12 8v5l3 2" stroke="currentColor" />
          <path d="M3 12a9 9 0 1 0 3-6.7" stroke="currentColor" />
          <path d="M3 4v4h4" stroke="currentColor" />
        </svg>
      );
    case "users":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <path d="M16 11a4 4 0 1 0-8 0" stroke="currentColor" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" />
        </svg>
      );
    case "chart":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <path d="M4 19V5" stroke="currentColor" />
          <path d="M4 19h16" stroke="currentColor" />
          <path d="M7 15l3-4 4 3 4-6" stroke="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

export default function CNCSSidebar({
  isDark,
  title = "CNCS",
  subtitle = "",
  roleLabel = "",
  roleCaption = "Ruolo",
  expandLabel = "Espandi menu",
  collapseLabel = "Riduci menu",

  collapsed,
  setCollapsed,
  sidebarPeek,
  setSidebarPeek,
  storageKey = "core-sidebar-collapsed",
  navItems = [],

  // NEW: slot bas (ex: "Operatori di oggi")
  bottomSlot = null,
  bottomSlotCollapsed = null, // rendu compact si sidebar collapsed
}) {
  const location = useLocation();
  const effectiveCollapsed = collapsed && !sidebarPeek;

  const shellClasses = useMemo(() => {
    return cn(
      "no-print sticky top-0 h-screen border-r flex flex-col",
      isDark ? "border-slate-800 bg-[#050910]" : "border-slate-200 bg-white",
      effectiveCollapsed ? "w-[84px] px-2 py-4" : "w-64 px-3 py-4",
      "transition-[width] duration-200"
    );
  }, [isDark, effectiveCollapsed]);

  const headerBox = cn(
    "rounded-2xl border p-3",
    isDark ? "border-slate-800 bg-slate-950/20" : "border-slate-200 bg-white"
  );

  const navItemClasses = (active) => {
    const base =
      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm border transition-colors";
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
      className={shellClasses}
      onMouseEnter={() => setSidebarPeek?.(true)}
      onMouseLeave={() => setSidebarPeek?.(false)}
      onFocusCapture={() => setSidebarPeek?.(true)}
      onBlurCapture={() => setSidebarPeek?.(false)}
    >
      {/* Header + toggle */}
      <div className={cn("mb-3", effectiveCollapsed ? "px-0" : "px-1")}>
        <div className={headerBox}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  "h-9 w-9 rounded-xl border",
                  isDark
                    ? "border-slate-800 bg-slate-950/30"
                    : "border-slate-200 bg-slate-50"
                )}
              />
              {!effectiveCollapsed && (
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    {title}
                  </div>
                  <div className="text-sm font-semibold truncate">
                    {subtitle || "CORE"}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !collapsed;
                setCollapsed?.(next);
                try {
                  window.localStorage.setItem(storageKey, next ? "1" : "0");
                } catch {}
              }}
              className={cn(
                "rounded-xl border px-2 py-2 transition-colors",
                isDark
                  ? "border-slate-800 bg-slate-950/20 hover:bg-slate-900/35 text-slate-300"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              )}
              title={collapsed ? expandLabel : collapseLabel}
              aria-label={collapsed ? expandLabel : collapseLabel}
            >
              {effectiveCollapsed ? "›" : "‹"}
            </button>
          </div>

          {/* Role + connection */}
          <div className="mt-3 flex items-center justify-between gap-2">
            {!effectiveCollapsed ? (
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  {roleCaption}
                </div>
                <div className="text-sm font-semibold truncate">
                  {roleLabel || "—"}
                </div>
              </div>
            ) : null}
            <ConnectionIndicator compact />
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className={cn("space-y-2", effectiveCollapsed ? "px-0" : "px-1")}>
        {navItems.map((it) => {
          const active = it.end
            ? location.pathname === it.to || location.pathname === `${it.to}/`
            : location.pathname === it.to ||
              location.pathname.startsWith(it.to + "/");

          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={Boolean(it.end)}
              title={it.label}
              className={navItemClasses(active)}
            >
              {effectiveCollapsed ? (
                <span className={cn("mx-auto", it.colorClass || "text-slate-300")}>
                  <NavIcon name={it.icon} />
                </span>
              ) : (
                <>
                  <span className={cn(it.colorClass || "text-slate-300")}>
                    <NavIcon name={it.icon} />
                  </span>
                  <span>{it.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom slot (Operators today) */}
      {bottomSlot || bottomSlotCollapsed ? (
        <div
          className={cn(
            "mt-4 border-t pt-4",
            isDark ? "border-slate-800" : "border-slate-200",
            effectiveCollapsed ? "px-0" : "px-1"
          )}
        >
          {effectiveCollapsed ? bottomSlotCollapsed : bottomSlot}
        </div>
      ) : null}

      <div
        className={cn(
          "mt-auto pt-4 border-t text-[10px]",
          isDark ? "border-slate-800 text-slate-600" : "border-slate-200 text-slate-500"
        )}
      >
        <div>CORE</div>
      </div>
    </aside>
  );
}
