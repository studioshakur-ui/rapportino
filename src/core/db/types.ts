// src/core/db/types.ts
// TS contracts for the CORE COMMAND event model (mirror of the SQL migration).

export type EventSource = "whatsapp" | "inca" | "agent" | "manual";
export type EventStatus = "pending" | "staged" | "validated" | "rejected";

export type CoreEvent = {
  id: string;
  occurred_at: string;
  source: EventSource;
  source_ref: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  status: EventStatus;
  validated_at: string | null;
  validated_by: string | null;
  created_at: string;
};

export type WhatsappImportStatus = "parsed" | "reviewed" | "archived";

export type WhatsappImport = {
  id: string;
  file_name: string;
  storage_path: string | null;
  imported_at: string;
  message_count: number;
  status: WhatsappImportStatus;
};

export type WhatsappMessage = {
  id: string;
  import_id: string;
  sent_at: string | null;
  author: string | null;
  raw_text: string;
  parsed_payload: Record<string, unknown>;
  core_event_id: string | null;
  created_at: string;
};

export type CableEventType = "posa" | "ripresa" | "blocco" | "anomalia";

export type CableEvent = {
  id: string;
  inca_cavo_id: string | null;
  cavo_code: string | null;
  event_type: CableEventType;
  meters: number | null;
  occurred_at: string;
  operator_id: string | null;
  zone: string | null;
  core_event_id: string | null;
  created_at: string;
};

export type CablePriorityReason = "blocco" | "ripresa" | "anomalia";
export type CablePriorityStatus = "open" | "resolved";

export type CablePriority = {
  id: string;
  cavo_code: string;
  priority: number;
  reason: CablePriorityReason | null;
  status: CablePriorityStatus;
  opened_at: string;
  resolved_at: string | null;
};

export type ProductionDailyKpi = {
  day: string;
  cables_posed: number;
  meters_posed: number;
  meters_target: number | null;
  active_operators: number;
  computed_at: string;
};

export type AgentName = "intake" | "normalizer" | "inca_matcher" | "production" | "auditor";
export type AgentSeverity = "info" | "warn" | "error";
export type AgentFindingStatus = "open" | "acknowledged" | "resolved";

export type AgentFinding = {
  id: string;
  agent: AgentName;
  severity: AgentSeverity;
  title: string;
  detail: Record<string, unknown>;
  related_event: string | null;
  status: AgentFindingStatus;
  created_at: string;
};

// INCA (read-only for CORE COMMAND) — lean projection of the REAL inca_cavi schema.
// Colonnes alignées sur baseline_schema.sql (ne pas inventer de colonnes).
export type IncaCavo = {
  id: string;
  inca_file_id: string | null;
  marca_cavo: string | null;
  codice: string | null;
  stato_cantiere: string | null;
  situazione_cavo: string | null;
  situazione: string | null; // L | T | P | R | B | E
  metri_teo: number | null;
  metri_dis: number | null;
  metri_sit_cavo: number | null;
  metri_posati_teorici: number | null;
  metri_totali: number | null;
  zona_da: string | null;
  zona_a: string | null;
  apparato_da: string | null;
  apparato_a: string | null;
};
