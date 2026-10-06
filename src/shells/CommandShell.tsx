import { type FormEvent, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useTheme } from "../hooks/useTheme";

const PRIMARY_NAV = [
  { to: "/oggi", label: "Oggi", hint: "Cosa chiudere adesso" },
  { to: "/navemaster", label: "Consegna", hint: "Perimetri e avanzamento" },
  { to: "/apparati", label: "Apparati", hint: "Chiusure apparato" },
  { to: "/targhetti", label: "TARGHETTI", hint: "Marcatura e stampa" },
] as const;

const TOOLS_NAV = [
  { to: "/import", label: "Liste", hint: "Liste giornaliere" },
  { to: "/import-inca", label: "Import INCA", hint: "Carica XLSX" },
  { to: "/campo", label: "Campo", hint: "Prove dal campo" },
  { to: "/assistente", label: "Assistente", hint: "Domande sul cantiere" },
  { to: "/grafici", label: "Analisi", hint: "Grafici di supporto" },
] as const;

export default function CommandShell(): JSX.Element {
  const navigate = useNavigate();
  const compact = useLocation().pathname === "/targhetti";
  const SidebarTools = compact ? "details" : "nav";
  const { signOut } = useAuth() as { signOut: (a: { reason: string }) => Promise<void> };
  const { effective, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const isDark = effective === "dark";

  function search(event: FormEvent) {
    event.preventDefault();
    const code = query.trim();
    if (!code) return;
    navigate(`/cable/${encodeURIComponent(code)}`);
    setQuery("");
  }

  return (
    <div className="shell-frame">
      <div className="flex min-h-screen">
        <aside className={`shell-sidebar hidden lg:flex lg:sticky lg:top-0 lg:h-screen ${compact ? "lg:w-[220px] lg:px-4" : "lg:w-[304px] lg:px-6"} lg:flex-col lg:border-r lg:py-6`}>
          <div className={compact ? "px-4 py-3" : "shell-hero rounded-[28px] p-5"}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] theme-token-muted">Core Command</p>
                {!compact && <><h1 className="mt-2 text-2xl font-semibold tracking-tight theme-token-text">Centro Comando</h1>
                <p className="mt-2 text-sm leading-6 theme-token-muted">Consegna, apparati e strumenti di bordo in un solo cockpit.</p></>}
              </div>
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="shell-toggle inline-flex min-h-10 items-center gap-2 rounded-2xl px-3 text-sm font-semibold"
                aria-label={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
              >
                <span aria-hidden>{isDark ? "☀" : "☾"}</span>
                {!compact && <span>{isDark ? "White" : "Dark"}</span>}
              </button>
            </div>
          </div>

          {!compact && <form onSubmit={search} className="mt-6">
            <label className="block">
              <span className="sr-only">Cerca cavo</span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca cavo"
                className="shell-search min-h-12 w-full rounded-2xl px-4 text-sm transition"
              />
            </label>
          </form>}

          <nav className="mt-6 space-y-2">
            {PRIMARY_NAV.map(({ to, label, hint }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `shell-nav-item block rounded-[22px] px-4 ${compact ? "py-2" : "py-3"} transition ${isActive ? "shell-nav-item-active" : ""}`
                }
              >
                {({ isActive }) => (
                  <>
                    <p className={`text-sm font-semibold ${isActive ? "theme-token-text" : "theme-token-text"}`}>{label}</p>
                    {!compact && <p className="mt-1 text-xs theme-token-muted">{hint}</p>}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <SidebarTools className="mt-6 border-t theme-token-border pt-4">
            {compact ? <summary className="cursor-pointer px-4 text-xs theme-token-muted">Menu</summary> : <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.2em] theme-token-faint">Strumenti</p>}
            <div className="mt-2 space-y-2">
              {TOOLS_NAV.map(({ to, label, hint }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `shell-nav-item shell-secondary-item block rounded-[18px] px-4 py-3 transition ${isActive ? "shell-secondary-item-active" : ""}`
                  }
                >
                  <p className="text-sm font-semibold">{label}</p>
                  {!compact && <p className="mt-1 text-xs theme-token-muted">{hint}</p>}
                </NavLink>
              ))}
            </div>
          </SidebarTools>

          <div className="mt-auto pt-6">
            <button
              onClick={() => signOut({ reason: "manual" })}
              className="shell-action min-h-11 w-full rounded-2xl px-4 text-sm font-medium transition"
            >
              Disconnetti
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="shell-topbar sticky top-0 z-30 border-b lg:hidden">
            <div className={compact ? "px-5 py-3" : "px-5 py-4"}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] theme-token-muted">Core Command</p>
                  {!compact && <><p className="mt-1 text-base font-semibold theme-token-text">Centro Comando</p>
                  <p className="mt-1 text-xs theme-token-muted">Consegna e strumenti essenziali.</p></>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className="shell-toggle inline-flex min-h-10 items-center gap-2 rounded-2xl px-3 text-sm font-semibold"
                    aria-label={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
                  >
                    <span aria-hidden>{isDark ? "☀" : "☾"}</span>
                  </button>
                  <button
                    onClick={() => signOut({ reason: "manual" })}
                    className="shell-action rounded-2xl px-3 py-2 text-sm"
                  >
                    Esci
                  </button>
                </div>
              </div>

              {!compact && <form onSubmit={search} className="mt-3">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cerca cavo"
                  className="shell-search min-h-11 w-full rounded-2xl px-4 text-sm"
                />
              </form>}

              {!compact && <div className="mt-3 grid grid-cols-4 gap-2">
                {PRIMARY_NAV.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `shell-nav-item rounded-2xl px-2 py-2 text-center text-xs font-medium transition ${isActive ? "shell-nav-item-active" : ""}`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </div>}
              <details className="mt-2">
                <summary className="shell-action flex min-h-10 cursor-pointer list-none items-center justify-center rounded-2xl px-4 text-xs font-semibold transition">
                  {compact ? "Menu" : "Strumenti"}
                </summary>
                <div className="mt-2 space-y-2">
                  {compact && PRIMARY_NAV.map(({to,label})=><NavLink key={to} to={to} className="shell-nav-item block rounded-2xl px-3 py-2 text-sm">{label}</NavLink>)}
                  {TOOLS_NAV.map(({ to, label, hint }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `shell-nav-item shell-secondary-item block rounded-[18px] px-4 py-3 transition ${isActive ? "shell-secondary-item-active" : ""}`
                      }
                    >
                      <p className="text-sm font-semibold">{label}</p>
                      {!compact && <p className="mt-1 text-xs theme-token-muted">{hint}</p>}
                    </NavLink>
                  ))}
                </div>
              </details>
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
