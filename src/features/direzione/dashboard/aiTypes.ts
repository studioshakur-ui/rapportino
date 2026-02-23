// src/features/direzione/dashboard/aiTypes.ts

export type DirezioneAiFilters = {
  costr: string;
  commessa: string;
};

export type AiScopeLevel = "GLOBAL" | "COSTR" | "COMMESSA";

export type DirezioneAiRadarRow = {
  costr: string | null;
  commessa: string | null;
  as_of_date: string;
  scope_level: AiScopeLevel;
  alerts_open_critical: number | null;
  alerts_open_major: number | null;
  alerts_open_total: number | null;
  alerts_open_metri_mismatch: number | null;
  blocks_open: number | null;
  blocks_open_critical: number | null;
  anomalies_open: number | null;
};

export type DirezioneAiStabilityRow = {
  costr: string | null;
  commessa: string | null;
  scope_level: AiScopeLevel;
  as_of_date: string;
  alerts_open_critical: number | null;
  alerts_open_major: number | null;
  blocks_open: number | null;
  anomalies_open: number | null;
  alerts_open_metri_mismatch: number | null;
  stability_score: number | null;
};

export type DirezioneAiProjectionPoint = {
  costr: string | null;
  commessa: string | null;
  scope_level: AiScopeLevel;
  forecast_date: string;
  forecast_risk_index: number | null;
  slope: number | null;
  intercept: number | null;
  points: number | null;
  base_from: string | null;
  base_to: string | null;
};

export type DirezioneAiPerformanceRow = {
  ship_id: string | null;
  ship_code: string | null;
  ship_name: string | null;
  costr: string | null;
  commessa: string | null;
  previsto_sum: number | null;
  prodotto_sum: number | null;
  righe_count: number | null;
  performance_ratio: number | null;
};

export type DirezioneAiAnomalyRow = {
  costr: string | null;
  commessa: string | null;
  scope_level: AiScopeLevel;
  anomaly_type: string;
  open_count: number | null;
};

export type DirezioneAiAnomalyTotalRow = {
  costr: string | null;
  commessa: string | null;
  scope_level: AiScopeLevel;
  open_count: number | null;
};
