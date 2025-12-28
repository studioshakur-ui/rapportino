// /src/components/rapportino/page/useRapportinoActions.js
import { supabase } from "../../../lib/supabaseClient";
import { parseNumeric } from "../../../rapportinoUtils";
import {
  buildTempoOptions,
  normalizeOperatorLabel,
  normalizeLegacyTempoAlignment,
} from "./rapportinoHelpers";

/**
 * This module is intentionally deterministic and "no regress".
 * It contains only pure row transforms + the hardened save logic.
 *
 * Added (CORE signature A+B):
 * - removeOperatorFromRow(...)
 * - toggleOperatorInRow(...)
 */

function joinLines(lines) {
  return (Array.isArray(lines) ? lines : []).map((x) => String(x ?? "")).join("\n");
}

function parseTempoToHours(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const normalized = s.replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return n;
}

function buildCanonicalItemsFromRow(row) {
  const items = Array.isArray(row?.operator_items) ? row.operator_items : [];
  if (items.length > 0) {
    return items
      .slice()
      .sort((a, b) => (a.line_index ?? 0) - (b.line_index ?? 0))
      .map((it, idx) => ({
        operator_id: it.operator_id,
        label: normalizeOperatorLabel(it.label || ""),
        tempo_raw: String(it.tempo_raw ?? "").trim(),
        tempo_hours: parseTempoToHours(it.tempo_raw ?? it.tempo_hours),
        line_index: idx,
      }))
      .filter((x) => !!x.operator_id);
  }
  return [];
}

export function addRowFromCatalog({ setRows }, activity) {
  if (!activity?.id) return;

  const previstoVal =
    activity.previsto_value === null || activity.previsto_value === undefined ? "" : String(activity.previsto_value);

  setRows((prev) => {
    const nextIndex = prev.length;

    return [
      ...prev,
      {
        id: null,
        row_index: nextIndex,
        activity_id: activity.id,

        categoria: activity.categoria || "",
        descrizione: activity.descrizione || "",

        operatori: "",
        tempo: "",
        previsto: previstoVal,
        prodotto: "",
        note: "",

        operator_items: [],

        __catalog_unit: activity.unit || null,
        __catalog_type: activity.activity_type || null,
      },
    ];
  });
}

export function addOperatorToRow({ setRows }, rowIndex, operator) {
  const operator_id = operator?.id || null;
  const label = normalizeOperatorLabel(operator?.name || "");
  if (rowIndex == null || !operator_id || !label) return;

  setRows((prev) => {
    const next = [...prev];
    const row = { ...next[rowIndex] };

    const items = Array.isArray(row.operator_items) ? row.operator_items.slice() : [];
    const exists = items.some((x) => String(x.operator_id) === String(operator_id));

    if (!exists) {
      const nextIndex = items.length;
      items.push({
        operator_id,
        label,
        tempo_raw: "",
        tempo_hours: null,
        line_index: nextIndex,
      });
    }

    const patched = items.map((it, idx) => ({ ...it, line_index: idx }));

    row.operator_items = patched;
    row.operatori = joinLines(patched.map((x) => x.label || ""));
    row.tempo = joinLines(patched.map((x) => String(x.tempo_raw ?? "")));

    next[rowIndex] = row;
    return next;
  });
}

export function removeOperatorFromRow({ setRows }, rowIndex, operatorId) {
  if (rowIndex == null || !operatorId) return;

  setRows((prev) => {
    const next = [...prev];
    const row = { ...next[rowIndex] };
    const items = Array.isArray(row.operator_items) ? row.operator_items.slice() : [];

    if (items.length === 0) return prev;

    const filtered = items.filter((it) => String(it.operator_id) !== String(operatorId));
    const patched = filtered.map((it, idx) => ({ ...it, line_index: idx }));

    row.operator_items = patched;
    row.operatori = joinLines(patched.map((x) => x.label || ""));
    row.tempo = joinLines(patched.map((x) => String(x.tempo_raw ?? "")));

    next[rowIndex] = row;
    return next;
  });
}

export function toggleOperatorInRow({ setRows }, rowIndex, operator, action) {
  const operator_id = operator?.id || null;
  const label = normalizeOperatorLabel(operator?.name || "");
  if (rowIndex == null || !operator_id || !label) return;

  if (action === "remove") {
    removeOperatorFromRow({ setRows }, rowIndex, operator_id);
    return;
  }

  addOperatorToRow({ setRows }, rowIndex, { id: operator_id, name: label });
}

export function setCanonicalTempoForLine({ setRows }, rowIndex, lineIndex, tempoRaw) {
  const raw = String(tempoRaw ?? "").trim();

  setRows((prev) => {
    const next = [...prev];
    const row = { ...next[rowIndex] };
    const items = Array.isArray(row.operator_items) ? row.operator_items.slice() : [];

    if (items.length === 0) return prev;
    if (lineIndex < 0 || lineIndex >= items.length) return prev;

    const patched = items.map((it, idx) => {
      if (idx !== lineIndex) return { ...it, line_index: idx };
      const hours = parseTempoToHours(raw);
      return { ...it, tempo_raw: raw, tempo_hours: hours, line_index: idx };
    });

    row.operator_items = patched;
    row.operatori = joinLines(patched.map((x) => x.label || ""));
    row.tempo = joinLines(patched.map((x) => String(x.tempo_raw ?? "")));

    next[rowIndex] = row;
    return next;
  });
}

