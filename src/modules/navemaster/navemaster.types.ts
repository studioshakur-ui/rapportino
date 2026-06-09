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
