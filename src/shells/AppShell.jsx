// src/shells/AppShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { useShip } from "../context/ShipContext";
import { supabase } from "../lib/supabaseClient";

import IdleSessionManager from "../auth/IdleSessionManager";
import ConnectionIndicator from "../components/ConnectionIndicator";
import CNCSSidebar from "../components/shell/CNCSSidebar";
import CNCSTopbar from "../components/shell/CNCSTopbar";

// CAPO
import CapoTodayOperatorsPanel from "../capo/CapoTodayOperatorsPanel";

/* ───────────────────────── Utils ───────────────────────── */

// Normalize human names for display (Title Case)
function toTitleCase(str = "") {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AppShell() {
  const { profile, signOut, refresh } = useAuth();
  const { resetShipContext } = useShip();
  const navigate = useNavigate();
  const location = useLocation();

  // CORE 1.0 – CAPO dark-only
  const isDark = true;

  /* ───────────────────────── Route label ───────────────────────── */

  const pathname = location.pathname || "";
  const isCoreDrive =
    pathname.startsWith("/app/core-drive") ||
    pathname.startsWith("/app/archive");
  const isKpi = pathname.startsWith("/app/kpi-operatori");

  const pageLabel = isCoreDrive
    ? "CORE Drive"
    : isKpi
    ? "KPI Operatori"
    : "Rapportino";

  /* ───────────────────────── Sidebar state ───────────────────────── */

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

  /* ───────────────────────── Drag token (CAPO) ───────────────────────── */

  const [opDropToken, setOpDropToken] = useState(0);

  /* ───────────────────────── Logout ───────────────────────── */

  const handleLogout = async () => {
    try {
      await signOut({ reason: "user_logout" });
    } catch (err) {
      console.error("Errore logout:", err);
    } finally {
      try {
        resetShipContext();
      } catch {}
      navigate("/login");
    }
  };

  /* ───────────────────────── Display name (Title Case) ───────────────────────── */

  const displayName = useMemo(() => {
    const raw =
      profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      "Capo";

    return toTitleCase(raw);
  }, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo…
      </div>
    );
  }

  /* ───────────────────────── Layout constants ───────────────────────── */

  const contentWrapClass = "w-full max-w-[1480px] mx-auto space-y-4";

  return (
    <>
      {/* ───────────── Idle / Session security ───────────── */}
      <IdleSessionManager
        enabled
        warnAfterMs={25 * 60 * 1000}
        logoutAfterMs={30 * 60 * 1000}
        onExtend={async () => {
          try {
            await supabase.auth.getSession();
            await refresh();
          } catch {}
        }}
        onBeforeLogout={async (reason) => {
          try {
            window.dispatchEvent(
              new CustomEvent("core:idle-before-logout", {
                detail: { reason },
              })
            );
          } catch {}
        }}
        onLogout={async (reason) => {
          try {
            await signOut({ reason: reason || "idle_timeout" });
          } finally {
            try {
              resetShipContext();
            } catch {}
            navigate("/login");
          }
        }}
      />

      {/* ───────────── App shell ───────────── */}
      <div className="min-h-screen bg-[#050910] text-slate-100">
        <div className="flex min-h-screen">
          {/* SIDEBAR */}
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
                onOperatorDragStart={() =>
                  setOpDropToken((v) => v + 1)
                }
              />
            }
            bottomSlotCollapsed={
              <CapoTodayOperatorsPanel
                mode="collapsed"
                onOperatorDragStart={() =>
                  setOpDropToken((v) => v + 1)
                }
              />
            }
          />

          {/* MAIN */}
          <main className="flex-1 min-w-0 flex flex-col">
            {/* TOPBAR */}
            <div className="sticky top-0 z-[200] px-3 sm:px-4 pt-3">
              <CNCSTopbar
                isDark={isDark}
                kickerLeft={<ConnectionIndicator />}
                title={pageLabel}
                right={
                  <div className="flex items-center gap-2">
                    {/* User name — Title Case */}
                    <span
                      className={[
                        "inline-flex items-center gap-2 rounded-xl border px-3 py-2",
                        "border-slate-800 bg-[#050910]/60 text-slate-200",
                        "normal-case tracking-normal text-sm font-medium",
                        "max-w-[220px] truncate",
                      ].join(" ")}
                      title={displayName}
                    >
                      {displayName}
                    </span>

                    {/* Logout */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={[
                        "inline-flex items-center gap-2 rounded-xl border px-3 py-2",
                        "border-rose-900/50 bg-[#050910]/60 text-rose-200",
                        "hover:bg-rose-900/25 transition",
                        "text-xs font-semibold tracking-[0.18em] uppercase",
                      ].join(" ")}
                      title="Logout"
                      aria-label="Logout"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      LOGOUT
                    </button>
                  </div>
                }
              />
            </div>

            {/* CONTENT */}
            <div className="flex-1 min-h-0 overflow-auto">
              <div className={`${contentWrapClass} px-3 sm:px-4 pb-6`}>
                <Outlet context={{ opDropToken }} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
