// src/ManagerShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  Routes,
  Route,
} from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import ConnectionIndicator from "./components/ConnectionIndicator";

import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerAssignments from "./pages/ManagerAssignments";
import ManagerAnalytics from "./pages/ManagerAnalytics";

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
  } catch {
    // ignore
  }
  return "dark";
}

export default function ManagerShell() {
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
      console.error("Errore logout manager:", err);
    } finally {
      navigate("/login");
    }
  };

  const displayName = useMemo(
    () =>
      profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      "Manager",
    [profile]
  );

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const navItemClasses = (active) =>
    [
      "block px-2.5 py-1.5 rounded-lg text-sm transition-colors border",
      active
        ? isDark
          ? "bg-emerald-500/15 text-emerald-100 border-emerald-500/60"
          : "bg-emerald-50 text-emerald-800 border-emerald-400"
        : isDark
        ? "text-slate-300 border-transparent hover:bg-slate-900 hover:border-slate-700"
        : "text-slate-700 border-transparent hover:bg-slate-50 hover:border-slate-300",
    ].join(" ");

  const isActive = (prefix) => location.pathname.startsWith(prefix);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo Manager…
      </div>
    );
  }

  const isOnRootManager =
    location.pathname === "/manager" || location.pathname === "/manager/";

  return (
    <div
      className={[
        "min-h-screen flex flex-col",
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900",
      ].join(" ")}
    >
      {/* HEADER */}
      <header
        className={[
          "no-print sticky top-0 z-20 border-b backdrop-blur",
          isDark
            ? "bg-slate-950/95 border-slate-800"
            : "bg-white/95 border-slate-200 shadow-sm",
        ].join(" ")}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
          {/* Brand + contexte */}
          <div className="flex flex-col gap-0.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              CORE · Sistema centrale di cantiere
            </div>
            <div className="text-xs text-slate-400">
              Modulo Manager ·{" "}
              <span className="font-semibold">
                Supervisione cantieri · capi · ufficio
              </span>
            </div>
          </div>

          {/* Outils droite */}
          <div className="flex items-center gap-3 text-[11px]">
            {/* Switch Dark/Light */}
            <button
              type="button"
              onClick={toggleTheme}
              className={[
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                isDark
                  ? "border-slate-600 bg-slate-900/70 text-slate-200"
                  : "border-slate-300 bg-slate-50 text-slate-700",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-flex h-3 w-3 items-center justify-center rounded-full text-[9px]",
                  isDark ? "bg-slate-800" : "bg-amber-200",
                ].join(" ")}
              >
                {isDark ? "🌑" : "☀️"}
              </span>
              <span className="uppercase tracking-[0.16em]">
                {isDark ? "Dark" : "Light"}
              </span>
            </button>

            {/* Etat connexion */}
            <ConnectionIndicator />

            {/* User */}
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-slate-400">Utente Manager</span>
              <span className="text-slate-50 font-medium">{displayName}</span>
            </div>

            {/* Logout */}
            <button
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
        </div>
      </header>

      {/* LAYOUT */}
      <div className="flex flex-1 min-h-0">
        {/* SIDEBAR */}
        <aside
          className={[
            "no-print w-64 border-r px-3 py-4 flex flex-col gap-5",
            isDark
              ? "bg-slate-950 border-slate-800"
              : "bg-slate-50 border-slate-200",
          ].join(" ")}
        >
          {/* Bloc navigation principale */}
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">
              Pannello Manager
            </div>
            <nav className="space-y-1.5">
              <Link
                to="/manager"
                className={navItemClasses(isOnRootManager)}
              >
                Stato cantieri &amp; presenze
              </Link>
              <Link
                to="/manager/assegnazioni"
                className={navItemClasses(isActive("/manager/assegnazioni"))}
              >
                Utenti &amp; cantieri
              </Link>
              <Link
                to="/manager/analytics"
                className={navItemClasses(isActive("/manager/analytics"))}
              >
                Analitiche operative
              </Link>
            </nav>
          </div>

          {/* Liens vers altri moduli */}
          <div className="mt-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2">
              Collegamenti
            </div>
            <nav className="space-y-1.5 text-[13px]">
              <Link
                to="/ufficio"
                className={navItemClasses(isActive("/ufficio"))}
              >
                Area Ufficio · Rapportini
              </Link>
              <Link
                to="/ufficio/inca"
                className={navItemClasses(isActive("/ufficio/inca"))}
              >
                INCA · Tracciamento cavi
              </Link>
              <Link
                to="/ufficio/archive"
                className={navItemClasses(isActive("/ufficio/archive"))}
              >
                CORE Drive · Archivio tecnico
              </Link>
              <Link
                to="/direction"
                className={navItemClasses(isActive("/direction"))}
              >
                Vista Direzione
              </Link>
            </nav>
          </div>

          {/* Bas de sidebar */}
          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] text-slate-500">
            <div>CORE · SHAKUR Engineering</div>
            <div className="text-slate-600">
              Manager · Trieste · Riva Trigoso · La Spezia
            </div>
          </div>
        </aside>

        {/* CONTENT */}
        <main
          className={[
            "flex-1 min-h-0 overflow-y-auto p-4 md:p-6",
            isDark ? "bg-slate-950" : "bg-slate-100",
          ].join(" ")}
        >
          <div className="max-w-6xl mx-auto space-y-4">
            <Routes>
              <Route path="/" element={<ManagerDashboard isDark={isDark} />} />
              <Route
                path="assegnazioni"
                element={<ManagerAssignments isDark={isDark} />}
              />
              <Route
                path="analytics"
                element={<ManagerAnalytics isDark={isDark} />}
              />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
