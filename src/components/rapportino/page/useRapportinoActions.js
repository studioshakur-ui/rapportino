// src/components/rapportino/page/useRapportinoActions.js
/* eslint-disable no-console */
import { normalizeOperatorLabel } from "../utils/normalizeOperatorLabel";

/**
 * Canonical:
 * - In DB we store operator mapping in rapportino_row_operators (per row).
 * - In UI, we keep row.operator_items as canonical items:
 *   [{ operator_id, label, tempo_raw, tempo_hours, line_index }]
 */

function splitLines(v) {
  return String(v || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinLines(lines) {
  return (lines || []).join("\n");
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

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
      // IMPORTANT: ensure canonical mode is always available even when empty
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
  // Accept both UI shape { id, name } and canonical shape { operator_id, label }
  const operator_id = operator?.operator_id || operator?.id || null;
  const label = normalizeOperatorLabel(operator?.label || operator?.name || "");
  if (!operator_id || !label) return;

  setRows((prev) => {
    const next = Array.isArray(prev) ? [...prev] : [];
    const row = next[rowIndex];
    if (!row) return prev;

    const items = Array.isArray(row.operator_items) ? [...row.operator_items] : [];

    // prevent duplicates
    if (items.some((it) => it?.operator_id === operator_id)) return prev;

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

    const filtered = items.filter((it) => it?.operator_id !== operator_id);
    // reindex line_index
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

    const idx = items.findIndex((it) => it?.operator_id === operator_id);
    if (idx < 0) return prev;

    const tRaw = String(tempo_raw ?? "").trim();
    const hours = tRaw ? safeNum(tRaw.replace(",", ".")) : null;

    items[idx] = {
      ...items[idx],
      tempo_raw: tRaw,
      tempo_hours: hours,
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

export function handleTempoChangeLegacy({ setRows }, rowIndex, value) {
  // Legacy tempo is allowed only when there is no canonical operator_items
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

export function toggleOperatorInRow({ setRows }, rowIndex, action, operator) {
  // operator: { id, name }
  if (!operator?.id) return;

  const operator_id = operator.id;
  const label = operator.name || "";

  if (action === "remove") {
    removeOperatorFromRow({ setRows }, rowIndex, operator_id);
    return;
  }

  // toggle: if already present -> remove else add
  const currentItems = (() => {
    // We read current row snapshot from setRows closure by doing a minimal pass
    // (cheap enough, avoids needing external state).
    let items = [];
    setRows((prev) => {
      const row = Array.isArray(prev) ? prev[rowIndex] : null;
      items = Array.isArray(row?.operator_items) ? row.operator_items : [];
      return prev;
    });
    return items;
  })();

  const exists = Array.isArray(currentItems) && currentItems.some((it) => it?.operator_id === operator_id);

  if (exists) {
    removeOperatorFromRow({ setRows }, rowIndex, operator_id);
    return;
  }

  addOperatorToRow({ setRows }, rowIndex, { id: operator_id, name: label });
}