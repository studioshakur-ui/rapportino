// src/AppShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import ConnectionIndicator from "./components/ConnectionIndicator";
import { coreLayout } from "./ui/coreLayout";
import { corePills, themeIconBg } from "./ui/designSystem";

export default function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // CORE 1.0: on reste sobre et stable (dark-only ici).
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

  const effectiveCollapsed =
    (isRapportino ? true : sidebarCollapsed) && !sidebarPeek;

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "core-sidebar-collapsed",
        sidebarCollapsed ? "1" : "0"
      );
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
    () =>
      profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      "Capo Squadra",
    [profile]
  );

  const pageLabel = isCoreDrive ? "Archivio" : "Rapportino";

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo…
      </div>
    );
  }

  return (
    <div className={["min-h-screen flex flex-col", coreLayout.pageShell(isDark)].join(" ")}>
      {/* TOP BAR — mince, premium, silencieuse */}
      <header
        className={[
          "no-print border-b backdrop-blur",
          "sticky top-0 z-30",
          "h-12 md:h-14",
          "flex items-center justify-between",
          "px-3 sm:px-4 md:px-6",
          coreLayout.header(isDark),
        ].join(" ")}
      >
        {/* Left: identité + contexte */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className={[
              "hidden md:inline-flex items-center justify-center",
              "h-9 w-9 rounded-full border",
              "border-slate-800 text-slate-200 hover:bg-slate-900/40",
              "transition-colors",
            ].join(" ")}
            aria-label={effectiveCollapsed ? "Espandi menu" : "Riduci menu"}
            title={effectiveCollapsed ? "Espandi menu" : "Riduci menu"}
          >
            ☰
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500 whitespace-nowrap">
              CORE
            </span>

            <span className={corePills(isDark, "sky", "px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]")}>
              CAPO
            </span>

            <span className="text-slate-600">·</span>

            <span className="text-[14px] md:text-[15px] font-semibold text-slate-100 truncate">
              {pageLabel}
            </span>
          </div>
        </div>

        {/* Right: statuts + actions (icônes / compact) */}
        <div className="flex items-center gap-2.5 text-[11px]">
          {/* ConnectionIndicator (déjà existant) */}
          <div className="flex items-center" title="Stato connessione">
            <ConnectionIndicator />
          </div>

          {/* Nom (discret) */}
          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <span
              className={corePills(
                isDark,
                "neutral",
                "max-w-[220px] truncate px-2 py-0.5 text-[10px]"
              )}
              title={displayName}
            >
              {displayName}
            </span>
          </div>

          {/* Logout compact */}
          <button
            type="button"
            onClick={handleLogout}
            className={[
              "inline-flex items-center gap-2",
              "rounded-full border",
              "px-2.5 py-1",
              "text-[11px] font-medium",
              "border-rose-500/80 text-rose-100 hover:bg-rose-600/20",
              "transition-colors",
            ].join(" ")}
            title="Logout"
            aria-label="Logout"
          >
            <span className={themeIconBg(isDark, "neutral", "h-4 w-4 text-[9px] border-slate-700")}>
              ⏻
            </span>
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar (desktop only) */}
        <aside
          className={[
            "no-print border-r flex flex-col gap-4",
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
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              {effectiveCollapsed ? "CAPO" : "Pannello"}
            </div>
          </div>

          <nav className={["py-2 space-y-1.5", effectiveCollapsed ? "px-0" : "px-1"].join(" ")}>
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
              title="Rapportino"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              {!effectiveCollapsed && <span>Rapportino</span>}
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
              title="Archivio"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              {!effectiveCollapsed && <span>Archivio</span>}
            </NavLink>
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] text-slate-500">
            <div>CORE</div>
          </div>
        </aside>

        {/* Main */}
        <main className={["flex-1 min-h-0 overflow-y-auto", coreLayout.mainBg(isDark)].join(" ")}>
          <section
            className={[
              "mx-auto",
              isRapportino ? "max-w-none px-0" : "max-w-5xl px-3 sm:px-4",
              "py-0 sm:py-0",
            ].join(" ")}
          >
            {/* En mode nettoyage: on retire les sous-textes marketing. */}
            {!isRapportino && (
              <div className="pt-4 pb-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {isCoreDrive ? "ARCHIVIO" : "RAPPORTINO"}
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
