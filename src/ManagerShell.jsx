// src/ManagerShell.jsx
import React, { useMemo } from "react";
import { Link, useNavigate, useLocation, Routes, Route } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import ConnectionIndicator from "./components/ConnectionIndicator";

import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerAssignments from "./pages/ManagerAssignments";
import ManagerAnalytics from "./pages/ManagerAnalytics";
import ManagerCoreDrive from "./pages/ManagerCoreDrive";

export default function ManagerShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Dark-only (tu as demandé suppression light mode)
  const isDark = true;

  const displayName = useMemo(
    () =>
      profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      "Manager",
    [profile]
  );

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Errore logout manager:", err);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const pathname = location.pathname || "";
  const isOnRootManager = pathname === "/manager" || pathname === "/manager/";
  const isOnAssignments = pathname.includes("/manager/assegnazioni");
  const isOnAnalytics = pathname.includes("/manager/analytics");
  const isOnDrive = pathname.includes("/manager/drive");

  const navItemClasses = (active) =>
    [
      "block px-2.5 py-1.5 rounded-lg text-sm border transition",
      active
        ? "bg-slate-900 border-slate-700 text-slate-100"
        : "bg-slate-950/20 border-slate-800 text-slate-300 hover:bg-slate-900/40 hover:text-slate-100",
    ].join(" ");

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo Manager…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              CORE · Sistema centrale di cantiere
            </div>
            <div className="text-xs text-slate-400">
              Modulo Manager ·{" "}
              <span className="font-semibold">
                Supervisione cantieri · capi · squadre
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <ConnectionIndicator />

            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-slate-400">Utente Manager</span>
              <span className="text-slate-50 font-medium">{displayName}</span>
            </div>

            <button
              onClick={handleLogout}
              className={[
                "px-3 py-1.5 rounded-full border text-xs font-medium",
                "border-rose-500 text-rose-100 hover:bg-rose-600/20",
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
        <aside className="w-72 border-r border-slate-800 bg-slate-950 px-3 py-4 flex flex-col gap-5">
          <div className="px-1 pb-3 border-b border-slate-800/60">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-1">
              Pannello Manager
            </div>
            <div className="text-xs text-slate-300">
              Pianificazione e supervisione. Nessuna gestione account/ruoli.
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Creazione account + ruoli: <span className="text-slate-300">ADMIN</span>
            </div>
          </div>

          <nav className="px-1 py-2 space-y-1.5">
            <Link to="/manager" className={navItemClasses(isOnRootManager)}>
              Stato cantieri &amp; sintesi
            </Link>
            <Link
              to="/manager/assegnazioni"
              className={navItemClasses(isOnAssignments)}
            >
              Scopes · Capi · Squadre
            </Link>
            <Link
              to="/manager/drive"
              className={navItemClasses(isOnDrive)}
            >
              Core Drive
            </Link>
            <Link
              to="/manager/analytics"
              className={navItemClasses(isOnAnalytics)}
            >
              Analytics (operativo)
            </Link>
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] text-slate-500">
            <div>CORE · Modulo Manager</div>
            <div className="text-slate-600">Supervisione operativa</div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-slate-950">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4">
            <Routes>
              <Route path="/" element={<ManagerDashboard isDark={isDark} />} />
              <Route
                path="assegnazioni"
                element={<ManagerAssignments isDark={isDark} />}
              />
              <Route
                path="drive"
                element={<ManagerCoreDrive isDark={isDark} />}
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
