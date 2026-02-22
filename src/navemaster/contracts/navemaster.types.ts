// src/navemaster/contracts/navemaster.types.ts

export type NavStatus = "P" | "R" | "T" | "B" | "E" | "NP" | "L";
export type NavSeverity = "CRITICAL" | "MAJOR" | "INFO";

export type AppRole = "CAPO" | "UFFICIO" | "MANAGER" | "ADMIN" | "DIREZIONE" | string;

export type ShipLite = {
  id: string;
  code?: string | null;
  name?: string | null;
  costr?: string | null;
  commessa?: string | null;
  is_active?: boolean | null;
};

export type NavemasterLatestImportV1 = {
  id: string;
  ship_id: string;
  costr: string | null;
  commessa: string | null;
  file_name: string | null;
  file_bucket: string | null;
  file_path: string | null;
  source_sha256: string | null;
  note: string | null;
  imported_by: string | null;
  imported_at: string;
  is_active: boolean | null;
};

export type NavemasterLiveRowV1 = {
  ship_id: string;
  navemaster_import_id: string;
  navemaster_imported_at: string;

  navemaster_row_id: string;
  marcacavo: string;

  descrizione: string | null;
  stato_cavo: string | null;
  situazione_cavo_conit: string | null;
  livello: string | null;
  sezione: string | null;
  tipologia: string | null;
  zona_da: string | null;
  zona_a: string | null;
  apparato_da: string | null;
  apparato_a: string | null;
  impianto: string | null;

  // heavy; only needed in details
  payload?: unknown;

  // INCA join (left join)
  inca_cavo_id: string | null;
  inca_file_id: string | null;
  situazione_inca: string | null;
  metri_teo_inca: number | null;
  metri_dis_inca: number | null;
  inca_updated_at: string | null;
};

export type NavemasterLiveRowV2 = {
  id: string;
  run_id: string;
  ship_id: string;
  inca_file_id: string;
  codice: string;
  codice_norm: string;
  is_modified?: boolean | null;
  stato_nav: NavStatus;
  metri_ref: number | null;
  metri_posati_ref: number | null;
  delta_metri: number | null;
  descrizione: string | null;
  impianto: string | null;
  tipo: string | null;
  sezione: string | null;
  livello: string | null;
  zona_da: string | null;
  zona_a: string | null;
  apparato_da: string | null;
  apparato_a: string | null;
  descrizione_da: string | null;
  descrizione_a: string | null;
  wbs: string | null;
  last_proof_at: string | null;
  coverage: string | null;
  created_at: string;
  run_frozen_at?: string | null;
  run_verdict?: string | null;
};

export type NavemasterRowDetailsV2 = {
  id: string;
  run_id: string;
  ship_id: string;
  inca_file_id: string;
  codice: string;
  codice_norm: string;
  stato_nav: NavStatus;
  metri_ref: number | null;
  metri_posati_ref: number | null;
  delta_metri: number | null;
  descrizione: string | null;
  impianto: string | null;
  tipo: string | null;
  sezione: string | null;
  livello: string | null;
  zona_da: string | null;
  zona_a: string | null;
  apparato_da: string | null;
  apparato_a: string | null;
  descrizione_da: string | null;
  descrizione_a: string | null;
  wbs: string | null;
  last_proof_at: string | null;
  last_rapportino_id?: string | null;
  coverage: string | null;
  created_at: string;
  payload?: unknown;
};

export type NavemasterAlertV2 = {
  id: string;
  run_id: string;
  ship_id: string;
  costr: string | null;
  commessa: string | null;
  codice: string | null;
  codice_norm: string | null;
  type: string;
  severity: NavSeverity;
  evidence: Record<string, unknown>;
  status: string;
  created_at: string;
};

export type NavemasterIncaDiff = {
  id: string;
  ship_id: string;
  inca_file_id: string;
  marcacavo: string;
  nav_status: string | null;
  inca_status_prev: string | null;
  inca_status_new: string | null;
  match_prev: boolean | null;
  match_new: boolean | null;
  severity: NavSeverity;
  rule: string;
  created_at: string;
  prev_value: number | null;
  new_value: number | null;
  meta: Record<string, unknown>;
};

export type NavemasterKpiSummaryV2 = {
  ship_id: string;
  costr: string | null;
  commessa: string | null;
  run_id: string;
  frozen_at: string | null;
  verdict: string | null;
  total: number | null;
  cnt_p: number | null;
  cnt_t: number | null;
  cnt_r: number | null;
  cnt_l: number | null;
  cnt_b: number | null;
  cnt_e: number | null;
  cnt_np: number | null;
  metri_ref_sum: number | null;
  metri_posati_sum: number | null;
  delta_sum: number | null;
  progress_ratio: number | null;
};

export type PageResult<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  total: number | null; // null if count not available
  hasMore: boolean;
};

export type KpiCounters = {
  totalRows: number | null;
  byNavStatus: Record<NavStatus, number | null>;
  alertsBySeverity: Record<NavSeverity, number | null>;
  diffBySeverity: Record<NavSeverity, number | null>;
};
