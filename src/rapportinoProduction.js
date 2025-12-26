// src/rapportinoProduction.js
// Canon helpers for production, tempo/operator alignment, and soft alerts.

export function safeLower(s) {
  return (s ?? "").toString().toLowerCase();
}

export function splitNonEmptyLines(s) {
  return (s ?? "")
    .toString()
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * Tempo lines in DB can include empty lines (see your sample).
 * For KPI by operator, we use NON-empty tempo lines.
 */
export function splitTempoLinesNonEmpty(s) {
  return splitNonEmptyLines(s);
}

export function parseHours(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // accept "8", "8,5", "8.5"
  const normalized = raw.replace(/\s+/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * Canon pairing:
 * - operators: non-empty lines
 * - tempo: non-empty lines
 * - if tempo shorter -> pad null
 * - if tempo longer -> keep extras separately (warning)
 */
export function pairOperatorsTempo(operatoriText, tempoText) {
  const ops = splitNonEmptyLines(operatoriText);
  const tms = splitTempoLinesNonEmpty(tempoText);

  const pairs = [];
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const tmRaw = i < tms.length ? tms[i] : "";
    const h = parseHours(tmRaw);
    pairs.push({ operator: op, hours: h, raw: tmRaw });
  }

  const extraTempo = tms.length > ops.length ? tms.slice(ops.length) : [];
  return { pairs, extraTempo };
}

export function isQuantitativeActivity(activityType) {
  return activityType === "QUANTITATIVE";
}

export function computeOperatorTotalsFromRows(rows) {
  const map = new Map(); // key=lower name -> {name, hours}
  for (const r of Array.isArray(rows) ? rows : []) {
    const { pairs } = pairOperatorsTempo(r.operatori, r.tempo);
    for (const p of pairs) {
      const k = safeLower(p.operator);
      if (!k) continue;
      const prev = map.get(k) || { name: p.operator, hours: 0 };
      prev.hours += p.hours ? p.hours : 0;
      map.set(k, prev);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
}

export function detectSoftOver9h(operatorTotals, threshold = 9) {
  return (Array.isArray(operatorTotals) ? operatorTotals : []).filter(
    (x) => (x?.hours || 0) > threshold
  );
}
