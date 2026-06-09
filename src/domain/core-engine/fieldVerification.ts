export type FieldVerificationSource = "telegram" | "manual";

export type FieldVerificationStatus =
  | "AT_DESTINATION"
  | "AT_DEPARTURE"
  | "CONNECTED_BOTH"
  | "NOT_FOUND"
  | "RECHECK"
  | "BLOCKED";

export interface FieldVerificationStatusOption {
  value: FieldVerificationStatus;
  label: string;
  countsAsVerified: boolean;
  isBlocker: boolean;
}

// Le capo choisit toujours explicitement (jamais de défaut implicite).
// 3 stati positivi (presenza terrain) + non trovato / da ricontrollare + bloccato.
export const FIELD_VERIFICATION_STATUS_OPTIONS: FieldVerificationStatusOption[] = [
  { value: "AT_DEPARTURE", label: "Trovato a partenza", countsAsVerified: true, isBlocker: false },
  { value: "AT_DESTINATION", label: "Trovato ad arrivo", countsAsVerified: true, isBlocker: false },
  { value: "CONNECTED_BOTH", label: "Trovato a entrambi", countsAsVerified: true, isBlocker: false },
  { value: "NOT_FOUND", label: "Non trovato", countsAsVerified: false, isBlocker: false },
  { value: "RECHECK", label: "Da ricontrollare", countsAsVerified: false, isBlocker: false },
  { value: "BLOCKED", label: "Bloccato", countsAsVerified: false, isBlocker: true },
];

const VERIFIED_FIELD_STATUSES = new Set<FieldVerificationStatus>(["AT_DESTINATION", "AT_DEPARTURE", "CONNECTED_BOTH"]);
const BLOCKING_FIELD_STATUSES = new Set<FieldVerificationStatus>(["BLOCKED"]);

export function isBlockingFieldVerificationStatus(status: string | null | undefined): boolean {
  return BLOCKING_FIELD_STATUSES.has(status as FieldVerificationStatus);
}

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

// ── Modello a 2 assi (partenza / arrivo) ────────────────────────────────────
// Un cavo ha due estremità verificabili indipendentemente. Le azioni del capo
// si accumulano per estremità; lo stato "collegato" è DERIVATO (entrambe
// trovate), mai imposto. Nessuno stato è schiacciato in un semplice "verificato".
export type CableEndpointState = "trovato" | "non_trovato" | "da_rivedere" | "ignoto";

export type CableFieldStatus =
  | "collegato"
  | "parziale"
  | "non_trovato"
  | "da_rivedere"
  | "bloccato"
  | "da_verificare";

export interface CableFieldState {
  stato_partenza: CableEndpointState;
  stato_arrivo: CableEndpointState;
  status: CableFieldStatus;
  is_blocked: boolean;
}

export interface FieldVerificationEntry {
  status: FieldVerificationStatus;
  occurred_at: string;
}

/** Plie l'historico delle verifiche in uno stato a 2 assi + stato derivato. */
export function deriveCableFieldState(entries: ReadonlyArray<FieldVerificationEntry>): CableFieldState {
  const sorted = [...entries].sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)));
  let partenza: CableEndpointState = "ignoto";
  let arrivo: CableEndpointState = "ignoto";
  let blocked = false;

  for (const entry of sorted) {
    switch (entry.status) {
      case "AT_DEPARTURE":
        partenza = "trovato";
        blocked = false;
        break;
      case "AT_DESTINATION":
        arrivo = "trovato";
        blocked = false;
        break;
      case "CONNECTED_BOTH":
        partenza = "trovato";
        arrivo = "trovato";
        blocked = false;
        break;
      case "NOT_FOUND":
        partenza = "non_trovato";
        arrivo = "non_trovato";
        blocked = false;
        break;
      case "RECHECK":
        if (partenza !== "trovato") partenza = "da_rivedere";
        if (arrivo !== "trovato") arrivo = "da_rivedere";
        blocked = false;
        break;
      case "BLOCKED":
        blocked = true;
        break;
    }
  }

  let status: CableFieldStatus;
  if (blocked) status = "bloccato";
  else if (partenza === "trovato" && arrivo === "trovato") status = "collegato";
  else if (partenza === "trovato" || arrivo === "trovato") status = "parziale";
  else if (partenza === "non_trovato" && arrivo === "non_trovato") status = "non_trovato";
  else if (partenza === "da_rivedere" || arrivo === "da_rivedere") status = "da_rivedere";
  else status = "da_verificare";

  return { stato_partenza: partenza, stato_arrivo: arrivo, status, is_blocked: blocked };
}

const CABLE_FIELD_STATUS_LABELS: Record<CableFieldStatus, string> = {
  collegato: "Collegato",
  parziale: "Parziale",
  non_trovato: "Non trovato",
  da_rivedere: "Da ricontrollare",
  bloccato: "Bloccato",
  da_verificare: "Da verificare",
};

export function formatCableFieldStatusLabel(status: CableFieldStatus): string {
  return CABLE_FIELD_STATUS_LABELS[status];
}

// ── isRealBlocker — UNICA fonte di verità per "bloccato reale" ──────────────
// Un vero blocco esige una prova forte. "da verificare" / "senza prova" /
// "parziale" NON sono blocchi. Usare ovunque (Oggi, Campo, Apparati, Equipment,
// Situazione, Grafici) per non confondere mai da-verificare con bloccato.
export interface RealBlockerInput {
  incaIsBlocked?: boolean;       // INCA = B (interpretato a monte via translateIncaStatus)
  computedStatus?: string | null; // "blocked" (anomalia critica / agent finding)
  fieldStatus?: CableFieldStatus | null; // "bloccato" (Bloccato dichiarato dal capo)
  hasOpenBlockingFinding?: boolean;
}

export function isRealBlocker(input: RealBlockerInput): boolean {
  if (input.hasOpenBlockingFinding) return true;
  if (input.incaIsBlocked) return true;
  if (input.fieldStatus === "bloccato") return true;
  if (String(input.computedStatus ?? "").toLowerCase() === "blocked") return true;
  return false;
}
