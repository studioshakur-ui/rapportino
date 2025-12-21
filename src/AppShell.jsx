// /src/AppShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "./auth/AuthProvider";
import { coreLayout } from "./ui/coreLayout";

import CNCSSidebar from "./components/shell/CNCSSidebar";

export default function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // CORE 1.0: CAPO dark-only
  const isDark = true;

  const pathname = location.pathname || "";
  const isCoreDrive =
    pathname.startsWith("/app/core-drive") || pathname.startsWith("/app/archive");
  const pageLabel = isCoreDrive ? "CORE Drive" : "Rapportino";

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const v = window.localStorage.getItem("core-sidebar-collapsed");
      if (v === "1" || v === "0") return v === "1";
    } catch {}
    return true;
  });
  const [sidebarPeek, setSidebarPeek] = useState(false);

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
      console.error("Errore logout:", err);
    } finally {
      navigate("/login");
    }
  };

  const displayName = useMemo(() => {
    return profile?.display_name || profile?.full_name || profile?.email || "Capo";
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
    <div className={["min-h-screen", coreLayout.pageShell(isDark)].join(" ")}>
      <div className="flex">
        {/* SIDEBAR — aligned with Direction (same behavior: collapse + peek) */}
        <CNCSSidebar
          isDark={isDark}
          title="Capo"
          roleLabel="CAPO"
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          sidebarPeek={sidebarPeek}
          setSidebarPeek={setSidebarPeek}
          navItems={[
            {
              to: "/app",
              label: "Rapportino",
              icon: "rapportini",
              colorClass: "text-sky-400",
              end: true,
            },
            {
              to: "/app/core-drive",
              label: "CORE Drive",
              icon: "archive",
              colorClass: "text-amber-400",
            },
          ]}
        />

        {/* MAIN — aligned with Direction */}
        <main className="flex-1 px-4 sm:px-6 py-6">
          {/* TOP BAR — Direction style */}
          <header
            className={[
              "no-print sticky top-0 z-30 rounded-2xl border backdrop-blur px-3 py-2",
              "border-slate-800 bg-[#050910]/70",
              driveTopGlow,
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.26em] text-slate-500">
                  CAPO · CNCS / CORE · {displayName}
                </div>
                <div className="text-sm font-semibold truncate" title={pageLabel}>
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

          <div className={["max-w-6xl mx-auto pt-4", coreLayout.mainBg(isDark)].join(" ")}>
            <section className="mx-auto max-w-none px-0 py-0">
              <Outlet />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
