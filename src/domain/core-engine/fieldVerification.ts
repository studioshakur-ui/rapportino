export type FieldVerificationSource = "telegram" | "manual";

export interface FieldVerification {
  cable_code: string;
  verification_source: FieldVerificationSource;
  verified_by: string | null;
  verified_at: string;
  note: string | null;
}

export type FieldStatus = "VERIFIED" | "TO_VERIFY" | "BLOCKED";

export interface ResolveFieldStatusInput {
  hasVerificationProof?: boolean;
  hasCriticalFinding?: boolean;
  hasTechnicalAnomaly?: boolean;
}

export function resolveFieldStatus(input: ResolveFieldStatusInput): FieldStatus {
  if (input.hasCriticalFinding || input.hasTechnicalAnomaly) return "BLOCKED";
  if (input.hasVerificationProof) return "VERIFIED";
  return "TO_VERIFY";
}

export function formatFieldStatusLabel(status: FieldStatus): string {
  if (status === "VERIFIED") return "Verificato";
  if (status === "BLOCKED") return "Bloccato";
  return "Da verificare";
}
