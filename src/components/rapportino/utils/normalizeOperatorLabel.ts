// src/components/rapportino/utils/normalizeOperatorLabel.ts

export function normalizeOperatorLabel(label: unknown): string {
  const s = String(label ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return s.replace(/^\*\s*/, "").trim();
}
