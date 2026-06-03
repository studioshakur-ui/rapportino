// src/shell/CommandShell.tsx
// Shell unique CORE COMMAND : desktop premium (sidebar) + mobile-first (bottom nav).
// Aucun rôle. Cockpit personnel de Hamidou.

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../auth/AuthProvider";
import { usePendingCount } from "../core/events/useEvents";
import { NAV } from "./nav";

export default function CommandShell(): JSX.Element {
  const { effective, setTheme } = useTheme();
  const isDark = effective === "dark";
  const { profile, signOut } = useAuth();
  const nav = useNavigate();
  const pending = usePendingCount();
  const pendingCount = pending.data ?? 0;

  const shell = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";
  const railBg = isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200";
  const name = (profile?.full_name || profile?.display_name || profile?.email || "Hamidou") as string;

  const linkBase =
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors";
  const linkActive = isDark
    ? "bg-sky-500/15 text-sky-300"
    : "bg-sky-500/10 text-sky-700";
  const linkIdle = isDark
    ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900";

  return (
    <div className={`min-h-screen ${shell}`}>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r ${railBg} px-4 py-5 md:flex`}
      >
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="text-2xl">◎</span>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide">CORE COMMAND</div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">cockpit chantier</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
            >
              <span className="w-5 text-center text-lg">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.to === "/priorities" && pendingCount > 0 && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-slate-700/40 pt-3">
          <div className="px-2 text-[12px] text-slate-500">{name}</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex-1 rounded-lg border border-slate-600/40 px-2 py-1.5 text-xs hover:bg-slate-700/30"
            >
              {isDark ? "☀ Clair" : "☾ Sombre"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                nav("/login", { replace: true });
              }}
              className="flex-1 rounded-lg border border-rose-500/40 px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10"
            >
              Sortir
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MOBILE TOPBAR ===== */}
      <header
        className={`sticky top-0 z-20 flex items-center justify-between border-b ${railBg} px-4 py-3 md:hidden`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">◎</span>
          <span className="text-sm font-bold tracking-wide">CORE COMMAND</span>
        </div>
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="rounded-lg border border-slate-600/40 px-2 py-1 text-xs"
        >
          {isDark ? "☀" : "☾"}
        </button>
      </header>

      {/* ===== CONTENT ===== */}
      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-24 md:pb-8">
          <Outlet />
        </div>
      </main>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav
        className={`fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t ${railBg} md:hidden`}
      >
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                isActive ? (isDark ? "text-sky-300" : "text-sky-600") : "text-slate-500"
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.short}</span>
            {item.to === "/priorities" && pendingCount > 0 && (
              <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-rose-500" />
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
