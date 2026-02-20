// /src/components/rapportino/page/rapportinoHelpers.js

export const STATUS_LABELS = {
  DRAFT: "Bozza",
  VALIDATED_CAPO: "Validata dal Capo",
  APPROVED_UFFICIO: "Approvata dall'Ufficio",
  RETURNED: "Rimandata dall'Ufficio",
};

export const CREW_LABELS = {
  ELETTRICISTA: "Elettricista",
  CARPENTERIA: "Carpenteria",
  MONTAGGIO: "Montaggio",
};

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export type CrewRole = "ELETTRICISTA" | "CARPENTERIA" | "MONTAGGIO";

export function normalizeCrewRole(value: unknown): CrewRole {
  if (value === "ELETTRICISTA" || value === "CARPENTERIA" || value === "MONTAGGIO") return value;
  return "ELETTRICISTA";
}

export function readRoleFromLocalStorage(): CrewRole {
  try {
    const stored = window.localStorage.getItem("core-current-role");
    return normalizeCrewRole(stored);
  } catch {
    return "ELETTRICISTA";
  }
}

export function safeLower(s: unknown): string {
  return String(s || "").toLowerCase();
}

export function splitLinesKeepEmpties(s: unknown): string[] {
  return String(s || "").split(/\r?\n/);
}

export function joinLines(lines: unknown): string {
  return (Array.isArray(lines) ? lines : []).map((x) => String(x ?? "")).join("\n");
}

export function normalizeOperatorLabel(label: unknown): string {
  const s = String(label || "")
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

export function modalWrapClass(): string {
  return "fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center";
}
export function modalOverlayClass(): string {
  return "absolute inset-0 bg-black/70";
}
export function modalPanelClass(): string {
  return [
    "relative w-full sm:w-[min(860px,96vw)]",
    "rounded-t-3xl sm:rounded-3xl border border-slate-800",
    "bg-slate-950 shadow-[0_-40px_120px_rgba(0,0,0,0.70)]",
    "px-4 pb-4 pt-4",
  ].join(" ");
}

export function formatDateIt(iso: unknown): string {
  if (!iso) return "";
  try {
    return new Date(iso as string | number | Date).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(iso);
  }
}

export function computeProdottoTotale(
  rows: unknown,
  parseNumeric: (value: unknown) => number | null
): number {
  return (Array.isArray(rows) ? rows : []).reduce((sum, r) => {
    const v = parseNumeric((r as { prodotto?: unknown } | null | undefined)?.prodotto);
    return sum + (v || 0);
  }, 0);
}
