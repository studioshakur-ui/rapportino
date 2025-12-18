// src/DirectionShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, Routes, Route } from "react-router-dom";

import { useAuth } from "./auth/AuthProvider";
import ConnectionIndicator from "./components/ConnectionIndicator";
import DirectionDashboard from "./components/DirectionDashboard";
import ArchivePage from "./pages/Archive";
import CorePresentationPopup from "./components/CorePresentationPopup";
import CorePresentation from "./pages/CorePresentation";

import UfficioRapportiniList from "./ufficio/UfficioRapportiniList";
import UfficioRapportinoDetail from "./ufficio/UfficioRapportinoDetail";
import UfficioIncaHub from "./ufficio/UfficioIncaHub";

import { corePills, themeIconBg } from "./ui/designSystem";

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem("core-theme");
    if (stored === "dark" || stored === "light") return stored;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch {}
  return "dark";
}

function UfficioView({ isDark }) {
  const location = useLocation();
  const isHere = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const tabBase =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition";
  const tabOff = isDark
    ? "border-slate-800 bg-slate-950/20 text-slate-300 hover:bg-slate-900/35"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  const tabOnRap = isDark
    ? "border-emerald-500/60 bg-emerald-950/20 text-emerald-200 shadow-[0_16px_60px_rgba(16,185,129,0.14)]"
    : "border-emerald-400 bg-emerald-50 text-emerald-800";
  const tabOnInca = isDark
    ? "border-sky-500/60 bg-sky-950/20 text-sky-200 shadow-[0_16px_60px_rgba(56,189,248,0.14)]"
    : "border-sky-400 bg-sky-50 text-sky-800";
  const tabOnDrive = isDark
    ? "border-violet-500/65 bg-violet-950/25 text-violet-200 shadow-[0_18px_60px_rgba(139,92,246,0.14)]"
    : "border-violet-400 bg-violet-50 text-violet-800";

  const isTabRapportini =
    isHere("/direction/ufficio-view") &&
    !isHere("/direction/ufficio-view/inca") &&
    !isHere("/direction/ufficio-view/archive");

  return (
    <div className="space-y-4">
      {/* Header minimal */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={corePills(isDark, "neutral", "px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]")}>
            Ufficio View
          </span>
          <span className={corePills(isDark, "neutral", "px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]")}>
            READ
          </span>
        </div>

        <Link
          to="/direction"
          className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40"
        >
          ← Direzione
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/direction/ufficio-view"
          className={[tabBase, isTabRapportini ? tabOnRap : tabOff].join(" ")}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Rapportini
        </Link>

        <Link
          to="/direction/ufficio-view/inca"
          className={[tabBase, isHere("/direction/ufficio-view/inca") ? tabOnInca : tabOff].join(" ")}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          INCA
        </Link>

        <Link
          to="/direction/ufficio-view/archive"
          className={[tabBase, isHere("/direction/ufficio-view/archive") ? tabOnDrive : tabOff].join(" ")}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          CORE Drive
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-[#050910] overflow-hidden">
        <div className="p-4 sm:p-5">
          <Routes>
            <Route path="/" element={<UfficioRapportiniList />} />
            <Route path="rapportini/:id" element={<UfficioRapportinoDetail />} />
            <Route path="inca" element={<UfficioIncaHub />} />
            <Route path="archive" element={<ArchivePage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function DirectionShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const [theme, setTheme] = useState(getInitialTheme());
  const isDark = theme === "dark";

  useEffect(() => {
    try {
      window.localStorage.setItem("core-theme", theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme((c) => (c === "dark" ? "light" : "dark"));

  // Sidebar dynamique
  const [sidebarPeek, setSidebarPeek] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const stored = window.localStorage.getItem("core-sidebar-collapsed-direction");
      if (stored === "1" || stored === "0") return stored === "1";
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "core-sidebar-collapsed-direction",
        sidebarCollapsed ? "1" : "0"
      );
    } catch {}
  }, [sidebarCollapsed]);

  const effectiveCollapsed = sidebarCollapsed && !sidebarPeek;

  const [showPresentationModal, setShowPresentationModal] = useState(false);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem("core-presentation-dismissed");
      if (dismissed === "1") return;
      const lastSeen = window.localStorage.getItem("core-presentation-last-seen");
      if (!lastSeen) setShowPresentationModal(true);
    } catch {}
  }, []);

  const handleOpenPresentation = () => {
    try {
      window.localStorage.setItem("core-presentation-last-seen", String(Date.now()));
    } catch {}
    setShowPresentationModal(false);
    navigate("/direction/presentazione");
  };

  const handleDismissPresentation = () => {
    try {
      window.localStorage.setItem("core-presentation-dismissed", "1");
    } catch {}
    setShowPresentationModal(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Errore logout direzione:", err);
    } finally {
      navigate("/login");
    }
  };

  const displayName = useMemo(() => {
    return profile?.display_name || profile?.full_name || profile?.email || "Direzione";
  }, [profile]);

  const pathname = location.pathname || "";
  const isCoreDrive = pathname.startsWith("/direction/archive");
  const pageLabel = isCoreDrive ? "CORE Drive" : "Direzione";

  const isActive = (path) => {
    const p = location.pathname || "";
    if (path === "/direction") return p === "/direction" || p === "/direction/";
    return p === path || p.startsWith(path + "/");
  };

  const navBtn = (active, variant) => {
    const base =
      "w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors";
    if (!active) {
      return isDark
        ? `${base} border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900/35`
        : `${base} border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50`;
    }
    if (variant === "drive") {
      return isDark
        ? `${base} bg-violet-950/30 border-violet-500/65 text-violet-100 shadow-[0_18px_60px_rgba(139,92,246,0.14)]`
        : `${base} bg-violet-50 border-violet-400 text-violet-900`;
    }
    if (variant === "ufficio") {
      return isDark
        ? `${base} bg-emerald-950/20 border-emerald-500/60 text-emerald-100`
        : `${base} bg-emerald-50 border-emerald-400 text-emerald-900`;
    }
    return isDark
      ? `${base} bg-sky-950/20 border-sky-500/55 text-slate-100`
      : `${base} bg-sky-50 border-sky-400 text-slate-900`;
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo…
      </div>
    );
  }

  const driveTopGlow = isCoreDrive
    ? "bg-gradient-to-r from-violet-950/45 via-[#050910]/25 to-[#050910]/10"
    : "bg-transparent";

  return (
    <div className={isDark ? "min-h-screen text-slate-100 bg-[#050910]" : "min-h-screen bg-slate-50 text-slate-900"}>
      {/* TOP BAR — 1 ligne, Logout top-right */}
      <header
        className={[
          "no-print sticky top-0 z-30 border-b backdrop-blur",
          "h-12 md:h-14",
          "flex items-center justify-between",
          "px-3 sm:px-4 md:px-6",
          isDark ? "border-slate-800/80 bg-[#050910]/70" : "border-slate-200 bg-white/70",
          driveTopGlow,
        ].join(" ")}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className={[
              "hidden md:inline-flex items-center justify-center",
              "h-9 w-9 rounded-full border transition-colors",
              isDark
                ? "border-slate-800 text-slate-200 hover:bg-slate-900/40"
                : "border-slate-200 text-slate-800 hover:bg-slate-50",
            ].join(" ")}
            aria-label={effectiveCollapsed ? "Espandi menu" : "Riduci menu"}
            title={effectiveCollapsed ? "Espandi menu" : "Riduci menu"}
          >
            ☰
          </button>

          <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500 whitespace-nowrap">
            CORE
          </span>

          <span className={corePills(isDark, "sky", "px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]")}>
            DIREZIONE
          </span>

          <span className={isDark ? "text-slate-700" : "text-slate-300"}>·</span>

          <span
            className={[
              "text-[14px] md:text-[15px] font-semibold truncate",
              isCoreDrive ? (isDark ? "text-violet-100" : "text-violet-800") : isDark ? "text-slate-100" : "text-slate-900",
            ].join(" ")}
            title={pageLabel}
          >
            {pageLabel}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
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
              "rounded-full border px-2.5 py-1",
              "text-[11px] font-medium transition-colors",
              isDark
                ? "border-rose-500/80 text-rose-100 hover:bg-rose-600/20"
                : "border-rose-400 text-rose-700 hover:bg-rose-50",
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

      <div className="flex">
        {/* SIDEBAR — premium, compacte */}
        <aside
          className={[
            "no-print border-r hidden md:flex md:flex-col",
            isDark ? "border-slate-800 bg-[#050910]" : "border-slate-200 bg-white",
            effectiveCollapsed ? "w-[84px] px-2 py-4" : "w-64 px-3 py-4",
            "transition-[width] duration-200",
          ].join(" ")}
          onMouseEnter={() => setSidebarPeek(true)}
          onMouseLeave={() => setSidebarPeek(false)}
          onFocusCapture={() => setSidebarPeek(true)}
          onBlurCapture={() => setSidebarPeek(false)}
        >
          <nav className={["space-y-1.5", effectiveCollapsed ? "px-0" : "px-1"].join(" ")}>
            <Link to="/direction" className={navBtn(isActive("/direction"))}>
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              {!effectiveCollapsed && <span>Dashboard</span>}
            </Link>

            <Link to="/direction/presentazione" className={navBtn(isActive("/direction/presentazione"))}>
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              {!effectiveCollapsed && <span>Presentazione</span>}
            </Link>

            <Link to="/direction/ufficio-view" className={navBtn(isActive("/direction/ufficio-view"), "ufficio")}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {!effectiveCollapsed && <span>Ufficio View</span>}
            </Link>

            <Link to="/direction/archive" className={navBtn(isActive("/direction/archive"), "drive")}>
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.45)]" />
              {!effectiveCollapsed && <span>CORE Drive</span>}
            </Link>
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] text-slate-600">
            <div>CORE</div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 px-4 sm:px-6 py-6">
          <div className="max-w-6xl mx-auto space-y-4">
            <Routes>
              <Route path="/" element={<DirectionDashboard isDark={isDark} />} />
              <Route path="presentazione" element={<CorePresentation />} />
              <Route path="ufficio-view/*" element={<UfficioView isDark={isDark} />} />
              <Route path="archive" element={<ArchivePage />} />
            </Routes>
          </div>

          {showPresentationModal && (
            <CorePresentationPopup onOpen={handleOpenPresentation} onClose={handleDismissPresentation} />
          )}
        </main>
      </div>
    </div>
  );
}
