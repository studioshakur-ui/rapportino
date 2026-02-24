// src/components/rapportino/page/useRapportinoActions.js
/* eslint-disable no-console */

import type { Dispatch, SetStateAction } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { parseNumeric } from "../../../rapportinoUtils";
import { normalizeOperatorLabel } from "../utils/normalizeOperatorLabel";
import { normalizeLegacyTempoAlignment, joinLines } from "./rapportinoHelpers";

/**
 * Canonical:
 * - In DB we store operator mapping in rapportino_row_operators (per rapportino_row).
 *   Table columns (confirmed):
 *     id, rapportino_row_id, operator_id, line_index, tempo_raw, tempo_hours, created_at, updated_at
 * - In UI, we keep row.operator_items as canonical items:
 *   [{ operator_id, label, tempo_raw, tempo_hours, line_index }]
 *
 * DB constraints to respect (confirmed):
 * - rapportini.data is NOT NULL
 * - rapportino_rows.row_index is NOT NULL
 * - rapportino_rows.rapportino_id is NOT NULL
 */

type OperatorItem = {
  operator_id?: unknown;
  label?: unknown;
  tempo_raw?: unknown;
  tempo_hours?: unknown;
  line_index?: unknown;
};
type RowRecord = Record<string, unknown> & {
  operator_items?: OperatorItem[];
  operatori?: unknown;
  tempo?: unknown;
  categoria?: unknown;
  descrizione?: unknown;
  descrizione_attivita?: unknown;
  previsto?: unknown;
  prodotto?: unknown;
  note?: unknown;
  activity_id?: unknown;
};
type SetRows = Dispatch<SetStateAction<RowRecord[]>>;

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

function safeNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function getOperatorId(op: unknown): unknown {
  const obj = op as { operator_id?: unknown; id?: unknown } | null | undefined;
  return obj?.operator_id || obj?.id || null;
}

function getOperatorLabel(op: unknown): string {
  if (!op) return "";
  const obj = op as Record<string, unknown>;

  // Common shapes across UI/components:
  // - { name }
  // - { label }
  // - { nome, cognome }
  // - { first_name, last_name }
  const label = safeStr(obj.label);
  if (label) return normalizeOperatorLabel(label);

  const name = safeStr(obj.name);
  if (name) return normalizeOperatorLabel(name);

  const cognome = safeStr(obj.cognome || obj.last_name || obj.lastname);
  const nome = safeStr(obj.nome || obj.first_name || obj.firstname);
  const full = safeStr(`${cognome} ${nome}`.trim());
  if (full) return normalizeOperatorLabel(full);

  return "";
}

/**
 * Add row from Catalog (RapportinoPage expects this name)
 */
export function addRowFromCatalog(
  { setRows }: { setRows: SetRows },
  activity: Record<string, unknown> | null | undefined
): void {
  const categoria = safeStr(activity?.categoria ?? activity?.category ?? "");
  const descrizione_attivita = safeStr(
    activity?.descrizione_attivita ?? activity?.descrizione ?? activity?.label ?? activity?.name ?? ""
  );

  // previsto may arrive numeric or string; keep raw but DO NOT force "" into numeric later
  const previsto = activity?.previsto ?? activity?.planned ?? null;
  const note = safeStr(activity?.note ?? "");
  const activity_id = activity?.id ?? activity?.activity_id ?? null;

  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    next.push({
      id: `tmp_${crypto.randomUUID()}`,
      categoria,
      descrizione_attivita,
      operatori: "",
      tempo: "",
      previsto,
      prodotto: null,
      note,
      activity_id: activity_id ? String(activity_id) : null,
      operator_items: [], // canonical enabled
    });
    return next;
  });
}

export function removeRow({ setRows }: { setRows: SetRows }, rowIndex: number): void {
  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    if (rowIndex < 0 || rowIndex >= next.length) return prev;
    next.splice(rowIndex, 1);
    return next;
  });
}

export function updateCell(
  { setRows }: { setRows: SetRows },
  rowIndex: number,
  key: string,
  value: unknown
): void {
  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    if (rowIndex < 0 || rowIndex >= next.length) return prev;
    next[rowIndex] = { ...next[rowIndex], [key]: value };
    return next;
  });
}

