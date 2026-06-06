// src/shells/CommandShell.tsx — Pro Dashboard layout with sidebar
import { type FormEvent, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const MAIN_NAV = [
  {
    to: "/command/center",
    label: "Aujourd'hui",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    to: "/command/daily-lists",
    label: "Listes journalières",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6h12" /><path d="M8 12h12" /><path d="M8 18h12" /><path d="M3.5 6h.01" /><path d="M3.5 12h.01" /><path d="M3.5 18h.01" />
      </svg>
    ),
  },
  {
    to: "/command/problems",
    label: "Problèmes",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
    ),
  },
  {
    to: "/command/timeline",
    label: "Journal terrain",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    to: "/command/apparati",
    label: "Apparati",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
      </svg>
    ),
  },
  {
    to: "/command/terrain-images",
    label: "Images terrain",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
      </svg>
    ),
  },
  {
    to: "/command/cables",
    label: "Câbles",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h18" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M3 21h18" />
      </svg>
    ),
  },
  {
    to: "/command/ai",
    label: "IA Cockpit",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 8v4l3 3" /><circle cx="19" cy="5" r="3" />
      </svg>
    ),
  },
  {
    to: "/command/commander",
    label: "Commander",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
      </svg>
    ),
  },
] as const;

const ADMIN_NAV = [
  { to: "/command/inca",      label: "Import INCA" },
  { to: "/command/intake",    label: "Messages entrants" },
  { to: "/command/ai-intake", label: "Classifieur IA" },
] as const;

const MOBILE_NAV = [
  { to: "/command/center",      label: "Aujourd'hui" },
  { to: "/command/daily-lists", label: "Listes" },
  { to: "/command/problems",    label: "Problèmes" },
  { to: "/command/ai",          label: "IA" },
] as const;

export default function CommandShell() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { signOut } = useAuth() as { signOut: (a: { reason: string }) => Promise<void> };
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function search(e: FormEvent) {
    e.preventDefault();
    const code = query.trim();
    if (!code) return;
    navigate(`/command/cable/${encodeURIComponent(code)}`);
    setQuery("");
  }

  const adminActive = ADMIN_NAV.some((n) => location.pathname.startsWith(n.to));

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ─── Sidebar (desktop) ─────────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:left-0 bg-white border-r border-gray-200 z-30">
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center px-5 border-b border-gray-200">
          <span className="text-sm font-black tracking-[0.15em] text-gray-900 uppercase">Core Command</span>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-2">
          <form onSubmit={search}>
            <label htmlFor="sidebar-search" className="sr-only">Rechercher un câble</label>
            <input
              id="sidebar-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un câble…"
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 transition hover:border-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </form>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {MAIN_NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}

          {/* Admin section */}
          <div className="pt-4 pb-1 px-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Administration</p>
          </div>
          {ADMIN_NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                }`
              }
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
              </svg>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={() => signOut({ reason: "manual" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ─── Mobile top bar ────────────────────────────────────────────── */}
      <div className="md:hidden fixed inset-x-0 top-0 z-30 flex h-12 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4">
        <span className="text-xs font-black tracking-[0.15em] text-gray-900 uppercase shrink-0">Core</span>

        <form onSubmit={search} className="flex-1 min-w-0">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Câble…"
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
          />
        </form>

        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Menu admin"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${adminActive ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
          </svg>
        </button>

        {mobileMenuOpen && (
          <div className="absolute right-2 top-12 mt-1 w-44 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-50">
            {ADMIN_NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 text-sm transition-colors ${isActive ? "text-blue-700 font-semibold" : "text-gray-600 hover:text-gray-900"}`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="my-1 border-t border-gray-200" />
            <button
              onClick={() => { setMobileMenuOpen(false); signOut({ reason: "manual" }); }}
              className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>

      {/* ─── Content area ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col md:pl-60">
        <main
          id="main-content"
          className="flex-1 pt-12 md:pt-0 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0"
        >
          <Outlet />
        </main>
      </div>

      {/* ─── Mobile bottom nav ─────────────────────────────────────────── */}
      <nav
        aria-label="Navigation mobile"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {MOBILE_NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-1 min-h-[52px] py-2 text-xs font-medium tracking-wide transition-colors ${
                  isActive ? "text-blue-700" : "text-gray-500"
                }`
              }
            >
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
