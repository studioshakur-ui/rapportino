// src/components/rapportino/page/useRapportinoActions.js
/* eslint-disable no-console */

import { supabase } from "../../../lib/supabaseClient";
import { parseNumeric } from "../../../rapportinoUtils";
import { normalizeOperatorLabel } from "../utils/normalizeOperatorLabel";
import { normalizeLegacyTempoAlignment, splitLinesKeepEmpties, joinLines } from "./rapportinoHelpers";

/**
 * Canonical:
 * - In DB we store operator mapping in rapportino_row_operators (per row).
 * - In UI, we keep row.operator_items as canonical items:
 *   [{ operator_id, label, tempo_raw, tempo_hours, line_index }]
 */

function safeStr(v) {
  return String(v ?? "").trim();
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Add empty row (manual)
 */
export function addRow({ setRows }) {
  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    next.push({
      id: `tmp_${crypto.randomUUID()}`,
      categoria: "",
      descrizione_attivita: "",
      operatori: "",
      tempo: "",
      previsto: "",
      prodotto: "",
      note: "",
      operator_items: [], // canonical enabled
    });
    return next;
  });
}

/**
 * Add row from Catalog (RapportinoPage expects this name)
 */
export function addRowFromCatalog({ setRows }, activity) {
  const categoria = safeStr(activity?.categoria ?? activity?.category ?? "");
  const descrizione_attivita = safeStr(
    activity?.descrizione_attivita ?? activity?.descrizione ?? activity?.label ?? activity?.name ?? ""
  );
  const previsto = activity?.previsto ?? activity?.planned ?? "";
  const note = safeStr(activity?.note ?? "");

  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    next.push({
      id: `tmp_${crypto.randomUUID()}`,
      categoria,
      descrizione_attivita,
      operatori: "",
      tempo: "",
      previsto,
      prodotto: "",
      note,
      operator_items: [], // canonical enabled
    });
    return next;
  });
}

export function removeRow({ setRows }, rowIndex) {
  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    if (rowIndex < 0 || rowIndex >= next.length) return prev;
    next.splice(rowIndex, 1);
    return next;
  });
}

export function updateCell({ setRows }, rowIndex, key, value) {
  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    if (rowIndex < 0 || rowIndex >= next.length) return prev;
    next[rowIndex] = { ...next[rowIndex], [key]: value };
    return next;
  });
}

