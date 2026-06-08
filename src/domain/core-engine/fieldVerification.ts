export type FieldVerificationSource = "telegram" | "manual";

export type FieldVerificationStatus =
  | "AT_DESTINATION"
  | "AT_DEPARTURE"
  | "CONNECTED_BOTH"
  | "NOT_FOUND"
  | "RECHECK";

export interface FieldVerificationStatusOption {
  value: FieldVerificationStatus;
  label: string;
  countsAsVerified: boolean;
}

export const FIELD_VERIFICATION_STATUS_OPTIONS: FieldVerificationStatusOption[] = [
  { value: "AT_DESTINATION", label: "A destinazione", countsAsVerified: true },
  { value: "AT_DEPARTURE", label: "In partenza", countsAsVerified: true },
  { value: "CONNECTED_BOTH", label: "Collegato entrambi", countsAsVerified: true },
  { value: "NOT_FOUND", label: "Non trovato", countsAsVerified: false },
  { value: "RECHECK", label: "Da ricontrollare", countsAsVerified: false },
];

const VERIFIED_FIELD_STATUSES = new Set<FieldVerificationStatus>(["AT_DESTINATION", "AT_DEPARTURE", "CONNECTED_BOTH"]);

export interface FieldVerification {
  cable_code: string;
  cable_code_normalized: string;
  verification_status: FieldVerificationStatus;
  source: FieldVerificationSource;
  verification_source: FieldVerificationSource;
  verified_by: string | null;
  verified_at: string;
  note: string | null;
  app_partenza: string | null;
  app_arrivo: string | null;
}

export type FieldStatus = "VERIFIED" | "TO_VERIFY" | "BLOCKED";

export interface ResolveFieldStatusInput {
  hasVerificationProof?: boolean;
  hasCriticalFinding?: boolean;
  hasTechnicalAnomaly?: boolean;
}

export function isVerifiedFieldVerificationStatus(status: string | null | undefined): boolean {
  return VERIFIED_FIELD_STATUSES.has(status as FieldVerificationStatus);
}

export function getFieldVerificationStatusLabel(status: string | null | undefined): string {
  return FIELD_VERIFICATION_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Verifica campo";
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
