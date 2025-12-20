// src/UfficioShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import ConnectionIndicator from "./components/ConnectionIndicator";
import { coreLayout } from "./ui/coreLayout";
import { corePills, themeIconBg } from "./ui/designSystem";

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem("core-theme");
    if (stored === "dark" || stored === "light") return stored;
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
  } catch {}
  return "dark";
}

export default function UfficioShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(getInitialTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    try {
      window.localStorage.setItem("core-theme", theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme((c) => (c === "dark" ? "light" : "dark"));

  const [sidebarPeek, setSidebarPeek] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const v = window.localStorage.getItem("core-sidebar-collapsed-ufficio");
      if (v === "1" || v === "0") return v === "1";
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "core-sidebar-collapsed-ufficio",
        sidebarCollapsed ? "1" : "0"
      );
    } catch {}
  }, [sidebarCollapsed]);

  const effectiveCollapsed = sidebarCollapsed && !sidebarPeek;

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Errore logout ufficio:", err);
    } finally {
      navigate("/login");
    }
  };

  const displayName = useMemo(() => {
    return (
      profile?.display_name || profile?.full_name || profile?.email || "Ufficio"
    );
  }, [profile]);

  const pathname = location.pathname || "";
  const isInca = pathname.startsWith("/ufficio/inca");
  const isCoreDrive = pathname.startsWith("/ufficio/archive");
  const pageLabel = isCoreDrive ? "CORE Drive" : isInca ? "INCA" : "Rapportini";

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo…
      </div>
    );
  }

  const driveTopGlow = isCoreDrive
    ? "bg-gradient-to-r from-violet-950/45 via-slate-950/20 to-slate-950/10"
    : "bg-transparent";

  return (
    <div
      className={[
        "min-h-screen flex flex-col",
        coreLayout.pageShell(isDark),
      ].join(" ")}
    >
      {/* TOP BAR — fine, cockpit */}
      <header
        className={[
          "no-print sticky top-0 z-30 border-b backdrop-blur",
          "h-11 md:h-12",
          "flex items-center",
          coreLayout.header(isDark),
          driveTopGlow,
        ].join(" ")}
      >
        {/* ✅ Wrapper grille commune (aligné avec le contenu main) */}
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500 whitespace-nowrap">
              CORE
            </span>

            <span
              className={corePills(
                isDark,
                "sky",
                "px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
              )}
            >
              UFFICIO
            </span>

            <span className={isDark ? "text-slate-700" : "text-slate-300"}>
              ·
            </span>

            <span
              className={[
                "text-[14px] md:text-[15px] font-semibold truncate",
                isCoreDrive
                  ? isDark
                    ? "text-violet-100"
                    : "text-violet-800"
                  : isDark
                  ? "text-slate-100"
                  : "text-slate-900",
              ].join(" ")}
              title={pageLabel}
            >
              {pageLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="sr-only">Logout</span>

            <div className="flex items-center" title="Connessione">
              <ConnectionIndicator compact />
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className={[
                "inline-flex items-center justify-center",
                "h-9 w-9 rounded-full border transition-colors",
                isDark
                  ? "border-slate-800 bg-slate-950/20 hover:bg-slate-900/35"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              ].join(" ")}
              aria-label="Tema"
              title="Tema"
            >
              <span
                className={themeIconBg(
                  isDark,
                  "neutral",
                  "h-5 w-5 text-[10px]"
                )}
              >
                {isDark ? "🌑" : "☀️"}
              </span>
            </button>

            <span
              className={corePills(
                isDark,
                "neutral",
                "hidden sm:inline-flex max-w-[220px] truncate px-2 py-0.5 text-[10px]"
              )}
              title={displayName}
            >
              {displayName}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className={[
                "inline-flex items-center gap-2",
                "rounded-full border px-2.5 py-1",
                "text-[11px] font-medium transition-colors",
                isDark
                  ? "border-rose-500/80 text-rose-100 hover:bg-rose-600/20"
                  : "border-rose-400 text-rose-700 hover:bg-rose-50",
              ].join(" ")}
              title="Logout"
              aria-label="Logout"
            >
              <span
                className={themeIconBg(isDark, "neutral", "h-4 w-4 text-[9px]")}
              >
                ⏻
              </span>
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside
          className={[
            "no-print border-r hidden md:flex flex-col",
            coreLayout.sidebar(isDark),
            effectiveCollapsed ? "w-[84px] px-2 py-4" : "w-64 px-3 py-4",
            "transition-[width] duration-200",
          ].join(" ")}
          onMouseEnter={() => setSidebarPeek(true)}
          onMouseLeave={() => setSidebarPeek(false)}
          onFocusCapture={() => setSidebarPeek(true)}
          onBlurCapture={() => setSidebarPeek(false)}
        >
          {/* Toggle discret en haut de sidebar */}
          <div
            className={["mb-3", effectiveCollapsed ? "px-0" : "px-1"].join(" ")}
          >
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className={[
                "w-full inline-flex items-center gap-2",
                "rounded-xl border px-3 py-2",
                "text-[11px] uppercase tracking-[0.18em] transition-colors",
                isDark
                  ? "border-slate-800 bg-slate-950/20 text-slate-300 hover:bg-slate-900/35"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                effectiveCollapsed ? "justify-center px-0" : "justify-start",
              ].join(" ")}
              title={sidebarCollapsed ? "Espandi menu" : "Riduci menu"}
              aria-label={sidebarCollapsed ? "Espandi menu" : "Riduci menu"}
            >
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                ☰
              </span>
              {!effectiveCollapsed && (
                <span>{sidebarCollapsed ? "Espandi" : "Compatto"}</span>
              )}
            </button>
          </div>

          <nav
            className={[
              "space-y-1.5",
              effectiveCollapsed ? "px-0" : "px-1",
            ].join(" ")}
          >
            <NavLink
              to="/ufficio"
              end
              className={({ isActive }) =>
                [
                  corePills(
                    isDark,
                    "sky",
                    "w-full flex items-center gap-2 justify-start"
                  ),
                  isActive ? "" : "opacity-85 hover:opacity-100",
                  effectiveCollapsed ? "justify-center px-0" : "",
                ].join(" ")
              }
              title="Rapportini"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              {!effectiveCollapsed && <span>Rapportini</span>}
            </NavLink>

            <NavLink
              to="/ufficio/inca"
              className={({ isActive }) =>
                [
                  corePills(
                    isDark,
                    "emerald",
                    "w-full flex items-center gap-2 justify-start"
                  ),
                  isActive ? "" : "opacity-85 hover:opacity-100",
                  effectiveCollapsed ? "justify-center px-0" : "",
                ].join(" ")
              }
              title="INCA"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {!effectiveCollapsed && <span>INCA</span>}
            </NavLink>

            <NavLink
              to="/ufficio/archive"
              className={({ isActive }) =>
                [
                  corePills(
                    isDark,
                    "violet",
                    "w-full flex items-center gap-2 justify-start font-semibold"
                  ),
                  isActive
                    ? "bg-violet-950/30 border-violet-500/65 text-violet-100 shadow-[0_18px_60px_rgba(139,92,246,0.16)]"
                    : "bg-violet-950/18 border-violet-500/50 text-violet-100/90 hover:bg-violet-950/25",
                  effectiveCollapsed ? "justify-center px-0" : "",
                ].join(" ")
              }
              title="CORE Drive"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.45)]" />
              {!effectiveCollapsed && <span>CORE Drive</span>}
            </NavLink>
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] text-slate-600">
            <div>CORE</div>
          </div>
        </aside>

        <main
          className={[
            "flex-1 min-h-0 overflow-y-auto",
            coreLayout.mainBg(isDark),
          ].join(" ")}
        >
          <section className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <div
              className={[
                "border rounded-2xl overflow-hidden",
                coreLayout.primaryPanel(isDark),
              ].join(" ")}
            >
              <Outlet />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
