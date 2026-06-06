// src/shells/CommandShell.tsx
import { type FormEvent, useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import CommandBottomNav from "./CommandBottomNav";

const MAIN_NAV = [
  { to: "/command/center",      label: "Aujourd'hui" },
  { to: "/command/daily-lists", label: "Listes"      },
  { to: "/command/problems",    label: "Problèmes"   },
  { to: "/command/timeline",    label: "Journal"     },
  { to: "/command/cables",      label: "Câbles"      },
  { to: "/command/commander",   label: "Commander"   },
] as const;

const ADMIN_NAV = [
  { to: "/command/inca",   label: "Import INCA"    },
  { to: "/command/intake", label: "Intake messages" },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/command/center":      "Cockpit — CORE",
  "/command/daily-lists": "Listes — CORE",
  "/command/problems":    "Problèmes — CORE",
  "/command/timeline":    "Journal — CORE",
  "/command/cables":      "Câbles — CORE",
  "/command/commander":   "Commander — CORE",
  "/command/inca":        "Import INCA — CORE",
  "/command/intake":      "Intake — CORE",
};

export default function CommandShell() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { signOut } = useAuth() as { signOut: (a: { reason: string }) => Promise<void> };
  const [query,     setQuery]     = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement>(null);

  // Dynamic page title
  useEffect(() => {
    const path  = location.pathname;
    const exact = PAGE_TITLES[path];
    if (exact) {
      document.title = exact;
      return;
    }
    // Cable detail: /command/cable/:code
    const cableMatch = path.match(/^\/command\/cable\/(.+)$/);
    if (cableMatch) {
      const code = decodeURIComponent(cableMatch[1]);
      document.title = `${code} — CORE`;
      return;
    }
    document.title = "CORE";
  }, [location.pathname]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) {
        setAdminOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function search(e: FormEvent) {
    e.preventDefault();
    const code = query.trim();
    if (!code) return;
    navigate(`/command/cable/${encodeURIComponent(code)}`);
    setQuery("");
  }

  const adminActive = ADMIN_NAV.some((n) => location.pathname.startsWith(n.to));

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/50 bg-zinc-950/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">

          {/* Logo */}
          <span className="text-xs font-semibold tracking-[0.2em] text-zinc-400 uppercase shrink-0 select-none">
            Core Command
          </span>

          {/* Search */}
          <form onSubmit={search} className="flex-1 flex items-center gap-2 min-w-0">
            <label htmlFor="header-search" className="sr-only">Rechercher un câble</label>
            <input
              id="header-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un câble…"
              autoComplete="off"
              className="w-full min-h-8 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 text-sm text-zinc-300 placeholder:text-zinc-600 transition hover:border-zinc-700 focus:border-zinc-600 focus:bg-zinc-900 focus:outline-none"
            />
          </form>

          {/* Admin ⚙ */}
          <div ref={adminRef} className="relative shrink-0">
            <button
              onClick={() => setAdminOpen((v) => !v)}
              aria-label="Administration"
              aria-expanded={adminOpen}
              aria-haspopup="menu"
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                adminActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-600 hover:bg-zinc-900 hover:text-zinc-300"
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
              </svg>
            </button>
            {adminOpen && (
              <div role="menu" className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 py-2 z-50">
                {ADMIN_NAV.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    role="menuitem"
                    onClick={() => setAdminOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-2 text-sm transition-colors ${
                        isActive ? "text-white" : "text-zinc-500 hover:text-zinc-200"
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
                <div className="my-1 border-t border-zinc-800" />
                <button
                  role="menuitem"
                  onClick={() => signOut({ reason: "manual" })}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:text-red-400 transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop nav */}
        <nav aria-label="Navigation principale" className="hidden md:flex max-w-6xl mx-auto px-4 sm:px-6 items-center gap-0 pb-0">
          {MAIN_NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-0 py-2 mr-6 text-sm border-b-2 transition-colors ${
                  isActive
                    ? "text-white border-white"
                    : "text-zinc-600 border-transparent hover:text-zinc-300 hover:border-zinc-600"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main id="main-content" className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      <CommandBottomNav />
    </div>
  );
}
