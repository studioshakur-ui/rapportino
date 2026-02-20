// src/components/direzione/direzioneUtils.js
export function toISODate(d: unknown): string {
  if (!(d instanceof Date)) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export function parseISODate(s: unknown): Date | null {
  if (!s) return null;
  const d = new Date(s as string | number | Date);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function formatDateLabelIt(dateString: unknown): string {
  if (!dateString) return "";
  const d = new Date(dateString as string | number | Date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT");
}

export function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return 0;
    const normalized = s
      .replace(/\s/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function formatNumberIt(value: unknown, maxFrac = 2): string {
  if (value == null || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: maxFrac }).format(Number(value));
}

export function formatIndexIt(value: unknown): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(Number(value));
}

export function cutoffNextDay0830(reportDateISO: unknown): Date | null {
  const d = parseISODate(reportDateISO);
  if (!d) return null;
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 30, 0, 0);
  x.setDate(x.getDate() + 1);
  return x;
}
