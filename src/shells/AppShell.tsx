// src/shells/AppShell.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { useShip } from "../context/ShipContext";
import { supabase } from "../lib/supabaseClient";
import { KeepAliveOutlet } from "../utils/KeepAliveOutlet";

import IdleSessionManager from "../auth/IdleSessionManager";
import ConnectionIndicator from "../components/ConnectionIndicator";
import CNCSSidebar from "../components/shell/CNCSSidebar";
import CNCSTopbar from "../components/shell/CNCSTopbar";
import LangSwitcher from "../components/shell/LangSwitcher";

import { useI18n } from "../i18n/I18nProvider";
import { formatDisplayName } from "../utils/formatHuman";

// CAPO
import CapoTodayOperatorsPanel from "../capo/CapoTodayOperatorsPanel";

type OutletCtx = { opDropToken: number };

type ProfileLike = unknown;

type AuthLike = {
  profile: ProfileLike | null;
  session: any | null;
  signOut: (args: { reason: string }) => Promise<void>;
  refresh: () => Promise<void>;
};

type ShipCtxLike = {
  resetShipContext: () => void;
};

function useIsMobile(breakpointPx = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${breakpointPx - 1}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [breakpointPx]);

  return isMobile;
}

function getShipIdFromPath(pathname: string): string | null {
  const m = pathname.match(/\/app\/ship\/([^/]+)(?:\/|$)/);
  if (!m) return null;
  const id = (m[1] || "").trim();
  return id ? id : null;
}

const LAST_SHIP_KEY = "core:last-ship-id";

// iOS “ghost tap” mitigation window.
// On iOS (Safari/Chrome iOS), a delayed click/touch can replay after navigation.
// We hardlock pointer events for this window to prevent tap-through.
const TAP_HARDLOCK_MS = 1100;

