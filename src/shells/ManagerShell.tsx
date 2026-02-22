// src/shells/ManagerShell.tsx
import { useMemo } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import ConnectionIndicator from "../components/ConnectionIndicator";
import CNCSSidebar from "../components/shell/CNCSSidebar";
import CNCSTopbar from "../components/shell/CNCSTopbar";
import LangSwitcher from "../components/shell/LangSwitcher";
import ThemeSwitcher from "../components/ThemeSwitcher";


import { useI18n } from "../i18n/I18nProvider";
import { formatDisplayName } from "../utils/formatHuman";
import { useTheme } from "../hooks/useTheme";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function ManagerShell() {
  // Typage minimal et non intrusif (on évite de “deviner” tes types Auth)
  const { profile, signOut } = useAuth() as unknown as {
    profile: any;
    signOut: () => Promise<void>;
  };

  const navigate = useNavigate();
  const location = useLocation();
  const { lang, t } = useI18n() as unknown as {
    lang: string;
    t: (key: string) => string;
  };

  const { effective } = useTheme();
  const isDark = effective === "dark";

  const displayName = useMemo((): string => {
    return formatDisplayName(profile, "Manager");
  }, [profile]);

  const handleLogout = async (): Promise<void> => {
    try {
      await signOut();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const pathname = location.pathname || "";
  const isAssignmentsPage =
    pathname.startsWith("/manager/assegnazioni") || pathname.startsWith("/manager/assignments");
  const pageTitle = pathname.startsWith("/manager/assegnazioni")
    ? t("NAV_ASSIGNMENTS")
    : pathname.startsWith("/manager/capi-cantieri")
    ? t("NAV_CAPI_CANTIERI")
    : pathname.startsWith("/manager/drive")
    ? t("NAV_CORE_DRIVE")
    : pathname.startsWith("/manager/analytics")
    ? t("NAV_ANALYTICS")
    : pathname.startsWith("/manager/kpi-operatori")
    ? t("APP_KPI_OPERATORI")
    : t("NAV_DASHBOARD");

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-bg">
        {t("APP_LOADING_PROFILE")}
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen", "theme-bg", "theme-scope")}>
      <div className="flex">
        <CNCSSidebar
          isDark={isDark}
          title="CNCS"
          subtitle="Manager"
          roleLabel="MANAGER"
          navItems={[
            {
              to: "/manager",
              label: t("NAV_DASHBOARD"),
              icon: "dashboard",
              colorClass: "text-sky-400",
              end: true,
            },
            {
              to: "/manager/assegnazioni",
              label: t("NAV_ASSIGNMENTS"),
              icon: "users",
              colorClass: "text-emerald-400",
            },
            {
              to: "/manager/capi-cantieri",
              label: t("NAV_CAPI_CANTIERI"),
              icon: "presentation",
              colorClass: "text-sky-400",
            },
            {
              to: "/manager/drive",
              label: t("NAV_CORE_DRIVE"),
              icon: "archive",
              colorClass: "text-violet-400",
            },
            {
              to: "/manager/analytics",
              label: t("NAV_ANALYTICS"),
              icon: "chart",
              colorClass: "text-amber-400",
            },
            {
              to: "/manager/kpi-operatori",
              label: t("APP_KPI_OPERATORI"),
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
              <div className="flex items-center gap-2">
                <ConnectionIndicator compact />
                <div className="hidden sm:block">
                  <LangSwitcher compact />
                </div>
                <ThemeSwitcher />

                {/* ✅ Human name: NEVER uppercase */}
                <span
                  className={[
                    "px-3 py-1.5 rounded-full border text-[11px]",
                    "theme-border bg-[var(--panel2)] theme-text",
                    "normal-case tracking-normal",
                    "max-w-[220px] truncate",
                  ].join(" ")}
                  title={displayName}
                >
                  {displayName}
                </span>

                <button
                  onClick={handleLogout}
                  className="ml-2 px-3 py-1.5 rounded-full border border-rose-500/60 bg-[var(--panel2)] text-rose-200 text-[11px] uppercase tracking-[0.18em]"
                  title={t("LOGOUT")}
                  aria-label={t("LOGOUT")}
                >
                  {t("LOGOUT")}
                </button>
              </div>
            }
          />

          <div className="pt-4">
            <Outlet context={{ lang }} />
          </div>
        </main>
      </div>
    </div>
  );
}

