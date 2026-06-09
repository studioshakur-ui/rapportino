// src/modules/daily-lists/dailyLists.repo.ts
// CORE COMMAND — Daily List Engine Supabase repo.
// All reads/writes go through this module.
// INCA operations are READ-ONLY (no writes to inca_cavi).

import { supabase } from "../../lib/supabaseClient";
import type {
  DailyListImport,
  DailyListItem,
  DailyItemEvidence,
  DailyListItemVM,
  DailyEvidenceSyncStats,
} from "./dailyLists.types";
import { buildItemVM } from "./dailyLists.logic";
import { normalizePdfCableCode } from "./dailyLists.parser";
import { normalizeCableLoose, normalizeCableStrict, resolveCableMatch } from "../../core/cable/cableIdentity";
import type { ParsedListRow } from "./dailyLists.types";

interface CableEventEvidenceRow {
  id: string;
  cable_code: string;
  event_kind: string;
  occurred_at: string;
  confidence: number | null;
  note: string | null;
  source_message_id: string | null;
  core_event_id: string | null;
}

interface CoreEventEvidenceRow {
  id: string;
  cable_code_normalized: string | null;
  cable_code_raw: string | null;
  event_type: string;
  occurred_at: string;
  confidence: number | null;
  raw_text: string | null;
  source_message_id: string | null;
  payload?: Record<string, unknown> | null;
}

interface WhatsAppEvidenceRow {
  id: string;
  author: string | null;
  message_ts: string;
  raw_message: string | null;
}

interface DailyListItemEventRow {
  id: string;
  daily_list_item_id: string | null;   // DB column (matches schema)
  cable_event_id: string | null;
  core_event_id: string | null;
  whatsapp_message_id: string | null;
}

const EMPTY_SYNC_STATS: DailyEvidenceSyncStats = {
  attempted: false,
  created: 0,
  skipped_existing: 0,
  error: null,
};

// ── Read inca_cavi to build a non-destructive match index (READ-ONLY) ──────
// Loads the ACTIVE INCA file once and exposes strict/loose keys so each daily
// row can be matched with provenance + confidence (see core/cable/cableIdentity).
interface IncaMatchCandidate { id: string; strict: string; loose: string }

async function loadIncaMatchIndex(): Promise<IncaMatchCandidate[]> {
  // Active baseline = latest uploaded XLSX INCA file (matches Navemaster truth).
  const { data: file } = await supabase
    .from("inca_files")
    .select("id")
    .eq("file_type", "XLSX")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let query = supabase.from("inca_cavi").select("id, marca_cavo, codice").limit(20000);
  if (file?.id) query = query.eq("inca_file_id", file.id);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as Array<{ id: string; marca_cavo: string | null; codice: string | null }>).map((row) => {
    const source = row.marca_cavo ?? row.codice ?? "";
    return { id: row.id, strict: normalizeCableStrict(source), loose: normalizeCableLoose(source) };
  });
}

// ── Create import + items ──────────────────────────────────────────────────
export interface ImportPayload {
  file_name:     string;
  list_date:     string | null;
  source_kind:   "pdf" | "excel" | "manual";
  imported_by:   string | null;
  rows:          ParsedListRow[];
  raw_metadata?: Record<string, unknown>;
}