export default function AppShell(): JSX.Element {
  const { profile, session, signOut, refresh } = useAuth() as unknown as AuthLike;
  const { resetShipContext } = useShip() as unknown as ShipCtxLike;
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  const isDark = true;
  const isMobile = useIsMobile(768);

  const pathname = location.pathname || "";

  const isCoreDrive = pathname.startsWith("/app/core-drive") || pathname.startsWith("/app/archive");
  const isKpiOperatori = pathname.startsWith("/app/kpi-operatori");
  const isMegaKpi = pathname.includes("/kpi-stesura");
  const isInca = pathname.includes("/inca");

  const shipIdFromPath = useMemo(() => getShipIdFromPath(pathname), [pathname]);

  const resolvedShipId = useMemo(() => {
    if (shipIdFromPath) return shipIdFromPath;

    try {
      const v = window.localStorage.getItem(LAST_SHIP_KEY);
      if (v && v.trim()) return v.trim();
    } catch {
      // ignore
    }
    return null;
  }, [shipIdFromPath]);

  useEffect(() => {
    if (!shipIdFromPath) return;
    try {
      window.localStorage.setItem(LAST_SHIP_KEY, shipIdFromPath);
    } catch {
      // ignore
    }
  }, [shipIdFromPath]);

  const shipScopedFallback = "/app/ship-selector";
  const megaKpiTo = resolvedShipId ? `/app/ship/${resolvedShipId}/kpi-stesura` : shipScopedFallback;
  const incaTo = resolvedShipId ? `/app/ship/${resolvedShipId}/inca` : shipScopedFallback;

  const pageLabel = isCoreDrive
    ? t("APP_CORE_DRIVE")
    : isMegaKpi
    ? "Mega KPI · Posa"
    : isInca
    ? "INCA · Cockpit"
    : isKpiOperatori
    ? t("APP_KPI_OPERATORI")
    : t("APP_RAPPORTINO");

  const [sidebarPeek, setSidebarPeek] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const v = window.localStorage.getItem("core-sidebar-collapsed");
      if (v === "1" || v === "0") return v === "1";
    } catch {
      // ignore
    }
    return true;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("core-sidebar-collapsed", sidebarCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  const [opDropToken, setOpDropToken] = useState<number>(0);

  const outletCtx: OutletCtx = useMemo(() => ({ opDropToken }), [opDropToken]);

  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  /**
   * HARDLOCK: blocks all interactions for a short window after route changes.
   * This is the most reliable fix for iOS “tap-through / ghost click” after navigation.
   */
  const [tapHardlock, setTapHardlock] = useState<boolean>(false);

  useEffect(() => {
    setTapHardlock(true);

    const root = document.documentElement;
    const prevPointerEvents = root.style.pointerEvents;
    root.style.pointerEvents = "none";

    const tmr = window.setTimeout(() => {
      root.style.pointerEvents = prevPointerEvents;
      setTapHardlock(false);
    }, TAP_HARDLOCK_MS);

    return () => {
      window.clearTimeout(tmr);
      root.style.pointerEvents = prevPointerEvents;
      setTapHardlock(false);
    };
  }, [pathname]);

  useEffect(() => {
    if (!tapHardlock) return;

    const stop = (e: Event) => {
      try {
        e.preventDefault();
        e.stopPropagation();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any).stopImmediatePropagation?.();
      } catch {
        // ignore
      }
    };

    // Capture phase, covers iOS sequences and synthetic clicks.
    window.addEventListener("touchstart", stop, true);
    window.addEventListener("touchend", stop, true);
    window.addEventListener("pointerdown", stop, true);
    window.addEventListener("pointerup", stop, true);
    window.addEventListener("mousedown", stop, true);
    window.addEventListener("mouseup", stop, true);
    window.addEventListener("click", stop, true);

    return () => {
      window.removeEventListener("touchstart", stop, true);
      window.removeEventListener("touchend", stop, true);
      window.removeEventListener("pointerdown", stop, true);
      window.removeEventListener("pointerup", stop, true);
      window.removeEventListener("mousedown", stop, true);
      window.removeEventListener("mouseup", stop, true);
      window.removeEventListener("click", stop, true);
    };
  }, [tapHardlock]);

  const handleLogout = async (): Promise<void> => {
    try {
      await signOut({ reason: "user_logout" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Errore logout:", err);
    } finally {
      try {
        resetShipContext();
      } catch {
        // ignore
      }
      navigate("/login");
    }
  };

  const displayName = useMemo(() => {
    return formatDisplayName(profile, "Capo");
  }, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        {t("APP_LOADING_PROFILE")}
      </div>
    );
  }

  const contentWrapClass = "w-full md:max-w-[1480px] md:mx-auto space-y-4";

  const navItems = [
    {
      to: "/app",
      label: t("APP_RAPPORTINO"),
      icon: "rapportino" as const,
      colorClass: "text-sky-400",
      end: true,
    },
    {
      to: megaKpiTo,
      label: "Mega KPI · Posa",
      icon: "chart" as const,
      colorClass: "text-emerald-400",
    },
    {
      to: incaTo,
      label: "INCA · Cockpit",
      icon: "inca" as const,
      colorClass: "text-amber-400",
    },
    {
      to: "/app/core-drive",
      label: t("APP_CORE_DRIVE"),
      icon: "archive" as const,
      colorClass: "text-violet-400",
    },
  ];

  return (
    <>
      <IdleSessionManager
        enabled
        storageScopeKey={session?.user?.id ?? "anon"}
        warnAfterMs={25 * 60 * 1000}
        logoutAfterMs={30 * 60 * 1000}
        onExtend={async () => {
          try {
            await supabase.auth.getSession();
            await refresh();
          } catch {
            // ignore
          }
        }}
        onBeforeLogout={async (reason: string) => {
          try {
            window.dispatchEvent(new CustomEvent("core:idle-before-logout", { detail: { reason } }));
          } catch {
            // ignore
          }
        }}
        onLogout={async (reason: string) => {
          try {
            await signOut({ reason: reason || "idle_timeout" });
          } finally {
            try {
              resetShipContext();
            } catch {
              // ignore
            }
            navigate("/login");
          }
        }}
      />

      <div className="min-h-screen bg-[#050910] text-slate-100 overflow-x-hidden">
        <div className="flex min-h-screen">
          {!isMobile && (
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
              navItems={navItems}
              bottomSlot={
                <CapoTodayOperatorsPanel
                  mode="expanded"
                  onOperatorDragStart={() => setOpDropToken((v: number) => v + 1)}
                />
              }
              bottomSlotCollapsed={
                <CapoTodayOperatorsPanel
                  mode="collapsed"
                  onOperatorDragStart={() => setOpDropToken((v: number) => v + 1)}
                />
              }
            />
          )}

          <main className="flex-1 min-w-0 flex flex-col">
            <div className="sticky top-0 z-[200] px-3 sm:px-4 pt-3">
              <CNCSTopbar
                isDark={isDark}
                kickerLeft={
                  <div className="flex items-center gap-2">
                    {isMobile ? (
                      <button
                        type="button"
                        onClick={() => setMobileNavOpen(true)}
                        className={[
                          "inline-flex items-center justify-center rounded-xl border px-3 py-2",
                          "border-slate-800 bg-[#050910]/60 text-slate-200",
                          "hover:bg-slate-900/40 transition",
                          "text-xs font-semibold tracking-[0.18em] uppercase",
                        ].join(" ")}
                        aria-label="Menu"
                        title="Menu"
                      >
                        ☰
                      </button>
                    ) : null}
                    <ConnectionIndicator />
                  </div>
                }
                title={pageLabel}
                right={
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:block">
                      <LangSwitcher compact />
                    </div>

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

                    <button
                      type="button"
                      onClick={handleLogout}
                      className={[
                        "inline-flex items-center gap-2 rounded-xl border px-3 py-2",
                        "border-rose-900/50 bg-[#050910]/60 text-rose-200",
                        "hover:bg-rose-900/25 transition",
                        "text-xs font-semibold tracking-[0.18em] uppercase",
                      ].join(" ")}
                      title={t("LOGOUT")}
                      aria-label={t("LOGOUT")}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      {t("LOGOUT")}
                    </button>
                  </div>
                }
              />
            </div>

            <div className="flex-1 min-h-0 overflow-auto">
              <div
                className={`${contentWrapClass} px-3 sm:px-4 pb-6 relative`}
                style={{ touchAction: "manipulation" }}
              >
                {/* Optional visual shield (not required for hardlock, but harmless). */}
                {tapHardlock ? (
                  <div className="absolute inset-0 z-[999] bg-transparent" aria-hidden="true" />
                ) : null}

                <KeepAliveOutlet scopeKey="app" context={outletCtx} />
              </div>
            </div>
          </main>
        </div>

        {isMobile && mobileNavOpen ? (
          <div className="fixed inset-0 z-[500]">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
            />
            <div
              className={[
                "absolute left-0 top-0 h-full w-[86%] max-w-[360px]",
                "bg-[#050910] border-r border-slate-800",
                "p-4 flex flex-col gap-4",
              ].join(" ")}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs tracking-[0.24em] uppercase text-slate-500">CNCS</div>
                  <div className="text-lg font-semibold text-slate-100">Capo</div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-slate-200"
                  aria-label="Close"
                  title="Close"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2">
                {navItems.map((it) => (
                  <Link
                    key={it.to}
                    to={it.to}
                    className={[
                      "block rounded-2xl border px-4 py-3",
                      "border-slate-800 bg-slate-950/40 hover:bg-slate-900/40 transition",
                      "text-slate-100",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{it.label}</span>
                      <span className={["text-xs", it.colorClass].join(" ")}>●</span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                <CapoTodayOperatorsPanel
                  mode="expanded"
                  onOperatorDragStart={() => setOpDropToken((v: number) => v + 1)}
                />
              </div>

              <div className="mt-auto">
                <button
                  type="button"
                  onClick={handleLogout}
                  className={[
                    "w-full inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3",
                    "border-rose-900/50 bg-[#050910]/60 text-rose-200",
                    "hover:bg-rose-900/25 transition",
                    "text-xs font-semibold tracking-[0.18em] uppercase",
                  ].join(" ")}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  {t("LOGOUT")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}