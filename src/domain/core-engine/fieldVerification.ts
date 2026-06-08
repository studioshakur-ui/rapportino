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

/**
 * Manual confirmation is allowed only on a cable still to verify AND once the
 * operator has explicitly picked a "Stato rilevato". Drives the disabled state
 * of the "Conferma" button — no status selected ⇒ not confirmable.
 */
export function canConfirmFieldVerification(
  fieldStatus: FieldStatus,
  selectedStatus: FieldVerificationStatus | null | undefined
): boolean {
  return fieldStatus === "TO_VERIFY" && selectedStatus != null;
}

// ── FIELD_VERIFIED core_event payload (pure builder, no IO) ──────────────────
// Kept here so it can be unit-tested without hitting Supabase. INCA is never
// touched: a field verification is recorded exclusively as a core_event.
export interface BuildFieldVerificationEventInput {
  cableCodeRaw: string;
  cableCodeNormalized: string;
  verificationStatus: FieldVerificationStatus;
  verificationSource?: FieldVerificationSource;
  verifiedBy: string;
  note: string | null;
  appPartenza?: string | null;
  appArrivo?: string | null;
  occurredAt?: string;
}

export interface FieldVerificationEventPayload {
  cable_code: string;
  cable_code_normalized: string;
  verification_status: FieldVerificationStatus;
  verification_status_label: string;
  source: FieldVerificationSource;
  verification_source: FieldVerificationSource;
  verified_by: string;
  verified_at: string;
  note: string | null;
  app_partenza: string | null;
  app_arrivo: string | null;
}

export interface FieldVerificationEvent {
  event_type: "FIELD_VERIFIED";
  occurred_at: string;
  source: FieldVerificationSource;
  cable_code_raw: string;
  cable_code_normalized: string;
  confidence: number;
  validation_status: "validated";
  raw_text: string | null;
  payload: FieldVerificationEventPayload;
}

export function buildFieldVerificationEvent(
  input: BuildFieldVerificationEventInput
): FieldVerificationEvent {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const note = input.note ?? null;
  const source = input.verificationSource ?? "manual";
  const appPartenza = input.appPartenza ?? null;
  const appArrivo = input.appArrivo ?? null;

  return {
    event_type: "FIELD_VERIFIED",
    occurred_at: occurredAt,
    source,
    cable_code_raw: input.cableCodeRaw,
    cable_code_normalized: input.cableCodeNormalized,
    // A positive verification is full field proof; a non-positive one is still a
    // tracked terrain event but must not confirm the cable downstream.
    confidence: isVerifiedFieldVerificationStatus(input.verificationStatus) ? 1 : 0.5,
    validation_status: "validated",
    raw_text: note,
    payload: {
      cable_code: input.cableCodeNormalized,
      cable_code_normalized: input.cableCodeNormalized,
      verification_status: input.verificationStatus,
      verification_status_label: getFieldVerificationStatusLabel(input.verificationStatus),
      source,
      verification_source: source,
      verified_by: input.verifiedBy,
      verified_at: occurredAt,
      note,
      app_partenza: appPartenza,
      app_arrivo: appArrivo,
    },
  };
}
