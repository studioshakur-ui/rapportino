// src/features/direzione/dashboard/components/DirezioneKpiStrip.tsx

import KpiCard from "../../../../components/ui/KpiCard";
import { formatNumberByLang } from "../../../../ui/format";

import type { KpiSummary } from "../types";
import { KPI_IDS, type KpiId } from "../kpiRegistry";

function formatIndex(lang: string, v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return formatNumberByLang(lang, v, 2);
}

function formatDelta(lang: string, v: number, maxFrac: number = 1): string {
  const n = Number.isFinite(v) ? v : 0;
  const s = formatNumberByLang(lang, Math.abs(n), maxFrac);
  return n > 0 ? `+${s}` : n < 0 ? `-${s}` : s;
}

export type DirezioneKpiStripProps = {
  loading: boolean;
  summary: KpiSummary;
  onOpenKpi: (id: KpiId) => void;
  lang: string;
  labels: {
    rapportini: string;
    righe: string;
    prod: string;
    incaPrev: string;
    incaReal: string;
    ore: string;
    ritardi: string;
    prev: string;
    delta: string;
    hoursUnit: string;
    vsPrev: string;
    metri: string;
    deadline: string;
    prodFormulaSub?: string; // optional, translated upstream if desired
  };
};

export default function DirezioneKpiStrip({
  loading,
  summary,
  onOpenKpi,
  labels,
  lang,
}: DirezioneKpiStripProps): JSX.Element {
  const prodSub = labels.prodFormulaSub ?? "Σrealizzato / Σprevisto_alloc (MT)";
  const hoursDelta = summary.currHours - summary.prevHours;
  const hoursDeltaText = `${labels.delta} ${formatDelta(lang, hoursDelta, 1)} ${labels.hoursUnit}`;
  const hoursPrevText = `${labels.prev}: ${formatNumberByLang(lang, summary.prevHours, 1)} ${labels.hoursUnit}`;

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
        value={loading ? "—" : formatNumberByLang(lang, summary.currRighe, 0)}
        subline={labels.vsPrev}
        accent="sky"
        onClick={() => onOpenKpi(KPI_IDS.RIGHE)}
      />

      <KpiCard
        title={labels.prod}
        value={loading ? "—" : formatIndex(lang, summary.productivityIndexNow)}
        subline={prodSub}
        accent="fuchsia"
        onClick={() => onOpenKpi(KPI_IDS.PROD)}
      />

      <KpiCard
        title={labels.incaPrev}
        value={loading ? "—" : formatNumberByLang(lang, summary.incaBaselineRef, 0)}
        subline={labels.metri}
        accent="slate"
        onClick={() => onOpenKpi(KPI_IDS.INCA_PREV)}
      />

      <KpiCard
        title={labels.incaReal}
        value={loading ? "—" : formatNumberByLang(lang, summary.incaDisAudit, 0)}
        subline={labels.metri}
        accent="emerald"
        onClick={() => onOpenKpi(KPI_IDS.INCA_REAL)}
      />

      <KpiCard
        title={labels.ore}
        value={loading ? "—" : `${formatNumberByLang(lang, summary.currHours, 1)} ${labels.hoursUnit}`}
        subline={
          loading
            ? ""
            : `${hoursDeltaText} · ${hoursPrevText}`
        }
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
