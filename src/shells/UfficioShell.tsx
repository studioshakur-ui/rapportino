// src/shells/UfficioShell.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import ConnectionIndicator from "../components/ConnectionIndicator";
import CNCSSidebar from "../components/shell/CNCSSidebar";
import CNCSTopbar from "../components/shell/CNCSTopbar";
import { KeepAliveOutlet } from "../utils/KeepAliveOutlet";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { useTheme } from "../hooks/useTheme";

export default function UfficioShell(): JSX.Element {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { effective } = useTheme();
  const isDark = effective === "dark";

  const [sidebarPeek, setSidebarPeek] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const v = window.localStorage.getItem("core-sidebar-collapsed-ufficio");
      if (v === "1" || v === "0") return v === "1";
    } catch {
      // ignore
    }
    return true;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("core-sidebar-collapsed-ufficio", sidebarCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Errore logout ufficio:", err);
    } finally {
      navigate("/login");
    }
  };

  const displayName = useMemo(() => {
    return profile?.display_name || profile?.full_name || profile?.email || "Ufficio";
  }, [profile]);

  const pathname = location.pathname || "";
  const isNavemaster = pathname.startsWith("/ufficio/navemaster");
  const isRapportini = pathname === "/ufficio" || pathname.startsWith("/ufficio/rapportini");
  const isInca = pathname.startsWith("/ufficio/inca") || pathname.startsWith("/ufficio/inca-hub");
  const isEvoluzione = pathname.startsWith("/ufficio/evoluzione");
  const isCoreDrive =
    pathname.startsWith("/ufficio/core-drive") || pathname.startsWith("/ufficio/archive");

  const pageLabel = isEvoluzione
    ? "Suivi & Evoluzione"
    : isCoreDrive
    ? "CORE Drive"
    : isNavemaster
    ? "NAVEMASTER"
    : isInca
    ? "INCA"
    : "Rapportini";

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-bg">
        Caricamento profilo…
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg theme-scope">
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

            // CANONIQUE
            { to: "/ufficio/navemaster", label: "NAVEMASTER", icon: "ship", colorClass: "text-emerald-400" },

            // CANONIQUE: /ufficio/inca (alias /ufficio/inca-hub géré côté routes)
            { to: "/ufficio/inca", label: "INCA", icon: "inca", colorClass: "text-sky-400" },

            // NEW
            { to: "/ufficio/evoluzione", label: "Evoluzione", icon: "history", colorClass: "text-amber-400" },

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

                <ThemeSwitcher />

                <span
                  className={[
                    "hidden sm:inline-flex max-w-[220px] truncate",
                    "rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em]",
                    "theme-border bg-[var(--panel2)] theme-text",
                  ].join(" ")}
                  title={displayName}
                >
                  {displayName}
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-[var(--panel2)] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-rose-200 hover:bg-rose-900/25 transition"
                  title="Logout"
                  aria-label="Logout"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  Logout
                </button>
              </>
            }
          />

          <div className={`${isNavemaster || isRapportini ? "w-full pt-4" : "max-w-6xl mx-auto space-y-4 pt-4"}`}>
            {isNavemaster || isRapportini ? (
              <KeepAliveOutlet scopeKey="ufficio" />
            ) : (
              <div className="border rounded-2xl overflow-hidden theme-border bg-[var(--panel)]">
                <KeepAliveOutlet scopeKey="ufficio" />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

