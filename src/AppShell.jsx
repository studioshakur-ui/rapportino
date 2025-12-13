// src/AppShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import ConnectionIndicator from "./components/ConnectionIndicator";
import { coreLayout } from "./ui/coreLayout";
import {
  corePills,
  themeIconBg,
  getInitialTheme,
} from "./ui/designSystem";

export default function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(getInitialTheme);
  const isDark = theme === "dark";

  useEffect(() => {
    try {
      window.localStorage.setItem("core-theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Errore logout capo:", err);
    } finally {
      navigate("/login");
    }
  };

  const displayName = useMemo(
    () =>
      profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      "Capo Squadra",
    [profile]
  );

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  // Contexte route
  const pathname = location.pathname;
  const isRapportino =
    pathname === "/app" || pathname.startsWith("/app/rapportino");
  const isCoreDrive = pathname.startsWith("/app/archive"); // route technique inchangée

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo Capo…
      </div>
    );
  }

  return (
    <div
      className={[
        "min-h-screen flex flex-col",
        coreLayout.pageShell(isDark),
      ].join(" ")}
    >
      {/* HEADER COCKPIT CAPO */}
      <header
        className={[
          "no-print border-b backdrop-blur flex items-center justify-between px-4 md:px-6 py-2",
          coreLayout.header(isDark),
        ].join(" ")}
      >
        <div className="flex flex-col gap-0.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            CORE · Sistema centrale di cantiere
          </div>
          <div className="text-xs text-slate-400">
            Modulo Capo ·{" "}
            <span className="font-semibold">
              {isCoreDrive
                ? "CORE Drive · storico tecnico"
                : "Compilazione rapportino digitale"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          {/* Switch Dark/Light */}
          <button
            type="button"
            onClick={toggleTheme}
            className={[
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
              coreLayout.themeToggle(isDark),
            ].join(" ")}
          >
            <span
              className={themeIconBg(
                isDark,
                "neutral",
                "h-3 w-3 text-[9px] flex items-center justify-center"
              )}
            >
              {isDark ? "🌑" : "☀️"}
            </span>
            <span className="uppercase tracking-[0.16em]">
              {isDark ? "Dark" : "Light"}
            </span>
          </button>

          {/* Indicateur connexion Supabase */}
          <ConnectionIndicator />

          {/* Info user */}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-slate-400">
              Capo:{" "}
              <span className="text-slate-100 font-medium">
                {displayName}
              </span>
            </span>
            <span className="text-slate-500">
              {isCoreDrive
                ? "Area Capo · CORE Drive"
                : "Area Capo · Rapportino giornaliero"}
            </span>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className={[
              "px-3 py-1.5 rounded-full border text-xs font-medium",
              isDark
                ? "border-rose-500 text-rose-100 hover:bg-rose-600/20"
                : "border-rose-400 text-rose-700 hover:bg-rose-50",
            ].join(" ")}
          >
            Logout
          </button>
        </div>
      </header>

      {/* LAYOUT */}
      <div className="flex flex-1 min-h-0">
        {/* SIDEBAR */}
        <aside
          className={[
            "no-print w-64 border-r px-3 py-4 flex flex-col gap-5",
            coreLayout.sidebar(isDark),
          ].join(" ")}
        >
          {/* Titre sidebar */}
          <div className="px-1 pb-3 border-b border-slate-800/60">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-1">
              Pannello Capo
            </div>
            <div className="text-xs text-slate-300">
              Compila, rivedi e invia i rapportini giornalieri.
            </div>
          </div>

          {/* Navigation */}
          <nav className="px-1 py-3 space-y-1.5">
            {/* Rapportino di oggi */}
            <NavLink
              to="/app"
              end
              className={({ isActive }) =>
                [
                  corePills(
                    isDark,
                    "sky",
                    "w-full flex items-center gap-2 justify-start"
                  ),
                  isActive
                    ? ""
                    : isDark
                    ? "opacity-80 hover:opacity-100"
                    : "opacity-80 hover:opacity-100",
                ].join(" ")
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>Rapportino di oggi</span>
            </NavLink>

            {/* CORE Drive Capo (route technique /app/archive) */}
            <NavLink
              to="/app/archive"
              className={({ isActive }) =>
                [
                  corePills(
                    isDark,
                    "violet",
                    "w-full flex items-center gap-2 justify-start"
                  ),
                  isActive
                    ? ""
                    : isDark
                    ? "opacity-75 hover:opacity-100"
                    : "opacity-80 hover:opacity-100",
                ].join(" ")
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <span>CORE Drive · storico tecnico</span>
            </NavLink>
          </nav>

          {/* Footer sidebar */}
          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] text-slate-500">
            <div>CORE · SHAKUR Engineering</div>
            <div className="text-slate-600">
              Capo · Cantiere · Fincantieri
            </div>
          </div>
        </aside>

        {/* CONTENU PRINCIPAL */}
        <main
          className={[
            "flex-1 min-h-0 overflow-y-auto",
            coreLayout.mainBg(isDark),
          ].join(" ")}
        >
          <section className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {/* Bandeau contexte */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {isCoreDrive
                    ? "CORE Drive · storico certificato"
                    : "Compilazione rapportino"}
                </span>
                <span className="text-xs text-slate-400">
                  {isCoreDrive
                    ? "Memoria lunga del cantiere · rapportini v1 garantiti"
                    : "Dati strutturati, pronti per l’Ufficio e la Direzione."}
                </span>
              </div>
            </div>

            {/* Panneau principal : Rapportino ou CORE Drive via Outlet */}
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
