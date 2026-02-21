// src/features/direzione/dashboard/kpiRegistry.ts

import type { DirezioneFilters } from "./types";
import { formatDateLabel } from "./utils";

export const KPI_IDS = {
  RAPPORTINI: "RAPPORTINI",
  RIGHE: "RIGHE",
  PROD: "PROD",
  INCA_PREV: "INCA_PREV",
  INCA_REAL: "INCA_REAL",
  ORE: "ORE",
  RITARDI: "RITARDI",
} as const;

export type KpiId = (typeof KPI_IDS)[keyof typeof KPI_IDS] | null;

export type KpiTitleFn = (key: string, fallback?: string) => string;

export function getKpiModalTitle(activeKpi: KpiId, t: KpiTitleFn): string {
  switch (activeKpi) {
    case KPI_IDS.RAPPORTINI:
      return t("KPI_RAPPORTINI", "Rapportini");
    case KPI_IDS.RIGHE:
      return t("KPI_RIGHE_ATTIVITA", "Righe attività");
    case KPI_IDS.PROD:
      return t("KPI_INDICE_PROD", "Indice Produttività");
    case KPI_IDS.INCA_PREV:
      return t("KPI_INCA_PREV", "INCA prev");
    case KPI_IDS.INCA_REAL:
      return t("KPI_INCA_REAL", "INCA real");
    case KPI_IDS.ORE:
      return t("KPI_ORE_LAVORO", "Ore lavoro");
    case KPI_IDS.RITARDI:
      return t("KPI_RITARDI_CAPI", "Ritardi Capi");
    default:
      return t("MODAL_DETAILS", "Dettagli");
  }
}

export function getKpiModalSubtitle(filters: DirezioneFilters, t: KpiTitleFn): string {
  const windowLabel = t("DIR_WINDOW", "Finestra");
  const costrLabel = t("DIR_COSTR", "COSTR");
  const commessaLabel = t("DIR_COMMESSA", "Commessa");

  const from = formatDateLabel(filters.dateFrom);
  const to = formatDateLabel(filters.dateTo);

  return `${windowLabel}: ${from} → ${to} · ${costrLabel}: ${filters.costr || "—"} · ${commessaLabel}: ${
    filters.commessa || "—"
  }`;
}
