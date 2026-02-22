// src/navemaster/contracts/navemaster.types.ts

export type NavStatus = "P" | "R" | "T" | "B" | "E" | "NP";
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
  is_active: boolean;
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

export type NavemasterRowDetails = {
  id: string;
  navemaster_import_id: string;
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
  payload: unknown;
};

export type NavemasterIncaAlert = {
  id: string;
  ship_id: string;
  inca_file_id: string;
  marcacavo: string;
  navemaster_state: string | null;
  inca_state: string | null;
  rule: string;
  created_at: string;
  severity: NavSeverity;
  meta: Record<string, unknown>;
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