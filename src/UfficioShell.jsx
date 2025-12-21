// src/UfficioShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import ConnectionIndicator from "./components/ConnectionIndicator";
import CNCSSidebar from "./components/shell/CNCSSidebar";
import CNCSTopbar from "./components/shell/CNCSTopbar";

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
  const isCoreDrive = pathname.startsWith("/ufficio/core-drive") || pathname.startsWith("/ufficio/archive");
  const pageLabel = isCoreDrive ? "CORE Drive" : isInca ? "INCA" : "Rapportini";

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo…
      </div>
    );
  }

  return (
    <div className={isDark ? "min-h-screen bg-[#050910] text-slate-100" : "min-h-screen bg-slate-50 text-slate-900"}>
      <div className="flex">
        {/* SIDEBAR (CNCS unified) */}
        <CNCSSidebar
          isDark={isDark}
          title="CNCS"
          subtitle="Ufficio"
          roleLabel="UFFICIO"
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          sidebarPeek={sidebarPeek}
          setSidebarPeek={setSidebarPeek}
          storageKey="core-sidebar-collapsed-ufficio"
          navItems={[
            { to: "/ufficio", label: "Rapportini", icon: "rapportino", colorClass: "text-sky-400", end: true },
            { to: "/ufficio/inca", label: "INCA", icon: "inca", colorClass: "text-emerald-400" },
            { to: "/ufficio/core-drive", label: "CORE Drive", icon: "archive", colorClass: "text-violet-400" },
          ]}
        />

        {/* MAIN */}
        <main className="flex-1 px-4 sm:px-6 py-6">
          {/* TOP BAR (CNCS unified) */}
          <CNCSTopbar
            isDark={isDark}
            kickerLeft="UFFICIO · CNCS / CORE"
            title={pageLabel}
            right={
              <>
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
                  <span className="h-5 w-5 grid place-items-center text-[10px]">
                    {isDark ? "🌑" : "☀️"}
                  </span>
                </button>

                <span
                  className={[
                    "hidden sm:inline-flex max-w-[220px] truncate",
                    "rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em]",
                    isDark
                      ? "border-slate-800 bg-slate-950/20 text-slate-200"
                      : "border-slate-200 bg-white text-slate-800",
                  ].join(" ")}
                  title={displayName}
                >
                  {displayName}
                </span>

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

          <div className="max-w-6xl mx-auto space-y-4 pt-4">
            <div className="border rounded-2xl overflow-hidden border-slate-800 bg-[#050910]">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
