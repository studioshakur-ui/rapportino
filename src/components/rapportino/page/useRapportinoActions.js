// src/components/rapportino/page/useRapportinoActions.js
/* eslint-disable no-console */

import { supabase } from "../../../lib/supabaseClient";
import { parseNumeric } from "../../../rapportinoUtils";
import { normalizeOperatorLabel } from "../utils/normalizeOperatorLabel";
import { normalizeLegacyTempoAlignment, joinLines } from "./rapportinoHelpers";

/**
 * Canonical:
 * - In DB operator mapping is in rapportino_row_operators linked by rapportino_row_id.
 * - In UI canonical is row.operator_items:
 *   [{ operator_id, label, tempo_raw, tempo_hours, line_index }]
 */

function safeStr(v) {
  return String(v ?? "").trim();
}

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * HARD: numeric columns must NEVER receive "".
 * Convert to number or null.
 */
function toNumericOrNull(v) {
  if (v === null || v === undefined) return null;

  // already a number
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = String(v).trim();
  if (!s) return null;

  const n = parseNumeric(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Extra hard sanitizer for row payload (final barrier).
 * If a key is numeric and value is "" => null.
 */
function sanitizeRowNumericPayload(payload) {
  const numericKeys = new Set(["previsto", "prodotto", "tempo_hours"]);
  const out = { ...payload };

  for (const k of Object.keys(out)) {
    if (!numericKeys.has(k)) continue;
    if (out[k] === "") out[k] = null;
    if (typeof out[k] === "string") {
      const s = out[k].trim();
      if (!s) out[k] = null;
    }
  }

  // ensure numeric are actually numbers/null
  out.previsto = toNumericOrNull(out.previsto);
  out.prodotto = toNumericOrNull(out.prodotto);
  if ("tempo_hours" in out) out.tempo_hours = toNumericOrNull(out.tempo_hours);

  return out;
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
      descrizione: "",
      operatori: "",
      tempo: "",
      previsto: "", // UI input-friendly
      prodotto: "", // UI input-friendly
      note: "",
      operator_items: [],
    });
    return next;
  });
}

/**
 * Add row from Catalog
 */
export function addRowFromCatalog({ setRows }, activity) {
  const categoria = safeStr(activity?.categoria ?? activity?.category ?? "");
  const descrizione = safeStr(
    activity?.descrizione ?? activity?.descrizione_attivita ?? activity?.label ?? activity?.name ?? ""
  );

  // Catalog can return previsto numeric or string: keep in UI as string for inputs,
  // but save will sanitize anyway.
  const previstoRaw = activity?.previsto ?? activity?.planned ?? "";
  const previsto = previstoRaw === null || previstoRaw === undefined ? "" : String(previstoRaw);

  const note = safeStr(activity?.note ?? "");

  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    next.push({
      id: `tmp_${crypto.randomUUID()}`,
      categoria,
      descrizione,
      operatori: "",
      tempo: "",
      previsto,
      prodotto: "",
      note,
      operator_items: [],
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
    if (items.some((it) => String(it?.operator_id) === String(operator_id))) return prev;

    const line_index = items.length;

    items.push({
      operator_id,
      label,
      tempo_raw: "",
      tempo_hours: null,
      line_index,
    });

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
    const reindexed = filtered.map((it, idx) => ({ ...it, line_index: idx }));

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

export function setCanonicalTempoForLine({ setRows }, rowIndex, lineIndex, tempoRaw) {
  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    const row = next[rowIndex];
    if (!row) return prev;

    const items = Array.isArray(row.operator_items) ? [...row.operator_items] : [];
    if (lineIndex < 0 || lineIndex >= items.length) return prev;

    const tRaw = String(tempoRaw ?? "").trim();
    const hours = tRaw ? parseNumeric(tRaw) : null;

    items[lineIndex] = {
      ...items[lineIndex],
      tempo_raw: tRaw,
      tempo_hours: isFiniteNumber(hours) ? hours : null,
      line_index: lineIndex,
    };

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
    if (items.length > 0) return prev;

    next[rowIndex] = { ...row, tempo: value };
    return next;
  });
}

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

  const act = String(action || "toggle").toLowerCase();

  const operator_id = operator?.operator_id || operator?.id || null;
  const label = normalizeOperatorLabel(operator?.label || operator?.name || "");
  if (!operator_id || !label) return;

  if (act === "remove") {
    removeOperatorFromRow({ setRows }, rowIndex, operator_id);
    return;
  }

  let currentItems = [];
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
    addOperatorToRow({ setRows }, rowIndex, { id: operator_id, name: label });
  }
}

