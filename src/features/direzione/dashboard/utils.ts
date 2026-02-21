// src/features/direzione/dashboard/utils.ts

export function toISODate(d: Date): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export function parseISODate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function formatDateLabel(dateString: string, locale: string = "it-IT"): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale);
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
  const n = Number(v as unknown as number);
  return Number.isFinite(n) ? n : 0;
}

export function isMissingRelation(err: unknown): boolean {
  const e = err as { message?: string; code?: string };
  const msg = String(e?.message || "");
  const code = String(e?.code || "");
  return code === "42P01" || /relation .* does not exist/i.test(msg) || /does not exist/i.test(msg);
}

export function computePrevWindow(dateFrom: string, dateTo: string): { prevFrom: string; prevTo: string } {
  const from = parseISODate(dateFrom);
  const to = parseISODate(dateTo);
  if (!from || !to) {
    return { prevFrom: "", prevTo: "" };
  }
  const diffMs = to.getTime() - from.getTime();
  const prevToDate = new Date(from.getTime() - 24 * 3600 * 1000);
  const prevFromDate = new Date(prevToDate.getTime() - diffMs);
  return { prevFrom: toISODate(prevFromDate), prevTo: toISODate(prevToDate) };
}

export function cutoffNextDay0830(reportDateISO: string): Date | null {
  const d = parseISODate(reportDateISO);
  if (!d) return null;
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 30, 0, 0);
  x.setDate(x.getDate() + 1);
  return x;
}
