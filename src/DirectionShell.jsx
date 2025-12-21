// src/DirectionShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";

import { useAuth } from "./auth/AuthProvider";
import DirectionDashboard from "./components/DirectionDashboard";
import ArchivePage from "./pages/Archive";
import CorePresentationPopup from "./components/CorePresentationPopup";
import CorePresentation from "./pages/CorePresentation";
import CapoPresentation from "./pages/CapoPresentation";

import UfficioRapportiniList from "./ufficio/UfficioRapportiniList";
import UfficioRapportinoDetail from "./ufficio/UfficioRapportinoDetail";
import UfficioIncaHub from "./ufficio/UfficioIncaHub";

import CNCSSidebar from "./components/shell/CNCSSidebar";

/* =========================
   Theme init
   ========================= */
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

/* =========================
   Ufficio View (inside Direzione)
   ========================= */
function UfficioView({ isDark }) {
  const location = useLocation();
  const isHere = (path) => location.pathname === path || location.pathname.startsWith(path + "/");
  const j = (...p) => p.filter(Boolean).join(" ");

  const tabBase =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition";
  const tabOff = isDark
    ? "border-slate-800 bg-slate-950/20 text-slate-300 hover:bg-slate-900/35"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  const tabOn = isDark
    ? "border-emerald-500/60 bg-emerald-950/20 text-emerald-200 shadow-[0_16px_60px_rgba(16,185,129,0.14)]"
    : "border-emerald-400 bg-emerald-50 text-emerald-800";

  const isTabRapportini =
    isHere("/direction/ufficio-view") &&
    !isHere("/direction/ufficio-view/inca") &&
    !isHere("/direction/ufficio-view/core-drive");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
            Direzione · Vista Ufficio (lettura)
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-slate-100">
            Controllo operativo sullo stesso dato
          </div>
          <div className="text-[12px] sm:text-[13px] text-slate-400 max-w-3xl leading-relaxed">
            Vista integrata: non esci mai dalla Direzione.
          </div>
        </div>

        <Link
          to="/direction"
          className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40"
        >
          ← Torna a Direzione
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link to="/direction/ufficio-view" className={j(tabBase, isTabRapportini ? tabOn : tabOff)}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Rapportini
        </Link>

        <Link
          to="/direction/ufficio-view/inca"
          className={j(tabBase, isHere("/direction/ufficio-view/inca") ? tabOn : tabOff)}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          INCA
        </Link>

        <Link
          to="/direction/ufficio-view/core-drive"
          className={j(tabBase, isHere("/direction/ufficio-view/core-drive") ? tabOn : tabOff)}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          CORE Drive
        </Link>

        <span className="ml-1 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Lettura
        </span>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-[#050910] overflow-hidden">
        <div className="p-4 sm:p-5">
          <Routes>
            <Route path="/" element={<UfficioRapportiniList />} />
            <Route path="rapportini/:id" element={<UfficioRapportinoDetail />} />
            <Route path="inca" element={<UfficioIncaHub />} />

            {/* CANONIQUE */}
            <Route path="core-drive" element={<ArchivePage />} />
            {/* ALIAS legacy (non UX) : redirection */}
            <Route path="archive" element={<Navigate to="../core-drive" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Direction Shell
   ========================= */
export default function DirectionShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const [theme, setTheme] = useState(getInitialTheme());
  const isDark = theme === "dark";

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPeek, setSidebarPeek] = useState(false);

  // Presentation modal state
  const [showPresentationModal, setShowPresentationModal] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem("core-theme", theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("core-sidebar-collapsed-direction");
      if (stored === "1") setSidebarCollapsed(true);
      if (stored === "0") setSidebarCollapsed(false);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("core-sidebar-collapsed-direction", sidebarCollapsed ? "1" : "0");
    } catch {}
  }, [sidebarCollapsed]);

  // Show modal only once (unless dismissed)
  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem("core-presentation-dismissed");
      if (dismissed === "1") return;

      const lastSeen = window.localStorage.getItem("core-presentation-last-seen");
      if (!lastSeen) setShowPresentationModal(true);
    } catch {
      // ignore
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate("/login");
    }
  };

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

  const roleLabel = useMemo(() => {
    const r = profile?.role || "";
    return r ? String(r).toUpperCase() : "DIREZIONE";
  }, [profile?.role]);

  const pathname = location.pathname || "";
  const isInPresentation = pathname.startsWith("/direction/presentazione");
  const isInCapoPresentation = pathname.startsWith("/direction/presentazione/capo");

  // Page label (Topbar)
  const pageLabel = useMemo(() => {
    if (pathname.startsWith("/direction/core-drive") || pathname.startsWith("/direction/archive")) return "CORE Drive";
    if (pathname.startsWith("/direction/ufficio-view")) return "Vista Ufficio";
    if (pathname.startsWith("/direction/presentazione")) return "Presentazione";
    return "Dashboard Direzione";
  }, [pathname]);

  const driveTopGlow =
    pathname.startsWith("/direction/core-drive") || pathname.startsWith("/direction/archive")
      ? "bg-gradient-to-r from-violet-950/55 via-slate-950/35 to-slate-950/20"
      : "bg-transparent";

  return (
    <div className={isDark ? "min-h-screen bg-[#050910] text-slate-100" : "min-h-screen bg-slate-50 text-slate-900"}>
      <div className="flex">
        {/* SIDEBAR — unified with Ufficio/App (collapse + peek) */}
        <CNCSSidebar
          isDark={isDark}
          title="Direzione"
          roleLabel={roleLabel}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          sidebarPeek={sidebarPeek}
          setSidebarPeek={setSidebarPeek}
          navItems={[
            { to: "/direction", label: "Dashboard", icon: "dashboard", colorClass: "text-sky-400", end: true },
            { to: "/direction/presentazione", label: "Presentazione", icon: "presentation", colorClass: "text-violet-400" },
            { to: "/direction/ufficio-view", label: "Vista Ufficio", icon: "ufficio", colorClass: "text-emerald-400" },
            { to: "/direction/core-drive", label: "CORE Drive", icon: "archive", colorClass: "text-amber-400" },
          ]}
        />

        {/* MAIN */}
        <main className="flex-1 px-4 sm:px-6 py-6">
          {/* TOP BAR — same family as others */}
          <header
            className={[
              "no-print sticky top-0 z-30 rounded-2xl border backdrop-blur px-3 py-2",
              isDark ? "border-slate-800 bg-[#050910]/70" : "border-slate-200 bg-white/70",
              driveTopGlow,
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500 truncate">
                  DIREZIONE · CNCS / CORE
                </div>
                <div className={["text-sm font-semibold truncate", isDark ? "text-slate-100" : "text-slate-900"].join(" ")} title={pageLabel}>
                  {pageLabel}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-900/25 transition"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                Logout
              </button>
            </div>
          </header>

          {/* PRESENTATION CONTEXT BAR (restore CAPO button) */}
          {isInPresentation ? (
            <div className="no-print mt-3 rounded-2xl border border-slate-800 bg-slate-950/20 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Presentazione</div>

                <div className="flex items-center gap-2">
                  {!isInCapoPresentation ? (
                    <Link
                      to="/direction/presentazione/capo"
                      className="
                        relative rounded-full px-4 py-2
                        text-[11px] uppercase tracking-[0.22em] font-semibold
                        text-sky-100
                        bg-sky-500/15
                        border border-sky-400/60
                        shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_10px_30px_rgba(56,189,248,0.15)]
                        hover:bg-sky-500/25
                        hover:shadow-[0_0_0_1px_rgba(56,189,248,0.45),0_16px_40px_rgba(56,189,248,0.25)]
                        transition-all duration-200
                      "
                      title="Apri Vista CAPO (solo lettura)"
                    >
                      Vista CAPO · solo lettura
                    </Link>
                  ) : (
                    <Link
                      to="/direction/presentazione"
                      className="rounded-full border border-slate-800 bg-slate-950/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/35"
                      title="Torna a Presentazione"
                    >
                      ← Torna a Presentazione
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="max-w-6xl mx-auto space-y-4 pt-4">
            <Routes>
              <Route path="/" element={<DirectionDashboard isDark={isDark} />} />
              <Route path="presentazione" element={<CorePresentation />} />
              <Route path="presentazione/capo" element={<CapoPresentation />} />
              <Route path="ufficio-view/*" element={<UfficioView isDark={isDark} />} />

              {/* CANONIQUE */}
              <Route path="core-drive" element={<ArchivePage />} />
              {/* ALIAS legacy (non UX) : redirection */}
              <Route path="archive" element={<Navigate to="core-drive" replace />} />
            </Routes>
          </div>

          {/* POPUP — only when needed */}
          {showPresentationModal && (
            <CorePresentationPopup onOpen={handleOpenPresentation} onClose={handleDismissPresentation} />
          )}
        </main>
      </div>
    </div>
  );
}