export function addOperatorToRow(
  { setRows }: { setRows: SetRows },
  rowIndex: number,
  operator: unknown
): void {
  const operator_id = getOperatorId(operator);
  const label = getOperatorLabel(operator);
  if (!operator_id || !label) return;

  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    const row = next[rowIndex];
    if (!row) return prev;

    const items = Array.isArray(row.operator_items) ? [...row.operator_items] : [];

    // prevent duplicates
    if (items.some((it) => String(it?.operator_id) === String(operator_id))) return prev;

    const line_index = items.length;

    items.push({
      operator_id,
      label,
      tempo_raw: "",
      tempo_hours: null,
      line_index,
    });

    // Keep legacy fields in sync for display / exports
    const operatori = joinLines(items.map((it) => it.label));
    const tempo = joinLines(items.map((it) => String(it.tempo_raw ?? "")));

    next[rowIndex] = {
      ...row,
      operator_items: items,
      operatori,
      tempo,
    };

    return next;
  });
}

export function removeOperatorFromRow(
  { setRows }: { setRows: SetRows },
  rowIndex: number,
  operator_id: unknown
): void {
  if (!operator_id) return;

  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    const row = next[rowIndex];
    if (!row) return prev;

    const items = Array.isArray(row.operator_items) ? [...row.operator_items] : [];

    const filtered = items.filter((it) => String(it?.operator_id) !== String(operator_id));
    const reindexed = filtered.map((it, idx) => ({
      ...it,
      line_index: idx,
    }));

    const operatori = joinLines(reindexed.map((it) => it.label));
    const tempo = joinLines(reindexed.map((it) => String(it.tempo_raw ?? "")));

    next[rowIndex] = {
      ...row,
      operator_items: reindexed,
      operatori,
      tempo,
    };

    return next;
  });
}

/**
 * RapportinoPage uses this name from TempoPickerModal flow:
 * setCanonicalTempoForLine({ setRows }, rowIndex, lineIndex, tempoRaw)
 */
export function setCanonicalTempoForLine(
  { setRows }: { setRows: SetRows },
  rowIndex: number,
  lineIndex: number,
  tempoRaw: unknown
): void {
  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    const row = next[rowIndex];
    if (!row) return prev;

    const items = Array.isArray(row.operator_items) ? [...row.operator_items] : [];
    if (lineIndex < 0 || lineIndex >= items.length) return prev;

    const tRaw = String(tempoRaw ?? "").trim();
    const hours = tRaw ? safeNumOrNull(tRaw) : null;

    items[lineIndex] = {
      ...items[lineIndex],
      tempo_raw: tRaw,
      tempo_hours: isFiniteNumber(hours) ? hours : null,
      line_index: lineIndex,
    };

    // keep legacy sync for print/export
    const operatori = joinLines(items.map((it) => it.label));
    const tempo = joinLines(items.map((it) => String(it.tempo_raw ?? "")));

    next[rowIndex] = { ...row, operator_items: items, operatori, tempo };
    return next;
  });
}

export function handleTempoChangeLegacy(
  { setRows }: { setRows: SetRows },
  rowIndex: number,
  value: unknown
): void {
  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    const row = next[rowIndex];
    if (!row) return prev;

    const items = Array.isArray(row.operator_items) ? row.operator_items : [];
    if (items.length > 0) return prev; // locked when canonical exists

    next[rowIndex] = { ...row, tempo: value };
    return next;
  });
}

/**
 * Robust toggle: supports BOTH call signatures:
 * - toggleOperatorInRow({setRows}, rowIndex, action, operator)
 * - toggleOperatorInRow({setRows}, rowIndex, operator, action)
 */