/**
 * saveRapportino — schema aligned
 * - rapportini.data NOT NULL (canonical date)
 * - rapportino_rows.descrizione
 * - rapportino_row_operators.rapportino_row_id
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
  let rid = rapportinoId ? String(rapportinoId) : null;

  // 1) upsert header
  if (!rid) {
    const { data, error } = await supabase
      .from("rapportini")
      .insert([
        {
          capo_id: profileId,
          crew_role: crewRole,
          data: reportDate,
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
        data: reportDate,
        report_date: reportDate,
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

  // 2) replace rows/operators
  const safeRows = Array.isArray(rows) ? rows : [];

  // read existing row ids (for operator delete)
  const { data: existingRows, error: exErr } = await supabase
    .from("rapportino_rows")
    .select("id")
    .eq("rapportino_id", rid);

  if (exErr) throw exErr;

  const existingRowIds = (Array.isArray(existingRows) ? existingRows : [])
    .map((x) => x?.id)
    .filter(Boolean)
    .map((x) => String(x));

  if (existingRowIds.length > 0) {
    const { error } = await supabase.from("rapportino_row_operators").delete().in("rapportino_row_id", existingRowIds);
    if (error) throw error;
  }

  // delete rows
  {
    const { error } = await supabase.from("rapportino_rows").delete().eq("rapportino_id", rid);
    if (error) throw error;
  }

  // insert rows (sanitize numeric hard)
  const insertRowsPayload = safeRows.map((r, idx) => {
    const descrizione = safeStr(r?.descrizione ?? r?.descrizione_attivita ?? "");

    const operatoriText = safeStr(r?.operatori);
    const tempoText = safeStr(r?.tempo);
    const alignedTempo = normalizeLegacyTempoAlignment(operatoriText, tempoText);

    const payload = {
      rapportino_id: rid,
      position: Number(idx),
      categoria: safeStr(r?.categoria),
      descrizione,
      operatori: operatoriText,
      tempo: alignedTempo,
      previsto: r?.previsto,
      prodotto: r?.prodotto,
      note: safeStr(r?.note),
    };

    return sanitizeRowNumericPayload(payload);
  });

  let insertedRows = [];
  if (insertRowsPayload.length > 0) {
    // DEBUG (optional): uncomment if you still get numeric errors
    // console.log("[saveRapportino] insertRowsPayload", insertRowsPayload);

    const { data, error } = await supabase.from("rapportino_rows").insert(insertRowsPayload).select("id, position");
    if (error) throw error;
    insertedRows = Array.isArray(data) ? data : [];
  }

  // map position -> rapportino_row_id
  const rowIdByPos = new Map(insertedRows.map((x) => [Number(x.position), String(x.id)]));

  // 3) insert operator mappings (rapportino_row_id)
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

      const payload = sanitizeRowNumericPayload({
        rapportino_row_id,
        operator_id,
        line_index: Number(li),
        tempo_raw,
        tempo_hours,
      });

      opInsert.push(payload);
    }
  }

  if (opInsert.length > 0) {
    // DEBUG (optional): uncomment if needed
    // console.log("[saveRapportino] opInsert", opInsert);

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