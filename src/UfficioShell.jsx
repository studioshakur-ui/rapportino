// src/UfficioShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate, useLocation, Outlet } from "react-router-dom";
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

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Errore logout ufficio:", err);
    } finally {
      navigate("/login");
    }
  };

  const displayName = useMemo(
    () =>
      profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      "Ufficio",
    [profile]
  );

  // Sidebar dynamique (collapsed + peek)
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

  const isInca = location.pathname.startsWith("/ufficio/inca");
  const isCoreDrive = location.pathname.startsWith("/ufficio/archive");
  const pageLabel = isCoreDrive ? "CORE Drive" : isInca ? "INCA" : "Rapportini";

  const navItemClasses = (active, section) => {
    const base =
      "w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors";
    if (active) {
      if (section === "inca") {
        return isDark
          ? `${base} bg-emerald-950/20 border-emerald-500/70 text-emerald-100`
          : `${base} bg-emerald-50 border-emerald-400 text-emerald-800`;
      }
      if (section === "drive") {
        return isDark
          ? `${base} bg-violet-950/30 border-violet-500/70 text-violet-100 shadow-[0_18px_60px_rgba(139,92,246,0.14)]`
          : `${base} bg-violet-50 border-violet-400 text-violet-800`;
      }
      return isDark
        ? `${base} bg-sky-950/20 border-sky-500/70 text-sky-100`
        : `${base} bg-sky-50 border-sky-400 text-sky-800`;
    }
    return isDark
      ? `${base} border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900/35`
      : `${base} border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50`;
  };

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
        isCoreDrive ? "bg-[#070714]" : "",
      ].join(" ")}
    >
      {/* TOP BAR — mince / silencieuse */}
      <header
        className={[
          "no-print sticky top-0 z-30 border-b backdrop-blur",
          "h-12 md:h-14",
          "flex items-center justify-between",
          "px-3 sm:px-4 md:px-6",
          coreLayout.header(isDark),
          driveTopGlow,
        ].join(" ")}
      >
        {/* Left */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className={[
              "hidden md:inline-flex items-center justify-center",
              "h-9 w-9 rounded-full border",
              isDark
                ? "border-slate-800 text-slate-200 hover:bg-slate-900/40"
                : "border-slate-200 text-slate-800 hover:bg-slate-50",
              "transition-colors",
            ].join(" ")}
            aria-label={effectiveCollapsed ? "Espandi menu" : "Riduci menu"}
            title={effectiveCollapsed ? "Espandi menu" : "Riduci menu"}
          >
            ☰
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span
              className={[
                "text-[10px] uppercase tracking-[0.22em] whitespace-nowrap",
                isDark ? "text-slate-500" : "text-slate-500",
              ].join(" ")}
            >
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

            <span className={isDark ? "text-slate-700" : "text-slate-300"}>·</span>

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
        </div>

        {/* Right — actions compact + Logout top-right */}
        <div className="flex items-center gap-2.5 text-[11px]">
          <div className="flex items-center" title="Connessione">
            <ConnectionIndicator />
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className={[
              "inline-flex items-center justify-center",
              "h-9 w-9 rounded-full border",
              coreLayout.themeToggle(isDark),
              "transition-colors",
            ].join(" ")}
            aria-label="Tema"
            title="Tema"
          >
            <span className={themeIconBg(isDark, "neutral", "h-5 w-5 text-[10px]")}>
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
              "rounded-full border",
              "px-2.5 py-1",
              "text-[11px] font-medium",
              isDark
                ? "border-rose-500/80 text-rose-100 hover:bg-rose-600/20"
                : "border-rose-400 text-rose-700 hover:bg-rose-50",
              "transition-colors",
            ].join(" ")}
            title="Logout"
            aria-label="Logout"
          >
            <span className={themeIconBg(isDark, "neutral", "h-4 w-4 text-[9px]")}>
              ⏻
            </span>
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* SIDEBAR — dynamique (desktop) */}
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
          <nav className={["space-y-1.5", effectiveCollapsed ? "px-0" : "px-1"].join(" ")}>
            <NavLink
              to="/ufficio"
              end
              className={({ isActive }) =>
                [
                  navItemClasses(isActive, "rapportini"),
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
                  navItemClasses(isActive, "inca"),
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
                  navItemClasses(isActive, "drive"),
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
        <main
          className={[
            "flex-1 min-h-0 overflow-y-auto",
            coreLayout.mainBg(isDark),
            isCoreDrive ? "bg-[#070714]" : "",
          ].join(" ")}
        >
          <section className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <div
              className={[
                "border rounded-2xl overflow-hidden",
                coreLayout.primaryPanel(isDark),
                isCoreDrive ? "border-violet-500/25" : "",
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
