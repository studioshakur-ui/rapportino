// src/AppShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import ConnectionIndicator from "./components/ConnectionIndicator";
import { coreLayout } from "./ui/coreLayout";
import { corePills } from "./ui/designSystem";

export default function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isDark = true;

  const pathname = location.pathname;
  const isCoreDrive = pathname.startsWith("/app/archive");
  const isRapportino = !isCoreDrive;

  // Sidebar UX:
  // - Sur la feuille Rapportino: sidebar rétractée par défaut.
  // - Hover / focus: "peek" temporaire pour lire les labels.
  const [sidebarPeek, setSidebarPeek] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const v = window.localStorage.getItem("core-sidebar-collapsed");
      if (v === "1" || v === "0") return v === "1";
    } catch {}
    return isRapportino;
  });

  useEffect(() => {
    if (isRapportino) setSidebarCollapsed(true);
  }, [isRapportino]);

  const effectiveCollapsed = (isRapportino ? true : sidebarCollapsed) && !sidebarPeek;

  useEffect(() => {
    try {
      window.localStorage.setItem("core-sidebar-collapsed", sidebarCollapsed ? "1" : "0");
    } catch {}
  }, [sidebarCollapsed]);

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
    () => profile?.display_name || profile?.full_name || profile?.email || "Capo Squadra",
    [profile]
  );

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo Capo…
      </div>
    );
  }

  return (
    <div className={["min-h-screen flex flex-col", coreLayout.pageShell(isDark)].join(" ")}>
      <header
        className={[
          "no-print border-b backdrop-blur flex items-center justify-between px-3 sm:px-4 md:px-6 py-2",
          coreLayout.header(isDark),
        ].join(" ")}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className={[
              "hidden md:inline-flex items-center justify-center",
              "w-9 h-9 rounded-full border",
              "border-slate-800 text-slate-200 hover:bg-slate-900/40",
            ].join(" ")}
            aria-label={effectiveCollapsed ? "Espandi menu" : "Riduci menu"}
            title={effectiveCollapsed ? "Espandi menu" : "Riduci menu"}
          >
            ☰
          </button>

          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              CORE · Sistema centrale di cantiere
            </div>
            <div className="text-xs text-slate-400 truncate">
              Modulo Capo ·{" "}
              <span className="font-semibold">
                {isCoreDrive ? "CORE Drive · storico tecnico" : "Compilazione rapportino digitale"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <ConnectionIndicator />

          <div className="hidden sm:flex flex-col text-right">
            <span className="text-slate-400">
              Capo: <span className="text-slate-100 font-medium">{displayName}</span>
            </span>
            <span className="text-slate-500">
              {isCoreDrive ? "Area Capo · CORE Drive" : "Area Capo · Rapportino giornaliero"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className={[
              "px-3 py-1.5 rounded-full border text-xs font-medium",
              "border-rose-500 text-rose-100 hover:bg-rose-600/20",
            ].join(" ")}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside
          className={[
            "no-print border-r flex flex-col gap-5",
            coreLayout.sidebar(isDark),
            effectiveCollapsed ? "w-[84px] px-2 py-4" : "w-64 px-3 py-4",
            "transition-[width] duration-200",
            "hidden md:flex",
          ].join(" ")}
          onMouseEnter={() => setSidebarPeek(true)}
          onMouseLeave={() => setSidebarPeek(false)}
          onFocusCapture={() => setSidebarPeek(true)}
          onBlurCapture={() => setSidebarPeek(false)}
        >
          <div className={["pb-3 border-b border-slate-800/60", effectiveCollapsed ? "px-0" : "px-1"].join(" ")}>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-1">
              {effectiveCollapsed ? "CAPO" : "Pannello Capo"}
            </div>
            {!effectiveCollapsed && (
              <div className="text-xs text-slate-300">
                Compila, rivedi e invia i rapportini giornalieri.
              </div>
            )}
          </div>

          <nav className={["py-3 space-y-1.5", effectiveCollapsed ? "px-0" : "px-1"].join(" ")}>
            <NavLink
              to="/app"
              end
              className={({ isActive }) =>
                [
                  corePills(isDark, "sky", "w-full flex items-center gap-2 justify-start"),
                  isActive ? "" : "opacity-80 hover:opacity-100",
                  effectiveCollapsed ? "justify-center px-0" : "",
                ].join(" ")
              }
              title="Rapportino di oggi"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              {!effectiveCollapsed && <span>Rapportino di oggi</span>}
            </NavLink>

            <NavLink
              to="/app/archive"
              className={({ isActive }) =>
                [
                  corePills(isDark, "violet", "w-full flex items-center gap-2 justify-start"),
                  isActive ? "" : "opacity-75 hover:opacity-100",
                  effectiveCollapsed ? "justify-center px-0" : "",
                ].join(" ")
              }
              title="CORE Drive · storico tecnico"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              {!effectiveCollapsed && <span>Archivio tecnico</span>}
            </NavLink>
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] text-slate-500">
            <div>CORE · SHAKUR Engineering</div>
            {!effectiveCollapsed && <div className="text-slate-600">Capo · Area operativa</div>}
          </div>
        </aside>

        <main className={["flex-1 min-h-0 overflow-y-auto", coreLayout.mainBg(isDark)].join(" ")}>
          <section
            className={[
              "mx-auto",
              isRapportino ? "max-w-none px-0" : "max-w-5xl px-3 sm:px-4",
              "py-0 sm:py-0",
            ].join(" ")}
          >
            {!isRapportino && (
              <div className="mb-4 flex items-center justify-between gap-3 pt-4">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {isCoreDrive ? "CORE Drive · storico certificato" : "Compilazione rapportino"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {isCoreDrive
                      ? "Memoria lunga del cantiere · rapportini v1 garantiti"
                      : "Dati strutturati, pronti per l’Ufficio e la Direzione."}
                  </span>
                </div>
              </div>
            )}

            <div
              className={[
                "border rounded-2xl overflow-hidden",
                coreLayout.primaryPanel(isDark),
                isRapportino ? "rounded-none border-0" : "",
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
