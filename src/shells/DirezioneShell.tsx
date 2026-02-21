// src/shells/DirezioneShell.tsx
import { useEffect, useMemo, useState  } from "react";
import { Link, useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import DirezioneDashboard from "../components/DirezioneDashboard";
import DirezioneOperatorKPI from "../features/kpi/pages/DirezioneOperatorKPI";
import ArchivePage from "../pages/Archive";
import CorePresentationPopup from "../components/CorePresentationPopup";
import CorePresentation from "../pages/CorePresentation";
import CapoPresentation from "../pages/CapoPresentation";


import UfficioRapportiniList from "../ufficio/UfficioRapportiniList";
import UfficioRapportinoDetail from "../ufficio/UfficioRapportinoDetail";
import UfficioIncaHub from "../ufficio/UfficioIncaHub";

import CNCSSidebar from "../components/shell/CNCSSidebar";
import CNCSTopbar from "../components/shell/CNCSTopbar";

// NEW
import Evoluzione from "../data/Evoluzione";

type ThemeMode = "dark" | "light";

/* =========================
   Theme init
   ========================= */
function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem("core-theme");
    if (stored === "dark" || stored === "light") return stored;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
  } catch {
    // ignore
  }
  return "dark";
}

function joinClass(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* =========================
   Ufficio View (within Direzione)
   ========================= */
function UfficioView({ isDark }: { isDark: boolean }): JSX.Element {
  const location = useLocation();

  const isHere = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const tabBase =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition";
  const tabOff = isDark
    ? "border-slate-800 bg-slate-950/20 text-slate-300 hover:bg-slate-900/35"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  const tabOn = isDark
    ? "border-emerald-500/60 bg-emerald-950/20 text-emerald-200 shadow-[0_16px_60px_rgba(16,185,129,0.14)]"
    : "border-emerald-400 bg-emerald-50 text-emerald-800";

  const isTabRapportini =
    isHere("/direzione/ufficio-view") &&
    !isHere("/direzione/ufficio-view/inca") &&
    !isHere("/direzione/ufficio-view/core-drive");

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
          to="/direzione"
          className="rounded-full border border-slate-700 bg-slate-950/30 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/40"
        >
          ← Torna a Direzione
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/direzione/ufficio-view"
          className={joinClass(tabBase, isTabRapportini ? tabOn : tabOff)}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Rapportini
        </Link>

        <Link
          to="/direzione/ufficio-view/inca"
          className={joinClass(tabBase, isHere("/direzione/ufficio-view/inca") ? tabOn : tabOff)}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          INCA
        </Link>

        <Link
          to="/direzione/ufficio-view/core-drive"
          className={joinClass(tabBase, isHere("/direzione/ufficio-view/core-drive") ? tabOn : tabOff)}
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
            {/* ALIAS legacy (non UX) : reDirezione */}
            <Route path="archive" element={<Navigate to="../core-drive" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Direzione Shell
   ========================= */
export default function DirezioneShell(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const [theme] = useState<ThemeMode>(getInitialTheme());
  const isDark = theme === "dark";

  // Sidebar state (same behaviour as Ufficio/App: collapsed + hover-peek)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const v = window.localStorage.getItem("core-sidebar-collapsed-Direzione");
      if (v === "1" || v === "0") return v === "1";
    } catch {
      // ignore
    }
    return false;
  });
  const [sidebarPeek, setSidebarPeek] = useState<boolean>(false);

  // Presentation modal state
  const [showPresentationModal, setShowPresentationModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      window.localStorage.setItem("core-theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem("core-sidebar-collapsed-Direzione", sidebarCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
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
    } catch {
      // ignore
    }
    setShowPresentationModal(false);
    navigate("/direzione/presentazione");
  };

  const handleDismissPresentation = () => {
    try {
      window.localStorage.setItem("core-presentation-dismissed", "1");
    } catch {
      // ignore
    }
    setShowPresentationModal(false);
  };

  const roleLabel = useMemo(() => {
    const r = String(profile?.app_role || "DIREZIONE");
    return r ? r.toUpperCase() : "DIREZIONE";
  }, [profile?.app_role]);

  const pathname = location.pathname || "";
  const isInPresentation = pathname.startsWith("/direzione/presentazione");
  const isInCapoPresentation = pathname.startsWith("/direzione/presentazione/capo");
  const isInUfficioView = pathname.startsWith("/direzione/ufficio-view");

  const topTitle = useMemo(() => {
    if (pathname.startsWith("/direzione/evoluzione")) return "Suivi & Evoluzione";
    if (pathname.startsWith("/direzione/kpi-operatori")) return "KPI Operatori";
    if (pathname.startsWith("/direzione/presentazione")) return "Presentazione";
    if (pathname.startsWith("/direzione/ufficio-view")) return "Vista Ufficio";
    if (pathname.startsWith("/direzione/core-drive") || pathname.startsWith("/direzione/archive")) return "CORE Drive";
    return "Dashboard Direzione";
  }, [pathname]);

  return (
    <div className={isDark ? "min-h-screen bg-[#050910] text-slate-100" : "min-h-screen bg-slate-50 text-slate-900"}>
      <div className="flex">
        {/* SIDEBAR (CNCS, shared behaviour) */}
        <CNCSSidebar
          isDark={isDark}
          title="CNCS"
          subtitle="Direzione"
          roleLabel={roleLabel}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          sidebarPeek={sidebarPeek}
          setSidebarPeek={setSidebarPeek}
          storageKey="core-sidebar-collapsed-Direzione"
          navItems={[
            { to: "/direzione", label: "Dashboard", icon: "dashboard", colorClass: "text-sky-400", end: true },
            { to: "/direzione/kpi-operatori", label: "KPI Operatori", icon: "chart", colorClass: "text-emerald-400" },
            { to: "/direzione/presentazione", label: "Presentazione", icon: "presentation", colorClass: "text-violet-400" },
            { to: "/direzione/ufficio-view", label: "Vista Ufficio", icon: "ufficio", colorClass: "text-emerald-400" },
            { to: "/direzione/evoluzione", label: "Evoluzione", icon: "history", colorClass: "text-amber-400" },
            { to: "/direzione/core-drive", label: "CORE Drive", icon: "archive", colorClass: "text-amber-400" },
          ]}
        />

        {/* MAIN */}
        <main className="flex-1 px-4 sm:px-6 py-6">
          {/* TOP BAR (CNCS unified) */}
          <CNCSTopbar
            isDark={isDark}
            kickerLeft="DIREZIONE · CNCS / CORE"
            title={topTitle}
            right={
              <>
                {isInUfficioView ? (
                  <Link
                    to="/direzione"
                    className="rounded-full border border-slate-800 bg-slate-950/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-200 hover:bg-slate-900/35"
                    title="Torna a Direzione"
                  >
                    ← Torna a Direzione
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-900/25 transition"
                  title="Logout"
                  aria-label="Logout"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  Logout
                </button>
              </>
            }
          />

          {/* PRESENTATION CONTEXT BAR (CAPO button) */}
          {isInPresentation ? (
            <div className="no-print mt-3 rounded-2xl border border-slate-800 bg-slate-950/20 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Presentazione</div>

                <div className="flex items-center gap-2">
                  {!isInCapoPresentation ? (
                    <Link
                      to="/direzione/presentazione/capo"
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
                      to="/direzione/presentazione"
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
              <Route path="/" element={<DirezioneDashboard isDark={isDark} />} />
              <Route path="kpi-operatori" element={<DirezioneOperatorKPI isDark={isDark} />} />

              <Route path="presentazione" element={<CorePresentation />} />
              <Route path="presentazione/capo" element={<CapoPresentation />} />

              {/* NEW */}
              <Route path="evoluzione" element={<Evoluzione />} />

              <Route path="ufficio-view/*" element={<UfficioView isDark={isDark} />} />

              {/* CANONIQUE */}
              <Route path="core-drive" element={<ArchivePage />} />
              {/* ALIAS legacy (non UX) : reDirezione */}
              <Route path="archive" element={<Navigate to="core-drive" replace />} />
            </Routes>
          </div>

          {/* POPUP — only when needed */}
          {showPresentationModal ? (
            <CorePresentationPopup onOpen={handleOpenPresentation} onClose={handleDismissPresentation} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

