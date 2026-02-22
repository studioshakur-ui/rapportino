// /src/pages/CoreDrivePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { useShip } from "../context/ShipContext";
import { useI18n } from "../i18n/I18nProvider";

import Segmented from "../components/core-drive/ui/Segmented";
import Badge from "../components/core-drive/ui/Badge";

import CoreDriveDocuments from "../components/core-drive/docs/CoreDriveDocuments";
import CoreDriveRapportiniV1 from "../components/core-drive/rapportini/CoreDriveRapportiniV1";
import { resolveCoreDriveView } from "../components/core-drive/coreDriveViews";

type CoreDriveTab = { key: string; label: string };

export default function CoreDrivePage() {
  const { profile } = useAuth();
  const location = useLocation();
  const { currentShip } = useShip();
  const { t } = useI18n();

  const appRole = String(profile?.app_role || (profile as any)?.role || "");

  const view = useMemo(() => {
    return resolveCoreDriveView({
      pathname: location.pathname,
      appRole,
      currentShip,
    });
  }, [location.pathname, appRole, currentShip]);

  const tabs = useMemo<CoreDriveTab[]>(() => {
    if (Array.isArray(view?.tabs) && view.tabs.length) return view.tabs as CoreDriveTab[];
    return [
      { key: "DOCS", label: t("CORE_DRIVE_TAB_DOCS") },
      { key: "RAPPORTINI_V1", label: t("CORE_DRIVE_TAB_RAPPORTINI_V1") },
    ];
  }, [view, t]);

  const tabKey = view?.storage?.tabKey || "coreDrive.tab";
  const tabsKey = useMemo(() => tabs.map((t) => t.key).join("|"), [tabs]);

  const [tab, setTab] = useState("DOCS");

  // Restore tab per-lens, and keep it valid when lens changes
  useEffect(() => {
    const allowed = new Set(tabs.map((t) => t.key));

    let next = "DOCS";
    try {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem(tabKey) : null;
      if (saved && allowed.has(saved)) next = saved;
      else next = tabs[0]?.key || "DOCS";
    } catch {
      next = tabs[0]?.key || "DOCS";
    }

    if (!allowed.has(next)) next = tabs[0]?.key || "DOCS";
    setTab(next);
  }, [tabKey, tabsKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(tabKey, tab);
    } catch {
      // ignore
    }
  }, [tab, tabKey]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 pb-10 pt-6">
        <div className="mx-auto w-full max-w-6xl text-sm text-slate-400">{t("CORE_DRIVE_PROFILE_LOADING")}</div>
      </div>
    );
  }

  const roleLabel = String(appRole || "STAFF").toUpperCase();
  const readOnly = tab === "RAPPORTINI_V1" || view?.docs?.showUpload === false;

  return (
    <div className="min-h-screen bg-slate-950 px-4 pb-10 pt-6">
      <div className="w-full">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{view?.kicker || "CORE Drive"}</div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-100">
              {view?.title || t("CORE_DRIVE_TITLE")}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(Array.isArray(view?.badges) && view.badges.length ? (view.badges as string[]) : [roleLabel]).map(
                (b: string) => (
                <Badge key={b} tone="neutral">
                  {b}
                </Badge>
                )
              )}
              {readOnly ? <Badge tone="info">{t("CORE_DRIVE_BADGE_READONLY")}</Badge> : <Badge tone="ok">{t("CORE_DRIVE_BADGE_OPERATIVE")}</Badge>}
              <Badge tone="neutral">{t("CORE_DRIVE_BADGE_THEME")}</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Segmented
              value={tab}
              onChange={setTab}
              options={tabs.map((t) => ({ value: t.key, label: t.label }))}
            />
          </div>
        </header>

        <div className="mt-5">
          {tab === "DOCS" ? <CoreDriveDocuments /> : <CoreDriveRapportiniV1 />}
        </div>
      </div>
    </div>
  );
}
