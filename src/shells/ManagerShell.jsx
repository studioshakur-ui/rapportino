// src/ManagerShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import ConnectionIndicator from "../components/ConnectionIndicator";
import CNCSSidebar from "../components/shell/CNCSSidebar";
import CNCSTopbar from "../components/shell/CNCSTopbar";

import { getInitialLang, setLangStorage, t } from "../i18n/coreI18n";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function ManagerShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isDark = true;
  const [lang, setLang] = useState(getInitialLang);

  useEffect(() => {
    setLangStorage(lang);
  }, [lang]);

  const displayName = useMemo(() => {
    return profile?.display_name || profile?.email || "Manager";
  }, [profile]);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const pathname = location.pathname || "";
  const pageTitle = pathname.startsWith("/manager/assegnazioni")
    ? t(lang, "NAV_ASSIGNMENTS")
    : pathname.startsWith("/manager/drive")
    ? t(lang, "NAV_CORE_DRIVE")
    : pathname.startsWith("/manager/analytics")
    ? t(lang, "NAV_ANALYTICS")
    : pathname.startsWith("/manager/kpi-operatori")
    ? "KPI Operatori"
    : t(lang, "NAV_DASHBOARD");

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Caricamento profilo Manager…
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen", "bg-[#050910] text-slate-100")}>
      <div className="flex">
        <CNCSSidebar
          isDark={isDark}
          title="CNCS"
          subtitle="Manager"
          roleLabel="MANAGER"
          navItems={[
            {
              to: "/manager",
              label: t(lang, "NAV_DASHBOARD"),
              icon: "dashboard",
              colorClass: "text-sky-400",
              end: true,
            },
            {
              to: "/manager/assegnazioni",
              label: t(lang, "NAV_ASSIGNMENTS"),
              icon: "users",
              colorClass: "text-emerald-400",
            },
            {
              to: "/manager/drive",
              label: t(lang, "NAV_CORE_DRIVE"),
              icon: "archive",
              colorClass: "text-violet-400",
            },
            {
              to: "/manager/analytics",
              label: t(lang, "NAV_ANALYTICS"),
              icon: "chart",
              colorClass: "text-amber-400",
            },
            {
              to: "/manager/kpi-operatori",
              label: "KPI Operatori",
              icon: "chart",
              colorClass: "text-emerald-400",
            },
          ]}
        />

        <main className="flex-1 min-h-screen px-4 py-4">
          <CNCSTopbar
            isDark={isDark}
            kickerLeft="CNCS · Manager"
            title={pageTitle}
            right={
              <>
                <ConnectionIndicator compact />
                <span className="px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.18em] border-slate-800 bg-slate-950/20">
                  {displayName}
                </span>
                <button
                  onClick={handleLogout}
                  className="ml-2 px-3 py-1.5 rounded-full border border-rose-500/60 bg-rose-950/15 text-rose-200 text-[11px] uppercase tracking-[0.18em]"
                >
                  Logout
                </button>
              </>
            }
          />

          <div className="max-w-6xl mx-auto pt-4">
            <div className="border rounded-2xl border-slate-800 bg-[#050910]">
              <Outlet context={{ lang }} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
