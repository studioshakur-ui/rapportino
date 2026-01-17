// src/ui/cn.ts
// Tiny className join helper (kept intentionally minimal).

export type ClassValue = string | false | null | undefined;

export function cn(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(" ");
}
