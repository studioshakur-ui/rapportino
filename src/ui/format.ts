// src/ui/format.ts

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

/**
 * Legacy (IT-only). Kept for backward compatibility.
 */
export function formatNumberIT(v: unknown, maxFrac: number = 2): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: maxFrac }).format(n);
}

export function safeText(x: unknown, fallback: string = "—"): string {
  const s = (x ?? "").toString().trim();
  return s || fallback;
}

export function langToLocale(lang: string | null | undefined): string {
  switch (String(lang || "it").toLowerCase()) {
    case "fr":
      return "fr-FR";
    case "en":
      return "en-US";
    case "it":
    default:
      return "it-IT";
  }
}

export function formatNumberByLang(lang: string | null | undefined, v: unknown, maxFrac: number = 2): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  const locale = langToLocale(lang);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxFrac }).format(n);
}
