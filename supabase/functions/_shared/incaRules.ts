// supabase/functions/_shared/incaRules.ts

/**
 * Canon (Feb 2026):
 * - DB stores L as NULL (never store 'L' as text).
 * - Atomic stored states are: T, B, R, P, E, and NULL (== L).
 * - KPI bucket NP = (L + T + B + R).
 */
export type Situazione = "R" | "T" | "B" | "P" | "E" | null;
export type Severity = "INFO" | "WARN" | "BLOCK";

export type ChangeType =
  | "NEW_CABLE"
  | "SITUAZIONE_CHANGED"
  | "METRI_DIS_CHANGED"
  | "METRI_TEO_CHANGED"
  | "FLAGGED_BY_SOURCE"
  | "ELIMINATED"
  | "REINSTATED_FROM_ELIMINATED"
  | "REWORK_TO_LIBERO"
  | "REWORK_TO_BLOCCATO"
  | "FORBIDDEN_TRANSITION"
  | "DISAPPEARED_ALLOWED"
  | "DISAPPEARED_UNEXPECTED"
  | "REAPPEARED";

export type IncaEvent = {
  codice: string;
  change_type: ChangeType;
  severity: Severity;
  field?: string;
  old_value?: unknown;
  new_value?: unknown;
  payload?: Record<string, unknown>;
};

export function isSituazione(v: unknown): v is Situazione {
  return v === null || v === "R" || v === "T" || v === "B" || v === "P" || v === "E";
}

/**
 * Excel mapping:
 * - empty => L
 * - otherwise use first char upper (R/T/B/P/E)
 */
export function mapStatoCantiereToSituazione(raw: unknown): Situazione {
  const s0 = String(raw ?? "").trim().toUpperCase();
  if (!s0) return null; // L

  // Explicit L must be stored as NULL.
  if (s0[0] === "L") return null;

  // Excel canonical mapping (first char)
  const c = s0[0];
  if (c === "R" || c === "T" || c === "B" || c === "P" || c === "E") return c;

  // Soft mapping
  if (s0.includes("POS")) return "P";
  if (s0.includes("TAG")) return "T";
  if (s0.includes("RIP") || s0.includes("RIF") || s0.includes("RIC")) return "R";
  if (s0.includes("BLO")) return "B";
  if (s0.includes("ELI")) return "E";

  // Unknown -> treat as L (NULL). Caller should record the non-standard raw.
  return null;
}

export function classifySituazioneTransition(args: {
  oldSit?: Situazione | null;
  newSit: Situazione;
  flaggedBySource: boolean;
}): { changeType: ChangeType; severity: Severity } | null {
  const { oldSit, newSit, flaggedBySource } = args;

  // New cable handled elsewhere
  // NOTE: oldSit can be NULL (== L) and is a valid prior state.
  if (oldSit === undefined) return null;

  // Forbidden transitions (validated by user)
  if ((oldSit === "T" && newSit === "R") || (oldSit === "P" && newSit === "R")) {
    return { changeType: "FORBIDDEN_TRANSITION", severity: "BLOCK" };
  }

  // Reinstated from E (rare but critical)
  if (oldSit === "E" && newSit !== "E") {
    return { changeType: "REINSTATED_FROM_ELIMINATED", severity: "BLOCK" };
  }

  // Eliminated
  if (newSit === "E" && oldSit !== "E") {
    if (oldSit === "P") return { changeType: "ELIMINATED", severity: "BLOCK" };
    if (oldSit === "R" || oldSit === "T") return { changeType: "ELIMINATED", severity: "WARN" };
    // old L/B
    return { changeType: "ELIMINATED", severity: "INFO" };
  }

  // Rework after posato (validated)
  // - P -> L is stored as P -> NULL
  if (oldSit === "P" && (newSit === null || newSit === "B")) {
    return {
      changeType: newSit === null ? "REWORK_TO_LIBERO" : "REWORK_TO_BLOCCATO",
      severity: "WARN",
    };
  }

  // All other allowed transitions are normal; severity INFO for state-change itself
  if (oldSit !== newSit) {
    return { changeType: "SITUAZIONE_CHANGED", severity: "INFO" };
  }

  // No state change
  return null;
}

export function classifyDisappearance(oldSit: Situazione | null | undefined): { changeType: ChangeType; severity: Severity } {
  // validated: disappearance is acceptable mainly for L/B
  if (oldSit === null || oldSit === "B" || oldSit === "E") {
    return { changeType: "DISAPPEARED_ALLOWED", severity: "INFO" };
  }
  return { changeType: "DISAPPEARED_UNEXPECTED", severity: "BLOCK" };
}
