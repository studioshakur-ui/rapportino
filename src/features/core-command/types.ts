// src/features/core-command/types.ts
// Domain types for CORE COMMAND — derived from supabase.generated.ts
// INCA = read-only. No writes to inca_cavi here.

import type { Database } from "../../types/supabase.generated";

// ---------------------------------------------------------------------------
// Table row types (aliased for ergonomics)
// ---------------------------------------------------------------------------
export type CoreOperator    = Database["public"]["Tables"]["core_operators"]["Row"];
export type WhatsAppImport  = Database["public"]["Tables"]["whatsapp_imports"]["Row"];
export type WhatsAppMessage = Database["public"]["Tables"]["whatsapp_messages"]["Row"];
export type CoreEvent       = Database["public"]["Tables"]["core_events"]["Row"];
export type CableEvent      = Database["public"]["Tables"]["cable_events"]["Row"];
export type CablePriority   = Database["public"]["Tables"]["cable_priorities"]["Row"];
export type AgentFinding    = Database["public"]["Tables"]["agent_findings"]["Row"];
export type ProductionKpi   = Database["public"]["Tables"]["production_daily_kpis"]["Row"];

// Insert types
export type InsertCoreOperator    = Database["public"]["Tables"]["core_operators"]["Insert"];
export type InsertWhatsAppImport  = Database["public"]["Tables"]["whatsapp_imports"]["Insert"];
export type InsertWhatsAppMessage = Database["public"]["Tables"]["whatsapp_messages"]["Insert"];
export type InsertCoreEvent       = Database["public"]["Tables"]["core_events"]["Insert"];
export type InsertCableEvent      = Database["public"]["Tables"]["cable_events"]["Insert"];
export type InsertCablePriority   = Database["public"]["Tables"]["cable_priorities"]["Insert"];
export type InsertAgentFinding    = Database["public"]["Tables"]["agent_findings"]["Insert"];
export type InsertProductionKpi   = Database["public"]["Tables"]["production_daily_kpis"]["Insert"];

// Update types
export type UpdateCoreEvent     = Database["public"]["Tables"]["core_events"]["Update"];
export type UpdateCableEvent    = Database["public"]["Tables"]["cable_events"]["Update"];
export type UpdateCablePriority = Database["public"]["Tables"]["cable_priorities"]["Update"];
export type UpdateAgentFinding  = Database["public"]["Tables"]["agent_findings"]["Update"];

// ---------------------------------------------------------------------------
// Validation status
// ---------------------------------------------------------------------------
export type ValidationStatus = "pending" | "validated" | "rejected" | "promoted";
export type EventSeverity    = "info" | "warn" | "block";
export type Priority         = "low" | "medium" | "high" | "critical";
export type ImportStatus     = "draft" | "imported" | "failed";
export type FindingStatus    = "open" | "resolved" | "ignored";
export type PriorityStatus   = "open" | "closed";

// ---------------------------------------------------------------------------
// WhatsApp intake — parsed message before DB insert
// ---------------------------------------------------------------------------
export interface ParsedWhatsAppMessage {
  message_ts: Date;
  author: string;
  raw_message: string;
  media_type: string | null;
  media_filename: string | null;
}

export interface WhatsAppParseResult {
  messages: ParsedWhatsAppMessage[];
  group_name: string | null;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Timeline entry (composite: core_events + cable_events)
// ---------------------------------------------------------------------------
export interface TimelineEntry {
  id: string;
  occurred_at: string;
  source: "core_event" | "cable_event";
  event_type: string;
  cable_code: string | null;
  operator_id: string | null;
  commessa: string | null;
  zone: string | null;
  validation_status: ValidationStatus | null;
  confidence: number;
  raw_text: string | null;
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Agent pipeline result
// ---------------------------------------------------------------------------
export interface AgentResult {
  agent: string;
  findings: InsertAgentFinding[];
  events_created: number;
  events_updated: number;
  errors: string[];
}
