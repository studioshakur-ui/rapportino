// src/navemaster/NavemasterHub.tsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useI18n } from "../i18n/coreI18n";
import { cardSurface, corePills } from "../ui/designSystem";

import AccessDenied from "./components/AccessDenied";
import ShipSelector from "./components/ShipSelector";
import ImportMetaBar from "./components/ImportMetaBar";
import KpiBar from "./components/KpiBar";

import NavemasterImportModal from "./NavemasterImportModal";
import NavemasterCockpitPage from "./pages/NavemasterCockpitPage";
import NavemasterAlertsPage from "./pages/NavemasterAlertsPage";
import NavemasterDiffPage from "./pages/NavemasterDiffPage";

import { useNavemasterAccess } from "./hooks/useNavemasterContext";
import { useNavemasterShips } from "./hooks/useNavemasterShips";
import { useNavemasterLatestImport } from "./hooks/useNavemasterLatestImport";
import { useNavemasterKpis } from "./hooks/useNavemasterKpis";
import type { NavemasterView } from "./contracts/navemaster.query";

function TabButton(props: { active: boolean; label: string; onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={props.onClick}
      className={`rounded-xl border px-3 py-2 text-sm ${
        props.active
          ? "border-slate-600 bg-slate-900/40 text-slate-100"
          : "border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900/25"
      }`}
    >
      {props.label}
    </button>
  );
}

export default function NavemasterHub(): JSX.Element {
  const { t } = useI18n();
  const access = useNavemasterAccess();

  const { ships, loading: shipsLoading } = useNavemasterShips();
  const [params, setParams] = useSearchParams();

  const shipIdParam = params.get("shipId");
  const viewParam = (params.get("view") || "cockpit") as NavemasterView;

  const [shipId, setShipId] = useState<string | null>(shipIdParam);
  const [view, setView] = useState<NavemasterView>(viewParam);

  const [importOpen, setImportOpen] = useState<boolean>(false);

  // keep URL in sync (ABD: deep link stable)
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (shipId) next.set("shipId", shipId);
    else next.delete("shipId");
    next.set("view", view);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipId, view]);

  const latest = useNavemasterLatestImport(shipId);
  const kpis = useNavemasterKpis(shipId);

  const ship = useMemo(() => ships.find((s) => s.id === shipId) ?? null, [ships, shipId]);

  if (!access.canRead) return <AccessDenied />;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className={`rounded-2xl border border-slate-800 bg-[#050910] ${cardSurface(true)} p-5`}>
        <div className={corePills.kicker}>{t("NM_TITLE")}</div>
        <div className="mt-1 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-slate-100">{t("NM_SUBTITLE")}</div>
            <div className="text-xs text-slate-500 mt-1">ABD = UFFICIO tool + CNCS module + chantier alerting</div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <ShipSelector ships={ships} value={shipId} onChange={(id) => setShipId(id)} disabled={shipsLoading} />

            <button
              onClick={() => {
                void latest.refresh();
                void kpis.refresh();
              }}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/30"
            >
              {t("NM_REFRESH")}
            </button>

            <button
              onClick={() => setImportOpen(true)}
              disabled={!access.canImport || !shipId}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/30 disabled:opacity-50"
            >
              {t("NM_IMPORT")}
            </button>
          </div>
        </div>
      </div>

      <ImportMetaBar latest={latest.data} />
      <KpiBar kpis={kpis.kpis} loading={kpis.loading} />

      <div className="flex flex-wrap gap-2">
        <TabButton active={view === "cockpit"} label={t("NM_VIEW_COCKPIT")} onClick={() => setView("cockpit")} />
        <TabButton active={view === "alerts"} label={t("NM_VIEW_ALERTS")} onClick={() => setView("alerts")} />
        <TabButton active={view === "diff"} label={t("NM_VIEW_DIFF")} onClick={() => setView("diff")} />
      </div>

      {view === "cockpit" ? <NavemasterCockpitPage shipId={shipId} /> : null}
      {view === "alerts" ? <NavemasterAlertsPage shipId={shipId} /> : null}
      {view === "diff" ? <NavemasterDiffPage shipId={shipId} /> : null}

      <NavemasterImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        ship={ship}
        role={access.role}
        onImported={() => {
          setImportOpen(false);
          void latest.refresh();
          void kpis.refresh();
        }}
      />
    </div>
  );
}