export async function createDailyListImport(payload: ImportPayload): Promise<string> {
  // 1. Create import record (draft)
  const { data: importRow, error: importErr } = await supabase
    .from("daily_list_imports")
    .insert({
      file_name:    payload.file_name,
      list_date:    payload.list_date,
      source_kind:  payload.source_kind,
      imported_by:  payload.imported_by,
      rows_count:   payload.rows.length,
      status:       "draft",
      raw_metadata: payload.raw_metadata ?? {},
    })
    .select("id")
    .single();

  if (importErr || !importRow) throw importErr ?? new Error("Import creation failed");
  const importId = importRow.id as string;

  // 2. Resolve INCA matches against the active baseline.
  // Strict-first (prefix preserved), single-loose at lower confidence, ambiguous
  // never auto-assigned — provenance + confidence stored per item.
  const BATCH = 20;
  const incaIndex = await loadIncaMatchIndex();
  const matches = payload.rows.map((r) => resolveCableMatch(r.marca_pezzo, incaIndex));

  // 3. Build items — sanitize all fields before insert
  const items = payload.rows.map((row, idx) => ({
    import_id:             importId,
    list_number:           row.lista,
    list_resolution_date:  safeDate(row.risoluzione),
    cable_code_raw:        row.marca_pezzo,
    cable_code_normalized: normalizePdfCableCode(row.marca_pezzo),
    inca_cavo_id:          matches[idx].incaCavoId,
    match_source:          matches[idx].source,
    match_confidence:      matches[idx].confidence,
    stato_collegamento:    safeText(row.stato_collegamento, 10),
    app_partenza:          safeText(row.app_partenza, 50),
    app_arrivo:            safeText(row.app_arrivo, 50),
    perimetro:             safeText(row.perimetro, 80),
    data_perimetro:        safeDate(row.data_perimetro),
    situazione_inca:       safeText(row.situazione_inca, 10),
    note:                  row.note ?? null,
    priority_level:        null as string | null,
    planned_status:        safeText(row.stato_collegamento, 10),
  }));

  // 4. Insert items in batches — capture error details for diagnosis
  let insertedCount = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    const { data: inserted, error } = await supabase
      .from("daily_list_items")
      .insert(items.slice(i, i + BATCH))
      .select("id");
    if (error) {
      const detail = `Batch ${i}–${i + BATCH}: ${error.message} (code ${error.code ?? "?"})`;
      await supabase
        .from("daily_list_imports")
        .update({ status: "failed", raw_metadata: { error: detail } })
        .eq("id", importId);
      throw new Error(detail);
    }
    insertedCount += (inserted ?? []).length;
  }

  // 5. Mark imported
  const { error: updateErr } = await supabase
    .from("daily_list_imports")
    .update({ status: "imported", rows_count: insertedCount })
    .eq("id", importId);

  if (updateErr) throw updateErr;

  // 6. Sync evidence links — non-fatal
  try {
    await syncDailyListEvidenceLinks(importId);
  } catch {
    // Evidence sync errors don't block the import
    console.warn("[dailyLists] syncDailyListEvidenceLinks failed (non-fatal)");
  }

  return importId;
}

