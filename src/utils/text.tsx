// src/utils/text.tsx

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bozza",
  VALIDATED_CAPO: "Validata dal Capo",
  APPROVED_UFFICIO: "Approvata dall'Ufficio",
  RETURNED: "Rimandata dall'Ufficio",
};

export const CREW_LABELS: Record<string, string> = {
  ELETTRICISTA: "Elettricista",
  CARPENTERIA: "Carpenteria",
  MONTAGGIO: "Montaggio",
};

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function normalizeCrewRole(value: unknown): "ELETTRICISTA" | "CARPENTERIA" | "MONTAGGIO" {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "ELETTRICISTA" || v === "CARPENTERIA" || v === "MONTAGGIO") return v;
  return "ELETTRICISTA";
}

export function readRoleFromLocalStorage(): "ELETTRICISTA" | "CARPENTERIA" | "MONTAGGIO" {
  try {
    const stored = window.localStorage.getItem("core-current-role");
    return normalizeCrewRole(stored);
  } catch {
    return "ELETTRICISTA";
  }
}

export function safeLower(s: unknown): string {
  return String(s ?? "").toLowerCase();
}

export function splitLinesKeepEmpties(s: unknown): string[] {
  return String(s ?? "").split(/\r?\n/);
}

export function joinLines(lines: unknown): string {
  return (Array.isArray(lines) ? lines : []).map((x) => String(x ?? "")).join("\n");
}

export function normalizeOperatorLabel(label: unknown): string {
  const s = String(label ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return s.replace(/^\*\s*/, "").trim();
}

/**
 * Tempo parsing (canonical KPI):
 * - Accept "8", "8.0", "8,5"
 * - Reject non-numeric tokens
 */
export function parseTempoToHours(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const normalized = s.replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return n;
}

/**
 * Legacy normalization:
 * Align tempo lines to operator lines (keep empties, pad/truncate).
 */
export function normalizeLegacyTempoAlignment(operatoriText: unknown, tempoText: unknown): string {
  const opLines = splitLinesKeepEmpties(operatoriText);
  const tmLines = splitLinesKeepEmpties(tempoText);

  const targetLen = Math.max(opLines.length, tmLines.length, 0);
  const paddedOps = opLines.concat(Array(Math.max(0, targetLen - opLines.length)).fill(""));
  const paddedTm = tmLines.concat(Array(Math.max(0, targetLen - tmLines.length)).fill(""));

  const finalLen = paddedOps.length;
  return joinLines(paddedTm.slice(0, finalLen));
}

/** Tempo options: 0..12 step 0.5 */
export function buildTempoOptions(): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  for (let v = 0; v <= 12; v += 0.5) {
    const s = Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
    out.push({ label: s, value: s });
  }
  return out;
}

export function formatDateIt(iso: unknown): string {
  if (!iso) return "";
  try {
    return new Date(String(iso)).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(iso);
  }
}
