import { type FormEvent, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const MAIN_NAV = [
  { to: "/command/center",        label: "Dashboard",      hint: "Vue chantier du jour" },
  { to: "/command/navemaster",    label: "Navemaster",     hint: "Vérité, travail, import et IA" },
  { to: "/command/cables",        label: "Câbles",         hint: "Recherche et stories" },
  { to: "/command/commander",     label: "Commander",      hint: "Entrée messages" },
  { to: "/command/apparati",      label: "Apparati",       hint: "Gestion des apparats" },
  { to: "/command/terrain-images", label: "Images terrain", hint: "Photos et preuves visuelles" },
  { to: "/command/ai",            label: "IA Cockpit",     hint: "Analyse et classification IA" },
] as const;

const ADMIN_NAV = [
  { to: "/command/problems",  label: "Problèmes ouverts" },
  { to: "/command/timeline",  label: "Journal chantier" },
  { to: "/command/inca",      label: "Import INCA" },
  { to: "/command/intake",    label: "Intake messages" },
  { to: "/command/ai-intake", label: "Classifieur IA" },
] as const;

export default function CommandShell(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth() as { signOut: (a: { reason: string }) => Promise<void> };
  const [query, setQuery] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (adminRef.current && !adminRef.current.contains(event.target as Node)) {
        setAdminOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function search(event: FormEvent) {
    event.preventDefault();
    const code = query.trim();
    if (!code) return;
    navigate(`/command/cable/${encodeURIComponent(code)}`);
    setQuery("");
  }

  const adminActive = ADMIN_NAV.some((item) => location.pathname.startsWith(item.to));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.12),_transparent_24%),linear-gradient(180deg,#fcfbf8_0%,#f5f1e8_100%)] text-stone-900">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:w-[304px] lg:flex-col lg:border-r lg:border-stone-200 lg:bg-white/82 lg:px-6 lg:py-6 lg:backdrop-blur">
          <div className="rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#ffffff_0%,#f6f0e3_100%)] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Core Command</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">Hamidou Control Room</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600">Telegram en direct, Navemaster, priorités câble et décisions terrain.</p>
          </div>

          <form onSubmit={search} className="mt-6">
            <label className="block">
              <span className="sr-only">Rechercher un câble</span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un câble"
                className="min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:bg-white"
              />
            </label>
          </form>

          <nav className="mt-6 space-y-2">
            {MAIN_NAV.map(({ to, label, hint }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `block rounded-[22px] border px-4 py-3 transition ${
                    isActive
                      ? "border-stone-900 bg-stone-900 text-white shadow-[0_12px_30px_rgba(28,25,23,0.18)]"
                      : "border-transparent bg-transparent text-stone-600 hover:border-stone-200 hover:bg-white hover:text-stone-950"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <p className={`text-sm font-semibold ${isActive ? "text-white" : "text-stone-900"}`}>{label}</p>
                    <p className={`mt-1 text-xs ${isActive ? "text-stone-300" : "text-stone-500"}`}>{hint}</p>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 rounded-[24px] border border-stone-200 bg-stone-50/90 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Outils</p>
            <div className="mt-3 space-y-2">
              {ADMIN_NAV.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `block rounded-2xl px-3 py-2 text-sm transition ${
                      isActive ? "bg-white text-stone-950 shadow-sm" : "text-stone-600 hover:bg-white hover:text-stone-900"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-6">
            <button
              onClick={() => signOut({ reason: "manual" })}
              className="min-h-11 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition hover:border-rose-200 hover:text-rose-700"
            >
              Déconnexion
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/86 backdrop-blur lg:hidden">
            <div className="px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Core Command</p>
                  <p className="mt-1 text-base font-semibold text-stone-950">Cockpit chantier</p>
                </div>
                <div ref={adminRef} className="relative shrink-0">
                  <button
                    onClick={() => setAdminOpen((value) => !value)}
                    className={`rounded-2xl border px-3 py-2 text-sm transition ${
                      adminActive ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-600"
                    }`}
                  >
                    Outils
                  </button>
                  {adminOpen ? (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-stone-200 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
                      {ADMIN_NAV.map(({ to, label }) => (
                        <NavLink
                          key={to}
                          to={to}
                          onClick={() => setAdminOpen(false)}
                          className={({ isActive }) =>
                            `block rounded-xl px-3 py-2 text-sm transition ${
                              isActive ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                            }`
                          }
                        >
                          {label}
                        </NavLink>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <form onSubmit={search} className="mt-3">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher un câble"
                  className="min-h-11 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-amber-400 focus:bg-white"
                />
              </form>
            </div>
          </header>

          <main className="min-w-0 flex-1 pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