export function handleTempoChangeLegacy({ setRows }, rowIndex, value) {
  setRows((prev) => {
    const next = [...prev];
    const row = { ...next[rowIndex] };

    const items = Array.isArray(row.operator_items) ? row.operator_items.slice() : [];
    if (items.length > 0) return prev; // canonical => no free edit

    row.tempo = normalizeLegacyTempoAlignment(row.operatori || "", value);
    next[rowIndex] = row;
    return next;
  });
}

export async function removeRow({ rows, setRows }, index, { canEdit }) {
  if (!canEdit) return { ok: false, reason: "readonly" };

  setRows((prev) => {
    const copy = [...prev];
    copy.splice(index, 1);
    return copy.map((r, idx) => ({ ...r, row_index: idx }));
  });

  return { ok: true };
}

/**
 * Hardened save (unchanged semantics):
 * - overwrites categoria/descrizione/previsto for activity_id rows from catalogo_attivita
 * - rebuild canonical row operators into rapportino_row_operators
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

  const newStatus = forcedStatus || status || "DRAFT";

  const activityIds = rows.map((r) => r.activity_id).filter(Boolean);
  const ids = Array.from(new Set(activityIds.map((x) => String(x))));

  let catalogMap = new Map();
  if (ids.length > 0) {
    const { data, error } = await supabase
      .from("catalogo_attivita")
      .select("id, categoria, descrizione, previsto_value, unit, activity_type, is_active")
      .in("id", ids);

    if (error) throw error;

    const m = new Map();
    for (const r of data || []) m.set(String(r.id), r);
    catalogMap = m;
  }

  const cleanRows = rows.map((r, idx) => {
    const canonical = buildCanonicalItemsFromRow(r);

    const activityId = r.activity_id || null;
    const cat = activityId ? catalogMap.get(String(activityId)) : null;

    const categoriaCanon = cat?.categoria ?? String(r.categoria || "").trim();
    const descrizioneCanon = cat?.descrizione ?? String(r.descrizione || "").trim();

    const previstoCanon =
      cat?.previsto_value === null || cat?.previsto_value === undefined
        ? parseNumeric(r.previsto)
        : Number(cat.previsto_value);

    const operatoriText =
      canonical.length > 0 ? joinLines(canonical.map((x) => x.label)) : String(r.operatori || "").trim();

    const tempoText =
      canonical.length > 0
        ? joinLines(canonical.map((x) => String(x.tempo_raw || "").trim()))
        : normalizeLegacyTempoAlignment(operatoriText, String(r.tempo || "").trim());

    return {
      activity_id: activityId,
      categoria: categoriaCanon,
      descrizione: descrizioneCanon,
      operatori: operatoriText,
      tempo: tempoText,
      previsto: Number.isFinite(previstoCanon) ? previstoCanon : null,
      prodotto: parseNumeric(r.prodotto),
      note: String(r.note || "").trim(),
      row_index: idx,
      __canonical_items: canonical,
    };
  });

  let newId = rapportinoId;

  if (!newId) {
    const { data: inserted, error: insertError } = await supabase
      .from("rapportini")
      .insert({
        capo_id: profileId,
        crew_role: crewRole,
        report_date: reportDate,
        data: reportDate,
        costr,
        commessa,
        status: newStatus,
        prodotto_totale: prodottoTotale,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    newId = inserted.id;
    setRapportinoId?.(inserted.id);
    setRapportinoCrewRole?.(inserted.crew_role || crewRole);
  } else {
    const { error: updateError } = await supabase
      .from("rapportini")
      .update({
        costr,
        commessa,
        status: newStatus,
        prodotto_totale: prodottoTotale,
        report_date: reportDate,
        data: reportDate,
      })
      .eq("id", newId);

    if (updateError) throw updateError;

    const { error: deleteError } = await supabase.from("rapportino_rows").delete().eq("rapportino_id", newId);
    if (deleteError) throw deleteError;
  }

  let insertedRows = [];
  if (cleanRows.length > 0) {
    const rowsToInsert = cleanRows.map((r) => ({
      rapportino_id: newId,
      row_index: r.row_index,
      activity_id: r.activity_id,
      categoria: r.categoria,
      descrizione: r.descrizione,
      operatori: r.operatori,
      tempo: r.tempo,
      previsto: r.previsto,
      prodotto: r.prodotto,
      note: r.note,
    }));

    const { data: rrInserted, error: insertRowsError } = await supabase
      .from("rapportino_rows")
      .insert(rowsToInsert)
      .select("id, row_index")
      .order("row_index", { ascending: true });

    if (insertRowsError) throw insertRowsError;
    insertedRows = Array.isArray(rrInserted) ? rrInserted : [];
  }

  if (insertedRows.length > 0) {
    const byIndex = new Map(insertedRows.map((x) => [x.row_index, x.id]));
    const canonicalInserts = [];

    for (const r of cleanRows) {
      const rowId = byIndex.get(r.row_index);
      if (!rowId) continue;

      const canon = r.__canonical_items || [];
      if (!Array.isArray(canon) || canon.length === 0) continue;

      for (const it of canon) {
        canonicalInserts.push({
          rapportino_row_id: rowId,
          operator_id: it.operator_id,
          line_index: it.line_index ?? 0,
          tempo_raw: it.tempo_raw ?? "",
          tempo_hours: it.tempo_hours ?? null,
        });
      }
    }

    if (canonicalInserts.length > 0) {
      const { error: canonErr } = await supabase.from("rapportino_row_operators").insert(canonicalInserts);
      if (canonErr) throw canonErr;
    }
  }

  setStatus?.(newStatus);
  setSuccessMessage?.("Salvataggio riuscito.");
  await loadReturnedInbox?.();
}
