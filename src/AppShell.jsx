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

  // CORE 1.0: CAPO dark-only
  const isDark = true;

  const pathname = location.pathname || "";
  const isCoreDrive = pathname.startsWith("/app/archive");
  const pageLabel = isCoreDrive ? "CORE Drive" : "Rapportino";

  // Sidebar dynamique (compact par défaut + peek hover)
  const [sidebarPeek, setSidebarPeek] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const v = window.localStorage.getItem("core-sidebar-collapsed");
      if (v === "1" || v === "0") return v === "1";
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "core-sidebar-collapsed",
        sidebarCollapsed ? "1" : "0"
      );
    } catch {}
  }, [sidebarCollapsed]);

  const effectiveCollapsed = sidebarCollapsed && !sidebarPeek;

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Errore logout:", err);
    } finally {
      navigate("/login");
    }
  };

  const displayName = useMemo(() => {
    return (
      profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      "Capo"
    );
  }, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo…
      </div>
    );
  }

  const driveTopGlow = isCoreDrive
    ? "bg-gradient-to-r from-violet-950/55 via-slate-950/35 to-slate-950/20"
    : "bg-transparent";

  return (
    <div
      className={[
        "min-h-screen flex flex-col",
        coreLayout.pageShell(isDark),
      ].join(" ")}
    >
      {/* TOP BAR — cockpit: aucune commande à gauche */}
      <header
        className={[
          "no-print sticky top-0 z-30 border-b backdrop-blur",
          "h-11 md:h-12",
          "flex items-center justify-between",
          "px-3 sm:px-4 md:px-6",
          coreLayout.header(isDark),
          driveTopGlow,
        ].join(" ")}
      >
        {/* Left: identité minimale */}
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
            CAPO
          </span>

          <span className="text-slate-700">·</span>

          <span
            className={[
              "text-[14px] md:text-[15px] font-semibold truncate",
              isCoreDrive ? "text-violet-100" : "text-slate-100",
            ].join(" ")}
            title={pageLabel}
          >
            {pageLabel}
          </span>
        </div>

        {/* Right: contrôles uniquement */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center" title="Connessione">
            <ConnectionIndicator compact />
          </div>

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
              "rounded-full border",
              "px-2.5 py-1",
              "text-[11px] font-medium",
              "border-rose-500/80 text-rose-100 hover:bg-rose-600/20",
              "transition-colors",
            ].join(" ")}
            title="Logout"
            aria-label="Logout"
          >
            <span
              className={themeIconBg(
                isDark,
                "neutral",
                "h-4 w-4 text-[9px] border-slate-700"
              )}
            >
              ⏻
            </span>
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* SIDEBAR — premium, toggle dans la sidebar (pas dans top bar) */}
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
          <div className={["mb-3", effectiveCollapsed ? "px-0" : "px-1"].join(" ")}>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className={[
                "w-full inline-flex items-center gap-2",
                "rounded-xl border px-3 py-2",
                "text-[11px] uppercase tracking-[0.18em]",
                "transition-colors",
                "border-slate-800 bg-slate-950/20 text-slate-300 hover:bg-slate-900/35",
                effectiveCollapsed ? "justify-center px-0" : "justify-start",
              ].join(" ")}
              title={sidebarCollapsed ? "Espandi menu" : "Riduci menu"}
              aria-label={sidebarCollapsed ? "Espandi menu" : "Riduci menu"}
            >
              <span className="text-slate-400">☰</span>
              {!effectiveCollapsed && (
                <span>{sidebarCollapsed ? "Espandi" : "Compatto"}</span>
              )}
            </button>
          </div>

          <nav className={["space-y-1.5", effectiveCollapsed ? "px-0" : "px-1"].join(" ")}>
            <NavLink
              to="/app"
              end
              className={({ isActive }) =>
                [
                  corePills(isDark, "sky", "w-full flex items-center gap-2 justify-start"),
                  isActive ? "" : "opacity-85 hover:opacity-100",
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
                  corePills(isDark, "violet", "w-full flex items-center gap-2 justify-start font-semibold"),
                  isActive
                    ? "bg-violet-950/35 border-violet-500/65 text-violet-100 shadow-[0_18px_60px_rgba(139,92,246,0.18)]"
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

        {/* MAIN */}
        <main className={["flex-1 min-h-0 overflow-y-auto", coreLayout.mainBg(isDark)].join(" ")}>
          <section className="mx-auto max-w-none px-0 py-0">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
}
