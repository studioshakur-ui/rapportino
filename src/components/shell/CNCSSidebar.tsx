// src/components/shell/CNCSSidebar.tsx
import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import ConnectionIndicator from "../ConnectionIndicator";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type NavIconName =
  | "dashboard"
  | "presentation"
  | "ufficio"
  | "inca"
  | "rapportino"
  | "archive"
  | "ship"
  | "history"
  | "users"
  | "chart";

export type NavItem = {
  to: string;
  label: string;
  icon: NavIconName;
  colorClass?: string;
  end?: boolean;
};

function NavIcon({ name, className = "" }: { name: NavIconName; className?: string }) {
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

type CNCSSidebarProps = {
  isDark: boolean; // kept for compatibility, but visuals are token-driven now
  title?: string;
  subtitle?: string;
  roleLabel?: string;
  roleCaption?: string;
  expandLabel?: string;
  collapseLabel?: string;

  collapsed?: boolean;
  setCollapsed?: (v: boolean) => void;
  sidebarPeek?: boolean;
  setSidebarPeek?: (v: boolean) => void;

  storageKey?: string;
  navItems?: NavItem[];

  bottomSlot?: React.ReactNode;
  bottomSlotCollapsed?: React.ReactNode;
};

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

  bottomSlot = null,
  bottomSlotCollapsed = null,
}: CNCSSidebarProps): JSX.Element {
  const location = useLocation();
  const effectiveCollapsed = Boolean(collapsed) && !sidebarPeek;

  const shellClasses = useMemo(() => {
    return cn(
      // Sidebar must NEVER bleed into main content (CNCS premium constraint)
      // - overflow-hidden: clips any child overflow (collapsed mode widgets)
      // - shrink-0: prevents flex shrink that can create sub-pixel layout bleed
      "no-print sticky top-0 h-screen border-r flex flex-col overflow-hidden shrink-0 transition-[width] duration-200",
      "theme-scope theme-bg theme-border",
      effectiveCollapsed ? "w-[84px] px-2 py-4" : "w-64 px-3 py-4"
    );
  }, [effectiveCollapsed]);

  const headerBox = cn("rounded-2xl border p-3", "theme-panel-2 theme-border");

  const navItemClasses = (active: boolean) => {
    const base = "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm border transition-colors";
    if (active) return `${base} theme-nav-item-active`;
    return `${base} theme-nav-item`;
  };

  return (
    <aside
      className={shellClasses}
      onMouseEnter={() => setSidebarPeek?.(true)}
      onMouseLeave={() => setSidebarPeek?.(false)}
      onFocusCapture={() => setSidebarPeek?.(true)}
      onBlurCapture={() => setSidebarPeek?.(false)}
      aria-label="Sidebar"
      data-mode={isDark ? "dark" : "light"}
    >
      <div className={cn("mb-3", effectiveCollapsed ? "px-0" : "px-1")}>
        <div className={headerBox}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn("h-9 w-9 rounded-xl border", "theme-panel-2 theme-border")} />
              {!effectiveCollapsed && (
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{title}</div>
                  <div className="text-sm font-semibold truncate">{subtitle || "CORE"}</div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !Boolean(collapsed);
                setCollapsed?.(next);
                try {
                  window.localStorage.setItem(storageKey, next ? "1" : "0");
                } catch {}
              }}
              className={cn("rounded-xl border px-2 py-2 transition-colors", "theme-panel-2 theme-border hover:opacity-95")}
              aria-label={effectiveCollapsed ? expandLabel : collapseLabel}
              title={effectiveCollapsed ? expandLabel : collapseLabel}
            >
              <span className="text-sm">{effectiveCollapsed ? "›" : "‹"}</span>
            </button>
          </div>

          {!effectiveCollapsed ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{roleCaption}</div>
                <div className="mt-0.5 text-[12px] font-semibold truncate">{roleLabel}</div>
              </div>
              <ConnectionIndicator />
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-center">
              <ConnectionIndicator />
            </div>
          )}
        </div>
      </div>

      <nav className={cn("flex-1 overflow-y-auto", effectiveCollapsed ? "px-0" : "px-1")}>
        <div className="flex flex-col gap-2">
          {navItems.map((item) => {
            const active =
              item.end
                ? location.pathname === item.to
                : location.pathname === item.to || location.pathname.startsWith(item.to + "/");

            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={navItemClasses(active)}>
                <NavIcon name={item.icon} className={cn("opacity-90", item.colorClass)} />
                {!effectiveCollapsed ? <span className="truncate">{item.label}</span> : null}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className={cn("mt-3 overflow-hidden", effectiveCollapsed ? "px-0" : "px-1")}>
        {!effectiveCollapsed ? bottomSlot : bottomSlotCollapsed}
      </div>
    </aside>
  );
}