export function addOperatorToRow({ setRows }, rowIndex, operator) {
  const operator_id = operator?.operator_id || operator?.id || null;
  const label = normalizeOperatorLabel(operator?.label || operator?.name || "");
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

export function removeOperatorFromRow({ setRows }, rowIndex, operator_id) {
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

export function handleTempoChangeCanonical({ setRows }, rowIndex, operator_id, tempo_raw) {
  if (!operator_id) return;

  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    const row = next[rowIndex];
    if (!row) return prev;

    const items = Array.isArray(row.operator_items) ? [...row.operator_items] : [];

    const idx = items.findIndex((it) => String(it?.operator_id) === String(operator_id));
    if (idx < 0) return prev;

    const tRaw = String(tempo_raw ?? "").trim();
    const hours = tRaw ? safeNum(tRaw.replace(",", ".")) : null;

    items[idx] = {
      ...items[idx],
      tempo_raw: tRaw,
      tempo_hours: isFiniteNumber(hours) ? hours : null,
    };

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

/**
 * RapportinoPage uses this name from TempoPickerModal flow:
 * setCanonicalTempoForLine({ setRows }, rowIndex, lineIndex, tempoRaw)
 */
export function setCanonicalTempoForLine({ setRows }, rowIndex, lineIndex, tempoRaw) {
  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    const row = next[rowIndex];
    if (!row) return prev;

    const items = Array.isArray(row.operator_items) ? [...row.operator_items] : [];
    if (lineIndex < 0 || lineIndex >= items.length) return prev;

    const tRaw = String(tempoRaw ?? "").trim();
    const hours = tRaw ? safeNum(tRaw.replace(",", ".")) : null;

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

export function handleTempoChangeLegacy({ setRows }, rowIndex, value) {
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
 * - toggleOperatorInRow({setRows}, rowIndex, operator, action)   <-- your RapportinoPage uses this sometimes
 */
export function toggleOperatorInRow({ setRows }, rowIndex, a, b) {
  let action;
  let operator;

  if (typeof a === "string") {
    action = a;
    operator = b;
  } else {
    operator = a;
    action = b;
  }

  // normalize action
  const act = String(action || "toggle").toLowerCase();

  const operator_id = operator?.operator_id || operator?.id || null;
  const label = normalizeOperatorLabel(operator?.label || operator?.name || "");
  if (!operator_id || !label) return;

  if (act === "remove") {
    removeOperatorFromRow({ setRows }, rowIndex, operator_id);
    return;
  }

  // detect exists
  let currentItems = [];
  setRows((prev) => {
    const row = Array.isArray(prev) ? prev[rowIndex] : null;
    currentItems = Array.isArray(row?.operator_items) ? row.operator_items : [];
    return prev;
  });

  const exists = Array.isArray(currentItems) && currentItems.some((it) => String(it?.operator_id) === String(operator_id));

  if (exists && act !== "add") {
    removeOperatorFromRow({ setRows }, rowIndex, operator_id);
    return;
  }

  if (!exists) {
    addOperatorToRow({ setRows }, rowIndex, { id: operator_id, name: label });
  }
}

/**
 * saveRapportino — minimal but consistent with your schema usage in useRapportinoData:
 * - rapportini
 * - rapportino_rows
 * - rapportino_row_operators
 *
 * NOTE:
 * This uses delete+insert strategy for rows/operators (deterministic).
 * If your RLS forbids delete, we'll switch to upsert-by-id, but this is the cleanest baseline.
 */
export async function saveRapportino({
  profileId,
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
}) {
  if (!profileId) throw new Error("Missing profileId");
  if (!crewRole) throw new Error("Missing crewRole");
  if (!reportDate) throw new Error("Missing reportDate");

  const nextStatus = forcedStatus || status || "DRAFT";

  // 1) upsert rapportino header (create or update)
  let rid = rapportinoId ? String(rapportinoId) : null;

  if (!rid) {
    const { data, error } = await supabase
      .from("rapportini")
      .insert([
        {
          capo_id: profileId,
          crew_role: crewRole,
          report_date: reportDate,
          costr: safeStr(costr),
          commessa: safeStr(commessa),
          status: nextStatus,
          prodotto_totale: Number(prodottoTotale || 0),
        },
      ])
      .select("id, crew_role, status")
      .single();

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
        costr: safeStr(costr),
        commessa: safeStr(commessa),
        status: nextStatus,
        prodotto_totale: Number(prodottoTotale || 0),
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
  const safeRows = Array.isArray(rows) ? rows : [];

  // delete existing rows
  {
    const { error } = await supabase.from("rapportino_rows").delete().eq("rapportino_id", rid);
    if (error) throw error;
  }

  // insert new rows with deterministic position
  const insertRowsPayload = safeRows.map((r, idx) => {
    // support both keys: descrizione_attivita (DB) and descrizione (UI)
    const descrizione_attivita = safeStr(r?.descrizione_attivita ?? r?.descrizione ?? "");

    // legacy tempo must be aligned if not canonical
    const operatoriText = safeStr(r?.operatori);
    const tempoText = safeStr(r?.tempo);
    const alignedTempo = normalizeLegacyTempoAlignment(operatoriText, tempoText);

    return {
      rapportino_id: rid,
      position: idx,
      categoria: safeStr(r?.categoria),
      descrizione_attivita,
      operatori: operatoriText,
      tempo: alignedTempo,
      previsto: r?.previsto ?? "",
      prodotto: r?.prodotto ?? "",
      note: safeStr(r?.note),
    };
  });

  let insertedRows = [];
  if (insertRowsPayload.length > 0) {
    const { data, error } = await supabase
      .from("rapportino_rows")
      .insert(insertRowsPayload)
      .select("id, position");

    if (error) throw error;
    insertedRows = Array.isArray(data) ? data : [];
  }

  // map position -> row_id
  const rowIdByPos = new Map(insertedRows.map((x) => [Number(x.position), String(x.id)]));

  // 3) replace canonical operator mappings
  {
    const { error } = await supabase.from("rapportino_row_operators").delete().eq("rapportino_id", rid);
    if (error) {
      // If table/policy missing, do not hard-fail silently: this is KPI-critical.
      throw error;
    }
  }

  const opInsert = [];
  for (let i = 0; i < safeRows.length; i++) {
    const row = safeRows[i];
    const row_id = rowIdByPos.get(i);
    if (!row_id) continue;

    const items = Array.isArray(row?.operator_items) ? row.operator_items : [];
    if (!items.length) continue;

    for (let li = 0; li < items.length; li++) {
      const it = items[li];
      const operator_id = it?.operator_id;
      if (!operator_id) continue;

      const tempo_raw = safeStr(it?.tempo_raw);
      const tempo_hours = isFiniteNumber(it?.tempo_hours)
        ? it.tempo_hours
        : (tempo_raw ? parseNumeric(tempo_raw) : null);

      opInsert.push({
        rapportino_id: rid,
        row_id,
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
