// src/modules/daily-lists/dailyLists.types.ts
// CORE COMMAND — Daily List Engine types
// INCA read-only. No writes to inca_cavi.

// ── Business status ────────────────────────────────────────────────────────
export type DailyItemStatus =
  | "confirmed_field"  // 100% reported via WhatsApp (CABLE_POSATO)
  | "likely_laid"      // cable_event CABLE_POSATO without explicit %, high confidence
  | "to_verify"        // partial % reported (e.g. 70%, 95%)
  | "no_evidence"      // no WhatsApp signal at all
  | "missing"          // not found in INCA database
  | "blocked"          // open finding of severity "block"
  | "outside_inca";    // cable_code not present in inca_cavi

export interface StatusMeta {
  label: string;
  color: string;       // Tailwind bg color token
  textColor: string;   // Tailwind text color token
  icon: string;
}

export const STATUS_META: Record<DailyItemStatus, StatusMeta> = {
  confirmed_field: { label: "Confermato campo", color: "bg-emerald-100 dark:bg-emerald-900/30", textColor: "text-emerald-700 dark:text-emerald-400", icon: "✓" },
  likely_laid:     { label: "Posa probabile",   color: "bg-blue-100 dark:bg-blue-900/30",     textColor: "text-blue-700 dark:text-blue-400",     icon: "~" },
  to_verify:       { label: "Da verificare",    color: "bg-amber-100 dark:bg-amber-900/30",   textColor: "text-amber-700 dark:text-amber-400",   icon: "%" },
  no_evidence:     { label: "Senza prova",      color: "bg-zinc-100 dark:bg-zinc-800",        textColor: "text-zinc-500 dark:text-zinc-400",     icon: "?" },
  missing:         { label: "Mancante",         color: "bg-red-100 dark:bg-red-900/30",       textColor: "text-red-700 dark:text-red-400",       icon: "✗" },
  blocked:         { label: "Bloccato",         color: "bg-red-200 dark:bg-red-900/40",       textColor: "text-red-800 dark:text-red-300",       icon: "⊘" },
  outside_inca:    { label: "Fuori INCA",       color: "bg-purple-100 dark:bg-purple-900/30", textColor: "text-purple-700 dark:text-purple-400", icon: "∅" },
};

// ── DB row types ───────────────────────────────────────────────────────────
export interface DailyListImport {
  id: string;
  file_name: string;
  list_date: string | null;
  source_kind: "pdf" | "excel" | "manual";
  imported_by: string | null;
  imported_at: string;
  rows_count: number;
  status: "imported" | "failed" | "draft";
  raw_metadata: Record<string, unknown>;
}

export interface DailyListItem {
  id: string;
  import_id: string;
  list_number: string | null;
  list_resolution_date: string | null;
  cable_code_raw: string;
  cable_code_normalized: string;
  inca_cavo_id: string | null;
  stato_collegamento: string | null;
  app_partenza: string | null;
  app_arrivo: string | null;
  perimetro: string | null;
  data_perimetro: string | null;
  situazione_inca: string | null;
  note: string | null;
  priority_level: string | null;
  planned_status: string | null;
  created_at: string;
}

// ── Enriched view model ────────────────────────────────────────────────────
export interface DailyItemEvidence {
  cable_event_id: string | null;
  core_event_id: string | null;
  whatsapp_message_id: string | null;
  source_type: "cable_event" | "core_event" | "whatsapp_message";
  event_kind: string;
  occurred_at: string;
  actor_label: string | null;
  raw_note: string | null;
  last_message: string | null;
  confidence: number;
  progress_percent: number | null;  // extracted from note "70%"
}

export interface DailyListItemVM extends DailyListItem {
  computed_status: DailyItemStatus;
  evidence: DailyItemEvidence[];
  confirmed_by_whatsapp: boolean;
  missing_evidence: boolean;
  has_short_issue: boolean;
  has_missing_issue: boolean;
  has_partial_progress: boolean;
  evidence_count: number;
  last_evidence_at: string | null;
  last_event_at: string | null;
  last_actor: string | null;
  last_message: string | null;
  last_event_type: string | null;
  last_confidence: number | null;
  progress_percent: number | null;
  inca_matched: boolean;
  cable_story_path: string;
  recommended_action: string;
}

export interface DailyEvidenceSyncStats {
  attempted: boolean;
  created: number;
  skipped_existing: number;
  error: string | null;
}

// ── Parsed row from PDF/Excel ──────────────────────────────────────────────
export interface ParsedListRow {
  lista: string | null;
  risoluzione: string | null;
  marca_pezzo: string;           // raw from file
  stato_collegamento: string | null;
  app_partenza: string | null;
  app_arrivo: string | null;
  perimetro: string | null;
  data_perimetro: string | null;
  situazione_inca: string | null;
  note: string | null;
}

export interface ParseResult {
  rows: ParsedListRow[];
  detected_date: string | null;
  source_kind: "pdf" | "excel";
  warnings: string[];
}

// ── Summary for Command Center ─────────────────────────────────────────────
export interface DailyListSummary {
  import_id: string;
  list_date: string | null;
  file_name: string;
  total: number;
  confirmed: number;
  likely_laid: number;
  to_verify: number;
  no_evidence: number;
  missing: number;
  blocked: number;
  outside_inca: number;
  confirmed_by_whatsapp: number;
  missing_evidence: number;
  short_issues: number;
  missing_issues: number;
  partial_progress: number;
  by_perimeter: PerimeterSummary[];
  tomorrow_actions: TomorrowAction[];
}

export interface PerimeterSummary {
  perimetro: string;
  total: number;
  confirmed: number;
  no_evidence: number;
  pct: number;
}

export interface TomorrowAction {
  kind: "missing_evidence" | "quality_issue" | "zero_zone";
  label: string;
  count: number;
  cable_codes: string[];
  perimetro: string | null;
  priority: number;
}

// ── AI-ready briefing context (Phase G) ───────────────────────────────────
export interface DailyBriefingContext {
  import_id: string;
  list_date: string | null;
  generated_at: string;
  list_summary: {
    total_cables: number;
    confirmed_field: number;
    likely_laid: number;
    to_verify: number;
    no_evidence: number;
    missing: number;
    blocked: number;
    completion_rate_pct: number;
  };
  progress_by_perimeter: Array<{
    perimetro: string;
    total: number;
    confirmed: number;
    no_evidence: number;
    pct: number;
  }>;
  critical_items: Array<{
    cable_code: string;
    perimetro: string | null;
    status: DailyItemStatus;
    note: string | null;
  }>;
  confirmed_items: Array<{
    cable_code: string;
    actor: string | null;
    at: string | null;
    perimetro: string | null;
  }>;
  missing_evidence_items: Array<{
    cable_code: string;
    perimetro: string | null;
    situazione_inca: string | null;
    planned_status: string | null;
  }>;
  to_verify_items: Array<{
    cable_code: string;
    progress_percent: number | null;
    actor: string | null;
    note: string | null;
  }>;
  recommended_actions_deterministic: string[];
}
