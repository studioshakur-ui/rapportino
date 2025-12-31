// /src/pages/CoreDrivePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { useShip } from "../context/ShipContext";

import Segmented from "../components/core-drive/ui/Segmented";
import Badge from "../components/core-drive/ui/Badge";

import CoreDriveDocuments from "../components/core-drive/docs/CoreDriveDocuments";
import CoreDriveRapportiniV1 from "../components/core-drive/rapportini/CoreDriveRapportiniV1";
import { resolveCoreDriveView } from "../components/core-drive/coreDriveViews";

export default function CoreDrivePage() {
  const { profile } = useAuth();
  const location = useLocation();
  const { currentShip } = useShip();

  const appRole = profile?.app_role || profile?.role || "";

  const view = useMemo(() => {
    return resolveCoreDriveView({
      pathname: location.pathname,
      appRole,
      currentShip,
    });
  }, [location.pathname, appRole, currentShip]);

  const tabs = useMemo(() => {
    if (Array.isArray(view?.tabs) && view.tabs.length) return view.tabs;
    return [
      { key: "DOCS", label: "Documents" },
      { key: "RAPPORTINI_V1", label: "Storico Rapportini (v1)" },
    ];
  }, [view]);

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
        <div className="mx-auto w-full max-w-6xl text-sm text-slate-400">Caricamento profilo…</div>
      </div>
    );
  }

  const roleLabel = String(appRole || "STAFF").toUpperCase();
  const readOnly = tab === "RAPPORTINI_V1" || view?.docs?.showUpload === false;

  return (
    <div className="min-h-screen bg-slate-950 px-4 pb-10 pt-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{view?.kicker || "CORE Drive"}</div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-100">
              {view?.title || "Centro documentale e memoria lunga"}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(Array.isArray(view?.badges) && view.badges.length ? view.badges : [roleLabel]).map((b) => (
                <Badge key={b} tone="neutral">
                  {b}
                </Badge>
              ))}
              {readOnly ? <Badge tone="info">Read-only</Badge> : <Badge tone="ok">Operativo</Badge>}
              <Badge tone="neutral">Dark · High precision</Badge>
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
          {tab === "DOCS" ? <CoreDriveDocuments viewConfig={view?.docs || null} /> : <CoreDriveRapportiniV1 />}
        </div>
      </div>
    </div>
  );
}
