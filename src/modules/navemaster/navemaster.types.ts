// src/modules/navemaster/navemaster.types.ts
// Riconciliazione INCA ↔ campo (read-models dell'écran Navemaster).

export type NavemasterVerdict = "OK" | "WARN" | "BLOCK";
export type NavemasterAlertStatus = "OPEN" | "ACK" | "RESOLVED";
export type NavemasterAlertType =
  | "MISSING_IN_CORE"
  | "EXTRA_IN_CORE"
  | "DUPLICATE_IN_INCA"
  | "STATUS_CONFLICT"
  | "METRI_MISMATCH"
  | "BLOCKED_IMPACT";

export interface NavemasterRunDrivers {
  alerts?: { critical?: number; major?: number; info?: number };
  coverage?: { inca_only?: number; both?: number };
}

export interface NavemasterRun {
  id: string;
  ship_id: string;
  verdict: NavemasterVerdict | null;
  created_at: string;
  drivers: NavemasterRunDrivers | null;
}

export interface NavemasterAlert {
  id: string;
  run_id: string;
  codice: string | null;
  codice_norm: string | null;
  type: NavemasterAlertType;
  severity: string;
  status: NavemasterAlertStatus;
  evidence: Record<string, unknown> | null;
}

export interface NavemasterView {
  run: NavemasterRun | null;
  alerts: NavemasterAlert[];
  shipId: string | null;
}

// Read-model périmètre (RPC navemaster_perimetro_board) : avancement live des
// 2 axes vers la consegna, une ligne par périmètre.
export interface PerimetroBoardRow {
  perimetro: string;
  data_consegna: string | null;
  giorni_al_target: number | null; // négatif = en retard
  tot_cavi: number;
  posati: number;
  collegati: number;
  bloccati: number;
  da_completare: number;
  pct_posa: number | null;
  pct_coll: number | null;
}

export interface PerimetroBoardView {
  shipId: string | null;
  rows: PerimetroBoardRow[];
}

// Drill-down : un câble qui retient encore un périmètre (RPC navemaster_perimetro_cavi).
export interface PerimetroCavoRow {
  codice: string;
  marca_cavo: string | null;
  situazione: string | null;
  collegato: string | null;
  posato: boolean;
  is_collegato: boolean;
  bloccato: boolean;
}
