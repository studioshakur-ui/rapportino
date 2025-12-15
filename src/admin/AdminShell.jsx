// src/admin/AdminShell.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import LoadingScreen from "../components/LoadingScreen";
import ConnectionIndicator from "../components/ConnectionIndicator";
import { coreLayout } from "../ui/coreLayout";
import { corePills, themeIconBg } from "../ui/designSystem";
import { getInitialLang, setLangStorage, t } from "./i18n";

export default function AdminShell() {
  const { profile, signOut, authReady, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [lang, setLang] = useState(getInitialLang);
  const isDark = true; // dark-only (light mode removed)

  useEffect(() => {
    setLangStorage(lang);
  }, [lang]);

  const displayName = useMemo(() => {
    return (
      profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      "Admin"
    );
  }, [profile]);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const pathname = location.pathname;
  const isUsers = pathname === "/admin" || pathname.startsWith("/admin/users");

  if (!authReady || loading) {
    return <LoadingScreen message="CORE · Admin security init…" />;
  }

  if (!profile) {
    return <LoadingScreen message="Profil Admin…" />;
  }

  return (
    <div className={["min-h-screen flex flex-col", coreLayout.pageShell(isDark)].join(" ")}>
      <header
        className={[
          "no-print border-b backdrop-blur flex items-center justify-between px-4 md:px-6 py-2",
          coreLayout.header(isDark),
        ].join(" ")}
      >
        <div className="flex flex-col gap-0.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
            CORE · Governance
          </div>
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-100">{t(lang, "ADMIN_TITLE")}</span>
            <span className="text-slate-500"> · </span>
            <span>{t(lang, "ADMIN_SUB")}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          {/* Lang selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase tracking-[0.14em] text-[10px]">
              {t(lang, "LANG")}
            </span>
            <div className="inline-flex rounded-full border border-slate-800 overflow-hidden">
              {["it", "fr", "en"].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setLang(k)}
                  className={[
                    "px-2 py-1 text-[11px] uppercase tracking-[0.14em]",
                    lang === k
                      ? "bg-slate-800 text-slate-100"
                      : "bg-transparent text-slate-400 hover:text-slate-100",
                  ].join(" ")}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <ConnectionIndicator />

          <div className="hidden sm:flex flex-col text-right">
            <span className="text-slate-400">
              Admin: <span className="text-slate-100 font-medium">{displayName}</span>
            </span>
            <span className="text-slate-500">Area Admin</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-full border text-xs font-medium border-rose-500 text-rose-100 hover:bg-rose-600/20"
          >
            {t(lang, "LOGOUT")}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className={["no-print w-64 border-r px-3 py-4 flex flex-col gap-5", coreLayout.sidebar(isDark)].join(" ")}>
          <div className="px-1 pb-3 border-b border-slate-800/60">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-1">
              ADMIN
            </div>
            <div className="text-xs text-slate-300">
              Accounts, perimeters, integrity.
            </div>
          </div>

          <nav className="px-1 py-3 space-y-1.5">
            <NavLink
              to="/admin/users"
              end
              className={({ isActive }) =>
                [
                  corePills(isDark, "emerald", "w-full flex items-center gap-2 justify-start"),
                  isActive ? "" : "opacity-80 hover:opacity-100",
                ].join(" ")
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{t(lang, "TAB_USERS")}</span>
            </NavLink>

            {/* Placeholder settings (future) */}
            <NavLink
              to="/admin/settings"
              className={({ isActive }) =>
                [
                  corePills(isDark, "slate", "w-full flex items-center gap-2 justify-start"),
                  isActive ? "" : "opacity-75 hover:opacity-100",
                ].join(" ")
              }
            >
              <span className={themeIconBg(true, "neutral", "h-3 w-3 text-[9px] flex items-center justify-center")}>
                ⚙
              </span>
              <span>{t(lang, "TAB_SETTINGS")}</span>
            </NavLink>
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800 text-[10px] text-slate-500">
            <div>CORE · CNCS</div>
            <div className="text-slate-600">Admin · Control plane</div>
          </div>
        </aside>

        <main className={["flex-1 min-h-0 overflow-y-auto", coreLayout.mainBg(isDark)].join(" ")}>
          <section className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {isUsers ? t(lang, "TAB_USERS") : t(lang, "TAB_SETTINGS")}
                </span>
                <span className="text-xs text-slate-400">
                  {isUsers
                    ? "Create accounts via Edge Function. Audit-safe."
                    : "Reserved for governance settings (future)."}
                </span>
              </div>
            </div>

            <div className={["border rounded-2xl overflow-hidden", coreLayout.primaryPanel(isDark)].join(" ")}>
              <Outlet context={{ lang }} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
