// src/ui/format.js
export function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  const normalized = s.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function formatNumberIT(v, maxFrac = 2) {
  if (v == null || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: maxFrac }).format(Number(v));
}

export function safeText(x, fallback = "—") {
  const s = (x ?? "").toString().trim();
  return s || fallback;
}