export function toggleOperatorInRow(
  { setRows }: { setRows: SetRows },
  rowIndex: number,
  a: unknown,
  b: unknown
): void {
  let action: unknown;
  let operator: unknown;

  if (typeof a === "string") {
    action = a;
    operator = b;
  } else {
    operator = a;
    action = b;
  }

  const act = String(action || "toggle").toLowerCase();

  const operator_id = getOperatorId(operator);
  const label = getOperatorLabel(operator);
  if (!operator_id || !label) return;

  if (act === "remove") {
    removeOperatorFromRow({ setRows }, rowIndex, operator_id);
    return;
  }

  // detect exists
  let currentItems: OperatorItem[] = [];
  setRows((prev) => {
    const row = Array.isArray(prev) ? prev[rowIndex] : null;
    currentItems = Array.isArray(row?.operator_items) ? row.operator_items : [];
    return prev;
  });

  const exists =
    Array.isArray(currentItems) && currentItems.some((it) => String(it?.operator_id) === String(operator_id));

  if (exists && act !== "add") {
    removeOperatorFromRow({ setRows }, rowIndex, operator_id);
    return;
  }

  if (!exists) {
    // pass a shape that addOperatorToRow understands
    addOperatorToRow({ setRows }, rowIndex, { id: operator_id, name: label });
  }
}

/**
 * saveRapportino — hardened + aligned to real DB schema
 *
 * Tables:
 * - rapportini: requires data NOT NULL (date)
 * - rapportino_rows: row_index NOT NULL, previsto numeric, prodotto numeric, activity_id uuid, position integer
 * - rapportino_row_operators: has rapportino_row_id (uuid) + operator_id (uuid)
 */
