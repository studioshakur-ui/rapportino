// supabase/functions/_shared/incaRules.ts

export type Situazione = "L" | "R" | "T" | "B" | "P" | "E";
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
  return v === "L" || v === "R" || v === "T" || v === "B" || v === "P" || v === "E";
}

/**
 * Excel mapping:
 * - empty => L
 * - otherwise use first char upper (R/T/B/P/E)
 */
export function mapStatoCantiereToSituazione(raw: unknown): Situazione {
  const s = String(raw ?? "").trim().toUpperCase();
  if (!s) return "L";
  const c = s[0];
  if (c === "R" || c === "T" || c === "B" || c === "P" || c === "E") return c;
  // Hard fallback: treat unknown as L but mark in payload elsewhere if needed.
  return "L";
}

export function classifySituazioneTransition(args: {
  oldSit?: Situazione | null;
  newSit: Situazione;
  flaggedBySource: boolean;
}): { changeType: ChangeType; severity: Severity } | null {
  const { oldSit, newSit, flaggedBySource } = args;

  // New cable handled elsewhere
  if (!oldSit) return null;

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
  if (oldSit === "P" && (newSit === "L" || newSit === "B")) {
    return {
      changeType: newSit === "L" ? "REWORK_TO_LIBERO" : "REWORK_TO_BLOCCATO",
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
  if (oldSit === "L" || oldSit === "B" || oldSit === "E") {
    return { changeType: "DISAPPEARED_ALLOWED", severity: "INFO" };
  }
  return { changeType: "DISAPPEARED_UNEXPECTED", severity: "BLOCK" };
}
