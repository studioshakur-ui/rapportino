// src/AppShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import ConnectionIndicator from "./components/ConnectionIndicator";
import CNCSSidebar from "./components/shell/CNCSSidebar";
import CNCSTopbar from "./components/shell/CNCSTopbar";

// NEW
import CapoTodayOperatorsPanel from "./capo/CapoTodayOperatorsPanel";

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

  const [sidebarPeek, setSidebarPeek] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const v = window.localStorage.getItem("core-sidebar-collapsed");
      if (v === "1" || v === "0") return v === "1";
    } catch {}
    return true;
  });

  // NEW: last drop target for operators (rapportino page listens)
  const [opDropToken, setOpDropToken] = useState(0);

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

  // Wider container for CAPO: récupère l’espace desktop.
  // - max-w très large + padding stable
  // - pas de "mx-auto" ultra étroit
  const contentWrapClass =
    "w-full max-w-[1480px] mx-auto space-y-4 pt-4";

  return (
    <div className="min-h-screen bg-[#050910] text-slate-100">
      <div className="flex">
        {/* SIDEBAR (CNCS unified) */}
        <CNCSSidebar
          isDark={isDark}
          title="CNCS"
          subtitle="Capo"
          roleLabel="CAPO"
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          sidebarPeek={sidebarPeek}
          setSidebarPeek={setSidebarPeek}
          storageKey="core-sidebar-collapsed"
          navItems={[
            {
              to: "/app",
              label: "Rapportino",
              icon: "rapportino",
              colorClass: "text-sky-400",
              end: true,
            },
            {
              to: "/app/core-drive",
              label: "CORE Drive",
              icon: "archive",
              colorClass: "text-violet-400",
            },
          ]}
          bottomSlot={
            <CapoTodayOperatorsPanel
              mode="expanded"
              onOperatorDragStart={() => {
                // token uniquement pour "forcer" un rerender si besoin.
                setOpDropToken((v) => v + 1);
              }}
            />
          }
          bottomSlotCollapsed={
            <CapoTodayOperatorsPanel
              mode="collapsed"
              onOperatorDragStart={() => {
                setOpDropToken((v) => v + 1);
              }}
            />
          }
        />

        {/* MAIN */}
        <main className="flex-1 px-4 sm:px-6 py-6">
          {/* TOP BAR (CNCS unified) */}
          <CNCSTopbar
            isDark={isDark}
            kickerLeft="CAPO · CNCS / CORE"
            title={pageLabel}
            right={
              <>
                <div className="flex items-center" title="Connessione">
                  <ConnectionIndicator compact />
                </div>

                <span
                  className={[
                    "hidden sm:inline-flex max-w-[220px] truncate",
                    "rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em]",
                    "border-slate-800 bg-slate-950/20 text-slate-200",
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

          <div className={contentWrapClass}>
            {/* Outlet pages */}
            <Outlet context={{ opDropToken }} />
          </div>
        </main>
      </div>
    </div>
  );
}
