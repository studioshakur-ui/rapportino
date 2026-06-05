export type IncaStatusCode = "P" | "T" | "R" | "1" | "2" | "C" | "B" | "E";

export interface IncaStatusDefinition {
  code: IncaStatusCode;
  label: string;
  category: "posed" | "cut" | "requested" | "connected" | "blocked" | "removed";
  isComplete: boolean;
  isBlocked: boolean;
}

export const INCA_STATUS_DICTIONARY: Record<IncaStatusCode, IncaStatusDefinition> = {
  P: { code: "P", label: "Posato", category: "posed", isComplete: false, isBlocked: false },
  T: { code: "T", label: "Tagliato", category: "cut", isComplete: false, isBlocked: false },
  R: { code: "R", label: "Richiesto", category: "requested", isComplete: false, isBlocked: false },
  "1": { code: "1", label: "Collegato partenza", category: "connected", isComplete: false, isBlocked: false },
  "2": { code: "2", label: "Collegato arrivo", category: "connected", isComplete: false, isBlocked: false },
  C: { code: "C", label: "Collegato partenza e arrivo", category: "connected", isComplete: true, isBlocked: false },
  B: { code: "B", label: "Bloccato", category: "blocked", isComplete: false, isBlocked: true },
  E: { code: "E", label: "Eliminato", category: "removed", isComplete: true, isBlocked: false },
};

export function normalizeIncaStatusCode(value: string | null | undefined): IncaStatusCode | null {
  const code = String(value ?? "").trim().toUpperCase();
  return code in INCA_STATUS_DICTIONARY ? (code as IncaStatusCode) : null;
}

export function getIncaStatusDefinition(value: string | null | undefined): IncaStatusDefinition | null {
  const code = normalizeIncaStatusCode(value);
  return code ? INCA_STATUS_DICTIONARY[code] : null;
}

export function formatIncaStatus(value: string | null | undefined): string {
  const definition = getIncaStatusDefinition(value);
  return definition ? `${definition.code} · ${definition.label}` : value || "—";
}
