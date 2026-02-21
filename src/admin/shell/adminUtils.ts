// src/admin/shell/adminUtils.ts

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export type Lang = "it" | "fr" | "en";

export type Crumb = { label: string; to?: string };

export function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const diffMs = Date.now() - t;
  return diffMs > 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
}