// ── List recent imports ────────────────────────────────────────────────────
export async function listRecentImports(limit = 20): Promise<DailyListImport[]> {
  const { data, error } = await supabase
    .from("daily_list_imports")
    .select("*")
    .order("imported_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DailyListImport[];
}

export async function getImport(importId: string): Promise<DailyListImport | null> {
  const { data, error } = await supabase
    .from("daily_list_imports")
    .select("*")
    .eq("id", importId)
    .maybeSingle();
  if (error) throw error;
  return data as DailyListImport | null;
}

// ── Fetch items for an import ──────────────────────────────────────────────
export async function listItemsByImport(importId: string): Promise<DailyListItem[]> {
  const { data, error } = await supabase
    .from("daily_list_items")
    .select("*")
    .eq("import_id", importId)
    .order("perimetro", { ascending: true })
    .order("cable_code_normalized", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DailyListItem[];
}

// ── Fetch WhatsApp evidence for a list of cable codes ─────────────────────
// READS cable_events (never writes)
export async function fetchEvidenceForCodes(
  codes: string[]
): Promise<Map<string, DailyItemEvidence[]>> {
  if (codes.length === 0) return new Map();

  const result = new Map<string, DailyItemEvidence[]>();

  const { data: cableRows, error: cableError } = await supabase
    .from("cable_events")
    .select("id,cable_code,event_kind,occurred_at,confidence,note,source_message_id,core_event_id")
    .in("cable_code", codes)
    .order("occurred_at", { ascending: false })
    .limit(2000);

  if (cableError) throw cableError;

  const msgIds = Array.from(
    new Set(
      (cableRows ?? [])
        .map((e) => e.source_message_id as string | null)
        .filter((id): id is string => Boolean(id))
    )
  );

  const msgMap = new Map<string, WhatsAppEvidenceRow>();
  if (msgIds.length > 0) {
    const { data: msgs } = await supabase
      .from("whatsapp_messages")
      .select("id,author,message_ts,raw_message")
      .in("id", msgIds);
    for (const m of msgs ?? []) {
      msgMap.set(m.id as string, m as WhatsAppEvidenceRow);
    }
  }

  for (const row of (cableRows ?? []) as CableEventEvidenceRow[]) {
    const code = row.cable_code as string;
    const list = result.get(code) ?? [];
    const rawNote = row.note as string | null;
    const pct = extractPercentFromNote(rawNote);
    const message = row.source_message_id ? msgMap.get(row.source_message_id) : null;
    list.push({
      cable_event_id:   row.id as string,
      core_event_id:    row.core_event_id,
      whatsapp_message_id: row.source_message_id,
      source_type:      "cable_event",
      event_kind:       row.event_kind as string,
      occurred_at:      row.occurred_at as string,
      actor_label:      message?.author ?? null,
      raw_note:         rawNote,
      last_message:     message?.raw_message ?? rawNote,
      confidence:       Number(row.confidence ?? 0),
      progress_percent: pct,
      verification_status: null,
    });
    result.set(code, list);
  }

  await appendCoreEventEvidence(result, codes);
  await appendDirectWhatsAppEvidence(result, codes);

  for (const [code, evidence] of result.entries()) {
    result.set(code, dedupeEvidence(evidence));
  }

  return result;
}

async function appendCoreEventEvidence(
  result: Map<string, DailyItemEvidence[]>,
  codes: string[]
): Promise<void> {
  const { data, error } = await supabase
    .from("core_events")
    .select("id,cable_code_normalized,cable_code_raw,event_type,occurred_at,confidence,raw_text,source_message_id,payload")
    .in("cable_code_normalized", codes)
    .order("occurred_at", { ascending: false })
    .limit(2000);

  if (error) throw error;

  const msgIds = Array.from(new Set(
    ((data ?? []) as CoreEventEvidenceRow[])
      .map((row) => row.source_message_id)
      .filter((id): id is string => Boolean(id))
  ));

  const msgMap = new Map<string, WhatsAppEvidenceRow>();
  if (msgIds.length > 0) {
    const { data: msgs } = await supabase
      .from("whatsapp_messages")
      .select("id,author,message_ts,raw_message")
      .in("id", msgIds);
    for (const msg of (msgs ?? []) as WhatsAppEvidenceRow[]) {
      msgMap.set(msg.id, msg);
    }
  }

  for (const row of (data ?? []) as CoreEventEvidenceRow[]) {
    const code = row.cable_code_normalized ?? normalizePdfCableCode(row.cable_code_raw ?? "");
    if (!code || !codes.includes(code)) continue;
    const message = row.source_message_id ? msgMap.get(row.source_message_id) : null;
    const rawNote = row.raw_text ?? message?.raw_message ?? null;
    const list = result.get(code) ?? [];
    list.push({
      cable_event_id: null,
      core_event_id: row.id,
      whatsapp_message_id: row.source_message_id,
      source_type:
        row.event_type === "FIELD_VERIFIED" ||
        String((row.payload ?? null)?.verification_source ?? "").toLowerCase() === "manual"
          ? "manual"
          : "core_event",
      event_kind: row.event_type,
      occurred_at: row.occurred_at,
      actor_label: message?.author ?? null,
      raw_note: rawNote,
      last_message: message?.raw_message ?? rawNote,
      confidence: Number(row.confidence ?? 0),
      progress_percent: extractPercentFromNote(rawNote),
      verification_status: typeof row.payload?.verification_status === "string" ? row.payload.verification_status : null,
    });
    result.set(code, list);
  }
}

async function appendDirectWhatsAppEvidence(
  result: Map<string, DailyItemEvidence[]>,
  codes: string[]
): Promise<void> {
  const BATCH = 12;
  for (let i = 0; i < codes.length; i += BATCH) {
    const batch = codes.slice(i, i + BATCH);
    const orFilter = batch
      .flatMap((code) =>
        evidenceSearchVariants(code).map((variant) => `raw_message.ilike.%${escapeIlikeValue(variant)}%`)
      )
      .join(",");

    if (!orFilter) continue;

    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("id,author,message_ts,raw_message")
      .or(orFilter)
      .order("message_ts", { ascending: false })
      .limit(500);

    if (error) throw error;

    for (const msg of (data ?? []) as WhatsAppEvidenceRow[]) {
      const rawMessage = msg.raw_message ?? "";
      const matchedCode = batch.find((code) =>
        evidenceSearchVariants(code).some((variant) =>
          rawMessage.toUpperCase().includes(variant.toUpperCase())
        )
      );
      if (!matchedCode) continue;

      const list = result.get(matchedCode) ?? [];
      list.push({
        cable_event_id: null,
        core_event_id: null,
        whatsapp_message_id: msg.id,
        source_type: "whatsapp_message",
        event_kind: "WHATSAPP_MESSAGE",
        occurred_at: msg.message_ts,
        actor_label: msg.author,
        raw_note: rawMessage,
        last_message: rawMessage,
        confidence: 0.55,
        progress_percent: extractPercentFromNote(rawMessage),
        verification_status: null,
      });
      result.set(matchedCode, list);
    }
  }
}

function evidenceSearchVariants(code: string): string[] {
  const compact = code.replace(/\s+/g, "");
  return Array.from(new Set([code, compact])).filter((v) => v.length >= 4);
}

function escapeIlikeValue(value: string): string {
  return value.replace(/[%(),]/g, "\\$&");
}

function dedupeEvidence(evidence: DailyItemEvidence[]): DailyItemEvidence[] {
  const seen = new Set<string>();
  const deduped: DailyItemEvidence[] = [];
  for (const item of evidence.sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  )) {
    const key = item.cable_event_id
      ?? item.core_event_id
      ?? item.whatsapp_message_id
      ?? `${item.event_kind}:${item.occurred_at}:${item.raw_note ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

export async function syncDailyListEvidenceLinks(
  importId: string
): Promise<DailyEvidenceSyncStats> {
  const items = await listItemsByImport(importId);
  if (items.length === 0) return { ...EMPTY_SYNC_STATS, attempted: true };

  const evidenceMap = await fetchEvidenceForCodes(
    Array.from(new Set(items.map((item) => item.cable_code_normalized)))
  );

  return persistDailyListItemEvents(items, evidenceMap);
}

async function persistDailyListItemEvents(
  items: DailyListItem[],
  evidenceMap: Map<string, DailyItemEvidence[]>
): Promise<DailyEvidenceSyncStats> {
  const itemIds = items.map((item) => item.id);

  try {
    const { data: existingRows, error: existingError } = await supabase
      .from("daily_list_item_events")
      .select("id,daily_list_item_id,cable_event_id,core_event_id,whatsapp_message_id")
      .in("daily_list_item_id", itemIds)
      .limit(5000);

    if (existingError) {
      return { attempted: true, created: 0, skipped_existing: 0, error: existingError.message };
    }

    const existingKeys = new Set(
      ((existingRows ?? []) as DailyListItemEventRow[]).map((row) => evidencePersistKey({
        daily_list_item_id: row.daily_list_item_id,
        cable_event_id:     row.cable_event_id,
        core_event_id:      row.core_event_id,
        whatsapp_message_id: row.whatsapp_message_id,
      }))
    );

    const inserts: Record<string, unknown>[] = [];
    let skippedExisting = 0;

    for (const item of items) {
      const evidence = evidenceMap.get(item.cable_code_normalized) ?? [];
      for (const row of evidence) {
        // Columns aligned with the daily_list_item_events schema:
        //   daily_list_item_id, occurred_at, import_id, cable_code_normalized.
        const payload = {
          import_id:             item.import_id,
          daily_list_item_id:    item.id,
          cable_code_normalized: item.cable_code_normalized,
          cable_event_id:        row.cable_event_id,
          core_event_id:         row.core_event_id,
          whatsapp_message_id:   row.whatsapp_message_id,
          source_type:           row.source_type,
          event_kind:            row.event_kind,
          occurred_at:           row.occurred_at,
          actor_label:           row.actor_label,
          raw_note:              row.raw_note,
          confidence:            row.confidence,
          progress_percent:      row.progress_percent,
        };
        const key = evidencePersistKey({ daily_list_item_id: item.id, cable_event_id: payload.cable_event_id, core_event_id: payload.core_event_id, whatsapp_message_id: payload.whatsapp_message_id });
        if (existingKeys.has(key)) {
          skippedExisting++;
          continue;
        }
        existingKeys.add(key);
        inserts.push(payload);
      }
    }

    if (inserts.length === 0) {
      return { attempted: true, created: 0, skipped_existing: skippedExisting, error: null };
    }

    let created = 0;
    const BATCH = 100;
    for (let i = 0; i < inserts.length; i += BATCH) {
      const { data, error } = await supabase
        .from("daily_list_item_events")
        .insert(inserts.slice(i, i + BATCH))
        .select("id");
      if (error) {
        return { attempted: true, created, skipped_existing: skippedExisting, error: error.message };
      }
      created += (data ?? []).length;
    }

    return { attempted: true, created, skipped_existing: skippedExisting, error: null };
  } catch (error) {
    return {
      attempted: true,
      created: 0,
      skipped_existing: 0,
      error: error instanceof Error ? error.message : "Daily evidence sync failed",
    };
  }
}

function evidencePersistKey(row: {
  daily_list_item_id: string | null;
  cable_event_id: string | null;
  core_event_id: string | null;
  whatsapp_message_id: string | null;
}): string {
  return [
    row.daily_list_item_id,
    row.cable_event_id ?? "no-cable",
    row.core_event_id ?? "no-core",
    row.whatsapp_message_id ?? "no-message",
  ].join(":");
}

function extractPercentFromNote(note: string | null): number | null {
  if (!note) return null;
  const m = note.match(/(\d{1,3})\s*%/);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  return v >= 0 && v <= 100 ? v : null;
}

// ── Fetch blocking findings for cables ────────────────────────────────────
export async function fetchBlockingFindings(codes: string[]): Promise<Set<string>> {
  if (codes.length === 0) return new Set();
  const { data } = await supabase
    .from("agent_findings")
    .select("entity_id")
    .eq("entity_type", "cable_code")
    .eq("severity", "block")
    .in("entity_id", codes);
  return new Set((data ?? []).map((r) => r.entity_id as string));
}

// ── Build enriched view models ─────────────────────────────────────────────
export async function loadItemsWithEvidence(
  importId: string
): Promise<DailyListItemVM[]> {
  const items = await listItemsByImport(importId);
  if (items.length === 0) return [];

  const codes   = Array.from(new Set(items.map((i) => i.cable_code_normalized)));
  const [evidenceMap, blockingCodes] = await Promise.all([
    fetchEvidenceForCodes(codes),
    fetchBlockingFindings(codes),
  ]);

  void persistDailyListItemEvents(items, evidenceMap);

  return items.map((item) => {
    const evidence = evidenceMap.get(item.cable_code_normalized) ?? [];
    const hasBlocking = blockingCodes.has(item.cable_code_normalized);
    return buildItemVM(item, evidence, hasBlocking);
  });
}

// ── Utility ────────────────────────────────────────────────────────────────

/** Return a valid ISO date string or null — rejects strings that look like cable codes */
function safeDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // Must match YYYY-MM-DD or DD/MM/YYYY — reject anything with letters
  if (/[A-Za-z]/.test(s)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/** Truncate text field to maxLen chars, return null if empty or looks like it's a date/code mixup */
function safeText(raw: string | null | undefined, maxLen: number): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  return s.slice(0, maxLen);
}

// ── Delete import ──────────────────────────────────────────────────────────
export async function deleteImport(importId: string): Promise<void> {
  const { error } = await supabase
    .from("daily_list_imports")
    .delete()
    .eq("id", importId);
  if (error) throw error;
}
