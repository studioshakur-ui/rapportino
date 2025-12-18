// /src/pages/CoreDrivePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

import Segmented from "../components/core-drive/ui/Segmented";
import Badge from "../components/core-drive/ui/Badge";

import CoreDriveDocuments from "../components/core-drive/docs/CoreDriveDocuments";
import CoreDriveRapportiniV1 from "../components/core-drive/rapportini/CoreDriveRapportiniV1";

const TABS = [
  { key: "DOCS", label: "Documents" },
  { key: "RAPPORTINI_V1", label: "Storico Rapportini (v1)" },
];

export default function CoreDrivePage() {
  const { profile } = useAuth();
  const defaultTab = useMemo(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("coreDrive.tab") : null;
    return saved && TABS.some((t) => t.key === saved) ? saved : "DOCS";
  }, []);

  const [tab, setTab] = useState(defaultTab);

  useEffect(() => {
    try {
      localStorage.setItem("coreDrive.tab", tab);
    } catch {
      // ignore
    }
  }, [tab]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 pb-10 pt-6">
        <div className="mx-auto w-full max-w-6xl text-sm text-slate-400">
          Caricamento profilo…
        </div>
      </div>
    );
  }

  const role = profile?.app_role || profile?.role || "UFFICIO";
  const readOnly = tab === "RAPPORTINI_V1";

  return (
    <div className="min-h-screen bg-slate-950 px-4 pb-10 pt-6">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header premium, sans bruit */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              CORE Drive
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-100">
              Centro documentale e memoria lunga
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{role}</Badge>
              {readOnly ? (
                <Badge tone="info">Read-only</Badge>
              ) : (
                <Badge tone="ok">Operativo</Badge>
              )}
              <Badge tone="neutral">Dark · High precision</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Segmented
              value={tab}
              onChange={setTab}
              options={TABS.map((t) => ({ value: t.key, label: t.label }))}
            />
          </div>
        </header>

        <div className="mt-5">
          {tab === "DOCS" ? (
            <CoreDriveDocuments />
          ) : (
            <CoreDriveRapportiniV1 />
          )}
        </div>
      </div>
    </div>
  );
}
