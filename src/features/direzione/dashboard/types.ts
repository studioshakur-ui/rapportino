// src/features/direzione/dashboard/types.ts

export type DirezioneFilters = {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  costr: string; // optional filter
  commessa: string; // optional filter
};

export type RapportinoStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED_CAPO"
  | "APPROVED_UFFICIO"
  | "REJECTED"
  | string;

export type RapportinoHeaderRow = {
  id: string;
  report_date: string; // YYYY-MM-DD
  created_at?: string | null;
  updated_at?: string | null;
  status?: RapportinoStatus | null;
  costr?: string | null;
  commessa?: string | null;

  capo_id?: string | null;
  capo_display_name?: string | null;
  capo_email?: string | null;
  capo_app_role?: string | null;
};

export type IncaChantierRow = {
  inca_file_id?: string | null;
  nome_file?: string | null;
  caricato_il?: string | null;
  costr?: string | null;
  commessa?: string | null;

  // chantier-normalized (preferred)
  metri_ref_totali?: number | string | null; // baseline chantier (= max(teo,dis))
  metri_teo_totali?: number | string | null;
  metri_dis_totali?: number | string | null; // audit dis
  metri_posati_ref?: number | string | null;

  // legacy (direzione_inca_teorico)
  metri_previsti_totali?: number | string | null;
  metri_realizzati?: number | string | null;
  metri_posati?: number | string | null;

  cavi_totali?: number | null;
  cavi_ref_both?: number | null;
  cavi_ref_teo_only?: number | null;
  cavi_ref_dis_only?: number | null;
  cavi_ref_none?: number | null;

  pct_ref_both?: number | string | null;
  pct_ref_none?: number | string | null;
};

export type ProdDailyRow = {
  report_date: string; // YYYY-MM-DD
  previsto_alloc: number;
  prodotto_alloc: number;
  ore_indexed: number;
  productivity_index: number | null;
};

export type HoursFactRow = {
  report_date: string; // YYYY-MM-DD
  costr?: string | null;
  commessa?: string | null;

  manager_id?: string | null;
  capo_id?: string | null;
  ship_id?: string | null;
  ship_code?: string | null;
  ship_name?: string | null;

  operator_id?: string | null;
  tempo_hours: number | string | null;
  unit?: string | null;
};

export type ProduzioniAggRow = {
  descrizione: string;
  prodotto_sum: number;
  righe: number;
};

export type DelayDailyRow = {
  day_date?: string | null;
  report_date?: string | null;
  capi_attesi?: number | null;
  capi_in_ritardo?: number | null;

  // (optionnels) utile modal drill-down si ta view/logic les fournit
  capi_in_ritardo_ids?: string[] | null;
  capi_in_ritardo_nomi?: string[] | null;
};

export type DirezioneDashboardDataset = {
  rapportiniCurrent: RapportinoHeaderRow[];
  rapportiniPrevious: RapportinoHeaderRow[];

  incaChantier: IncaChantierRow[];

  produzioniAggCurrent: ProduzioniAggRow[];
  produzioniAggPrevious: ProduzioniAggRow[];

  hoursFactsCurrent: HoursFactRow[];
  hoursFactsPrevious: HoursFactRow[];

  prodDailyCurrent: ProdDailyRow[];
  prodDailyPrevious: ProdDailyRow[];

  capiDelayDaily: DelayDailyRow[];
};

export type KpiSummary = {
  // rapportini
  currCount: number;
  prevCount: number;

  // righe
  currRighe: number;
  prevRighe: number;

  // inca
  incaBaselineRef: number;
  incaDisAudit: number;
  incaPosatiRef: number;

  // hours
  currHours: number;
  prevHours: number;

  // productivity window
  sumPrevNow: number;
  sumProdNow: number;
  sumHoursIndexedNow: number;
  productivityIndexNow: number | null;

  // delays
  totalAttesi: number;
  totalRitardo: number;
};

export type TimelinePoint = {
  date: string; // YYYY-MM-DD
  label: string;
  rapportini: number;
  capi_ritardo: number;
};

export type ProdTrendPoint = {
  report_date: string;
  label: string;
  prev: number;
  prod: number;
  indice: number | null;
};