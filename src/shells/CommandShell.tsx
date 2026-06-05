// src/shells/CommandShell.tsx — V3 Silent
import { type FormEvent, useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const MAIN_NAV = [
  { to: "/command/center",      label: "Aujourd'hui" },
  { to: "/command/daily-lists", label: "Listes"      },
  { to: "/command/cables",      label: "Câbles"      },
  { to: "/command/commander",   label: "Commander"   },
] as const;

const ADMIN_NAV = [
  { to: "/command/problems", label: "Problèmes ouverts" },
  { to: "/command/timeline", label: "Journal chantier"  },
  { to: "/command/inca",     label: "Import INCA"       },
  { to: "/command/intake",   label: "Intake messages"   },
] as const;

export default function CommandShell() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { signOut } = useAuth() as { signOut: (a: { reason: string }) => Promise<void> };
  const [query,     setQuery]     = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement>(null);

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
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between gap-6">

          {/* Logo */}
          <span className="text-xs font-semibold tracking-[0.2em] text-zinc-400 uppercase shrink-0">
            Core Command
          </span>

          {/* Search */}
          <form onSubmit={search} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un câble…"
              className="w-full bg-transparent text-sm text-zinc-300 placeholder:text-zinc-700 outline-none"
            />
          </form>

          {/* Admin */}
          <div ref={adminRef} className="relative shrink-0">
            <button
              onClick={() => setAdminOpen((v) => !v)}
              className={`text-sm transition-colors ${
                adminActive ? "text-white" : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              ⚙
            </button>
            {adminOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 py-2 z-50">
                {ADMIN_NAV.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
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
                  onClick={() => signOut({ reason: "manual" })}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:text-red-400 transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-1 pb-0">
          {MAIN_NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-0 py-2 mr-6 text-sm border-b-2 transition-colors ${
                  isActive
                    ? "text-white border-white"
                    : "text-zinc-600 border-transparent hover:text-zinc-400 hover:border-zinc-700"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
