import { type FormEvent, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useTheme } from "../hooks/useTheme";

const MAIN_NAV = [
  { to: "/oggi", label: "Oggi", hint: "Cosa chiudere adesso" },
  { to: "/campo", label: "Campo", hint: "Verifiche sul campo" },
  { to: "/apparati", label: "Apparati", hint: "Chiusure apparato" },
  { to: "/situazione", label: "Situazione", hint: "Messaggio 16:30" },
  { to: "/assistente", label: "Assistente", hint: "Domande sul cantiere" },
] as const;

const SECONDARY_NAV = [
  { to: "/grafici", label: "Analisi", hint: "Grafici di supporto" },
  { to: "/navemaster", label: "Navemaster", hint: "Riconciliazione INCA ↔ campo" },
  { to: "/import-inca", label: "Import INCA", hint: "Upload XLSX + sync baseline" },
] as const;

export default function CommandShell(): JSX.Element {
  const navigate = useNavigate();
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
        <aside className="shell-sidebar hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:w-[304px] lg:flex-col lg:border-r lg:px-6 lg:py-6">
          <div className="shell-hero rounded-[28px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] theme-token-muted">Core Command</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight theme-token-text">Centro Comando</h1>
              </div>
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="shell-toggle inline-flex min-h-10 items-center gap-2 rounded-2xl px-3 text-sm font-semibold"
                aria-label={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
              >
                <span aria-hidden>{isDark ? "☀" : "☾"}</span>
                <span>{isDark ? "White" : "Dark"}</span>
              </button>
            </div>
          </div>

          <form onSubmit={search} className="mt-6">
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
          </form>

          <nav className="mt-6 space-y-2">
            {MAIN_NAV.map(({ to, label, hint }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `shell-nav-item block rounded-[22px] px-4 py-3 transition ${isActive ? "shell-nav-item-active" : ""}`
                }
              >
                {({ isActive }) => (
                  <>
                    <p className={`text-sm font-semibold ${isActive ? "theme-token-text" : "theme-token-text"}`}>{label}</p>
                    <p className={`mt-1 text-xs ${isActive ? "theme-token-muted" : "theme-token-muted"}`}>{hint}</p>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <nav className="mt-6 border-t theme-token-border pt-4">
            <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.2em] theme-token-faint">Strumenti</p>
            <div className="mt-2 space-y-2">
              {SECONDARY_NAV.map(({ to, label, hint }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `shell-nav-item shell-secondary-item block rounded-[18px] px-4 py-3 transition ${isActive ? "shell-secondary-item-active" : ""}`
                  }
                >
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-xs theme-token-muted">{hint}</p>
                </NavLink>
              ))}
            </div>
          </nav>

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
            <div className="px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] theme-token-muted">Core Command</p>
                  <p className="mt-1 text-base font-semibold theme-token-text">Centro Comando</p>
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

              <form onSubmit={search} className="mt-3">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cerca cavo"
                  className="shell-search min-h-11 w-full rounded-2xl px-4 text-sm"
                />
              </form>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {MAIN_NAV.map(({ to, label }) => (
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
              </div>
              <div className="mt-2 flex justify-end gap-4">
                {SECONDARY_NAV.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `shell-link text-xs font-medium underline-offset-4 transition ${isActive ? "shell-link-active underline" : "hover:underline"}`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
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
