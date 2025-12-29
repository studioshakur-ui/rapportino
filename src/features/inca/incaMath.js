// src/inca/incaMath.js

export function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/**
 * Base metri:
 * - on privilégie metri_teo (lunghezza di disegno)
 * - fallback metri_dis si metri_teo est vide
 */
export function getBaseMetri(incaCavo) {
  if (!incaCavo) return 0;
  const teo = safeNum(incaCavo.metri_teo);
  if (teo > 0) return teo;
  const dis = safeNum(incaCavo.metri_dis);
  return dis > 0 ? dis : 0;
}

/**
 * Calcule metri_posati à partir de baseMetri et percent.
 * Arrondi "terrain" à 2 décimales max (évite dérives sur cumuls).
 */
export function calcMetriPosati(baseMetri, percent) {
  const b = safeNum(baseMetri);
  const p = clamp(safeNum(percent), 0, 100);

  if (!b) return 0;

  const raw = (b * p) / 100;
  // 2 décimales max
  return Math.round(raw * 100) / 100;
}

/**
 * Affichage compact (UI)
 */
export function formatMeters(v) {
  const n = safeNum(v);
  if (!n) return "0";
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(2)} km`;
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return isInt ? `${Math.round(n)} m` : `${n.toFixed(1)} m`;
}