export async function saveRapportino({
  actorId,
  effectiveCapoId,
  actingForCapoId,
  crewRole,
  reportDate,
  status,
  forcedStatus,
  costr,
  commessa,
  prodottoTotale,
  rows,
  rapportinoId,
  setRapportinoId,
  setRapportinoCrewRole,
  setStatus,
  loadReturnedInbox,
  setSuccessMessage,
}: {
  actorId: unknown;
  effectiveCapoId: unknown;
  actingForCapoId?: unknown;
  crewRole: unknown;
  reportDate: unknown;
  status?: unknown;
  forcedStatus?: unknown;
  costr?: unknown;
  commessa?: unknown;
  prodottoTotale?: unknown;
  rows?: unknown;
  rapportinoId?: unknown;
  setRapportinoId?: (id: string) => void;
  setRapportinoCrewRole?: (role: unknown) => void;
  setStatus?: (status: string) => void;
  loadReturnedInbox?: () => Promise<unknown> | void;
  setSuccessMessage?: (message: string) => void;
}): Promise<{ rapportinoId: string | null; status: string }> {
  if (!actorId) throw new Error("Missing actorId");
  if (!effectiveCapoId) throw new Error("Missing effectiveCapoId");
  if (!crewRole) throw new Error("Missing crewRole");
  if (!reportDate) throw new Error("Missing reportDate");

  const nextStatus = (forcedStatus || status || "DRAFT") as string;

  // 1) upsert rapportino header (create or update)
  let rid = rapportinoId ? String(rapportinoId) : null;

  const headerPayload = {
    capo_id: effectiveCapoId,
    crew_role: crewRole,
    // IMPORTANT: DB has BOTH `data` and `report_date` -> `data` is NOT NULL
    data: reportDate,
    report_date: reportDate,
    costr: safeStr(costr),
    commessa: safeStr(commessa),
    status: nextStatus,
    prodotto_totale: safeNumOrNull(prodottoTotale) ?? 0,
    created_by: actorId,
    acting_for_capo_id: actingForCapoId ?? null,
    last_edited_by: actorId,
  };

  if (!rid) {
    const { data, error } = await supabase.from("rapportini").insert([headerPayload]).select("id, crew_role, status").single();
    if (error) throw error;

    rid = String(data?.id);
    if (!rid) throw new Error("Insert rapportino failed: missing id");

    setRapportinoId?.(rid);
    setRapportinoCrewRole?.(data?.crew_role || crewRole);
    setStatus?.(data?.status || nextStatus);
  } else {
    const { data, error } = await supabase
      .from("rapportini")
      .update({
        // keep data aligned too
        data: reportDate,
        report_date: reportDate,
        costr: safeStr(costr),
        commessa: safeStr(commessa),
        status: nextStatus,
        prodotto_totale: safeNumOrNull(prodottoTotale) ?? 0,
        last_edited_by: actorId,
      })
      .eq("id", rid)
      .select("id, crew_role, status")
      .single();

    if (error) throw error;

    setRapportinoId?.(String(data?.id || rid));
    setRapportinoCrewRole?.(data?.crew_role || crewRole);
    setStatus?.(data?.status || nextStatus);
  }

  // 2) replace rows (delete+insert)
  const safeRows: RowRecord[] = Array.isArray(rows) ? (rows as RowRecord[]) : [];

  // 2a) prefetch existing row ids to delete operator mappings safely (schema has rapportino_row_id)
  const { data: existingRowsData, error: existingRowsErr } = await supabase
    .from("rapportino_rows")
    .select("id")
    .eq("rapportino_id", rid);

  if (existingRowsErr) throw existingRowsErr;

  const existingRowIds = (Array.isArray(existingRowsData) ? existingRowsData : [])
    .map((x) => x?.id)
    .filter(Boolean)
    .map((x) => String(x));

  if (existingRowIds.length > 0) {
    const { error: delOpsErr } = await supabase.from("rapportino_row_operators").delete().in("rapportino_row_id", existingRowIds);
    if (delOpsErr) throw delOpsErr;
  }

  // 2b) delete existing rows
  {
    const { error } = await supabase.from("rapportino_rows").delete().eq("rapportino_id", rid);
    if (error) throw error;
  }

  // 2c) insert new rows with deterministic position AND REQUIRED row_index (NOT NULL)
  const insertRowsPayload = safeRows.map((r, idx) => {
    const descrizione = safeStr(r?.descrizione ?? r?.descrizione_attivita ?? "");

    // legacy tempo must be aligned if not canonical
    const operatoriText = safeStr(r?.operatori);
    const tempoText = safeStr(r?.tempo);
    const alignedTempo = normalizeLegacyTempoAlignment(operatoriText, tempoText);

    return {
      rapportino_id: rid,
      // REQUIRED by schema:
      row_index: idx + 1, // 1-based, stable
      // Optional but useful:
      position: idx, // keep order for UI queries
      categoria: safeStr(r?.categoria),
      descrizione,
      operatori: operatoriText,
      tempo: alignedTempo,
      // IMPORTANT: numeric columns must be number or null (never "")
      previsto: safeNumOrNull(r?.previsto),
      prodotto: safeNumOrNull(r?.prodotto),
      note: safeStr(r?.note),
      activity_id: r?.activity_id ? String(r.activity_id) : null,
    };
  });

  let insertedRows: Array<Record<string, unknown>> = [];
  if (insertRowsPayload.length > 0) {
    const { data, error } = await supabase.from("rapportino_rows").insert(insertRowsPayload).select("id, position, row_index");
    if (error) throw error;
    insertedRows = Array.isArray(data) ? data : [];
  }

  // map position -> rapportino_row_id
  const rowIdByPos = new Map(insertedRows.map((x) => [Number(x.position), String(x.id)]));

  // 3) insert canonical operator mappings (rapportino_row_operators.rapportino_row_id)
  const opInsert = [];
  for (let i = 0; i < safeRows.length; i++) {
    const row = safeRows[i];
    const rapportino_row_id = rowIdByPos.get(i);
    if (!rapportino_row_id) continue;

    const items = Array.isArray(row?.operator_items) ? row.operator_items : [];
    if (!items.length) continue;

    for (let li = 0; li < items.length; li++) {
      const it = items[li];
      const operator_id = it?.operator_id;
      if (!operator_id) continue;

      const tempo_raw = safeStr(it?.tempo_raw);
      const tempo_hours = isFiniteNumber(it?.tempo_hours) ? it.tempo_hours : tempo_raw ? parseNumeric(tempo_raw) : null;

      opInsert.push({
        rapportino_row_id,
        operator_id,
        line_index: li,
        tempo_raw,
        tempo_hours: isFiniteNumber(tempo_hours) ? tempo_hours : null,
      });
    }
  }

  if (opInsert.length > 0) {
    const { error } = await supabase.from("rapportino_row_operators").insert(opInsert);
    if (error) throw error;
  }

  // 4) refresh returned inbox (best effort)
  try {
    await loadReturnedInbox?.();
  } catch {
    // ignore
  }

  setSuccessMessage?.("Salvataggio riuscito.");
  return { rapportinoId: rid, status: nextStatus };
}
