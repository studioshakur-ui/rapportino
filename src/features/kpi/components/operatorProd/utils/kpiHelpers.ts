// src/components/kpi/operatorProd/utils/kpiHelpers.js
export function normalizeScope(scope: unknown): string {
  const s = String(scope || "DIRECTION").toUpperCase().trim();
  if (s === "MANAGER" || s === "CAPO" || s === "DIRECTION") return s;
  return "DIRECTION";
}

export function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  const normalized = s
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function safeText(x: unknown): string {
  const s = (x ?? "").toString().trim();
  return s || "—";
}

export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
