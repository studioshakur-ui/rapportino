// src/UfficioShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "./auth/AuthProvider";
import { coreLayout } from "./ui/coreLayout";

import CNCSSidebar from "./components/shell/CNCSSidebar";

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

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Errore logout ufficio:", err);
    } finally {
      navigate("/login");
    }
  };

  const displayName = useMemo(() => {
    return profile?.display_name || profile?.full_name || profile?.email || "Ufficio";
  }, [profile]);

  const pathname = location.pathname || "";
  const isInca = pathname.startsWith("/ufficio/inca");
  const isCoreDrive =
    pathname.startsWith("/ufficio/core-drive") || pathname.startsWith("/ufficio/archive");
  const pageLabel = isCoreDrive ? "CORE Drive" : isInca ? "INCA" : "Rapportini";

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
      className={
        isDark
          ? "min-h-screen bg-[#050910] text-slate-100"
          : "min-h-screen bg-slate-50 text-slate-900"
      }
    >
      <div className="flex">
        {/* SIDEBAR — unified with Direction (collapse + peek) */}
        <CNCSSidebar
          isDark={isDark}
          title="Ufficio"
          roleLabel="UFFICIO"
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          sidebarPeek={sidebarPeek}
          setSidebarPeek={setSidebarPeek}
          navItems={[
            { to: "/ufficio", label: "Rapportini", icon: "rapportini", colorClass: "text-sky-400", end: true },
            { to: "/ufficio/inca", label: "INCA", icon: "inca", colorClass: "text-emerald-400" },
            { to: "/ufficio/core-drive", label: "CORE Drive", icon: "archive", colorClass: "text-amber-400" },
          ]}
        />

        {/* MAIN — aligned with Direction */}
        <main className="flex-1 px-4 sm:px-6 py-6">
          {/* TOP BAR — Direction style, plus theme toggle */}
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
                  UFFICIO · CNCS / CORE · {displayName}
                </div>
                <div className={["text-sm font-semibold truncate", isDark ? "text-slate-100" : "text-slate-900"].join(" ")} title={pageLabel}>
                  {pageLabel}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={[
                    "inline-flex items-center justify-center",
                    "h-9 w-9 rounded-full border transition-colors",
                    isDark
                      ? "border-slate-800 bg-slate-950/20 hover:bg-slate-900/35 text-slate-200"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
                  ].join(" ")}
                  aria-label="Tema"
                  title="Tema"
                >
                  <span className="text-[12px]">{isDark ? "🌑" : "☀️"}</span>
                </button>

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
              </div>
            </div>
          </header>

          <div className={["max-w-6xl mx-auto space-y-4 pt-4", coreLayout.mainBg(isDark)].join(" ")}>
            <div
              className={[
                "border rounded-2xl overflow-hidden",
                coreLayout.primaryPanel(isDark),
              ].join(" ")}
            >
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
