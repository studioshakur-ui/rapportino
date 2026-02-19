// src/features/direzione/dashboard/components/DirezioneKpiStrip.tsx


import KpiCard from "../../../../components/ui/KpiCard";
import { formatNumberIT } from "../../../../components/charts";

import type { KpiSummary } from "../types";
import { KPI_IDS, type KpiId } from "../kpiRegistry";

function formatIndexIT(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return formatNumberIT(v, 2);
}

export type DirezioneKpiStripProps = {
  loading: boolean;
  summary: KpiSummary;
  onOpenKpi: (id: KpiId) => void;
  labels: {
    rapportini: string;
    righe: string;
    prod: string;
    incaPrev: string;
    incaReal: string;
    ore: string;
    ritardi: string;
    prev: string;
    vsPrev: string;
    metri: string;
    deadline: string;
  };
};

export default function DirezioneKpiStrip({ loading, summary, onOpenKpi, labels }: DirezioneKpiStripProps): JSX.Element {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      <KpiCard
        title={labels.rapportini}
        value={loading ? "—" : String(summary.currCount)}
        subline={loading ? "" : `${labels.prev}: ${summary.prevCount || "—"}`}
        accent="slate"
        onClick={() => onOpenKpi(KPI_IDS.RAPPORTINI)}
      />

      <KpiCard
        title={labels.righe}
        value={loading ? "—" : formatNumberIT(summary.currRighe, 0)}
        subline={labels.vsPrev}
        accent="sky"
        onClick={() => onOpenKpi(KPI_IDS.RIGHE)}
      />

      <KpiCard
        title={labels.prod}
        value={loading ? "—" : formatIndexIT(summary.productivityIndexNow)}
        subline="Σrealizzato / Σprevisto_alloc (MT)"
        accent="fuchsia"
        onClick={() => onOpenKpi(KPI_IDS.PROD)}
      />

      <KpiCard
        title={labels.incaPrev}
        value={loading ? "—" : formatNumberIT(summary.incaBaselineRef, 0)}
        subline={labels.metri}
        accent="slate"
        onClick={() => onOpenKpi(KPI_IDS.INCA_PREV)}
      />

      <KpiCard
        title={labels.incaReal}
        value={loading ? "—" : formatNumberIT(summary.incaDisAudit, 0)}
        subline={labels.metri}
        accent="emerald"
        onClick={() => onOpenKpi(KPI_IDS.INCA_REAL)}
      />

      <KpiCard
        title={labels.ore}
        value={loading ? "—" : formatNumberIT(summary.currHours, 1)}
        subline={loading ? "" : `${labels.prev}: ${formatNumberIT(summary.prevHours, 1)}`}
        accent="amber"
        onClick={() => onOpenKpi(KPI_IDS.ORE)}
      />

      <KpiCard
        title={labels.ritardi}
        value={loading ? "—" : summary.totalAttesi > 0 ? `${summary.totalRitardo}/${summary.totalAttesi}` : "—"}
        subline={labels.deadline}
        accent="rose"
        onClick={() => onOpenKpi(KPI_IDS.RITARDI)}
      />
    </section>
  );
}
