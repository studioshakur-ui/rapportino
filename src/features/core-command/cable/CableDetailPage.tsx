// src/features/core-command/cable/CableDetailPage.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabaseClient";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { classifyCableEvidence } from "../../../core/cable/cableEvidence";
import {
  buildCableIdentity,
  cableKeyCompact,
} from "../../../core/cable/cableIdentity";
import { Pill, Screen, EmptyState } from "../../../components/command-ui";
import {
  FIELD_VERIFICATION_STATUS_OPTIONS,
  deriveForensicCableFieldState,
  formatCableEndpointStateLabel,
  formatCableFieldStatusLabel,
  getFieldVerificationStatusLabel,
  isRealBlocker,
  type FieldVerificationStatus,
  type ForensicFieldVerificationEntry,
} from "../../../domain/core-engine/fieldVerification";
import { useAuth } from "../../../auth/AuthProvider";
import { recordFieldVerification } from "../api/fieldVerification.api";
import type { CableEvent } from "../types";
import {
  CableEvidenceSections,
  type CableEvidenceItem,
} from "./CableEvidenceSections";

type FieldCoreEvent = {
  id: string;
  event_type: string;
  validation_status: string | null;
  occurred_at: string;
  confidence: number | null;
  raw_text: string | null;
  source_message_id: string | null;
  payload: Record<string, unknown> | null;
};

type ForensicEvidence = CableEvidenceItem & {
  verification_status: FieldVerificationStatus | null;
};

type CableListItem = {
  list_date: string | null;
  file_name: string;
  list_number: string | null;
  app_partenza: string | null;
  app_arrivo: string | null;
};

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function buildCableLookupCodes(raw: string): string[] {
  const identity = buildCableIdentity(raw);
  return Array.from(
    new Set(
      [
        identity.raw,
        identity.display,
        identity.strict,
        identity.loose,
        cableKeyCompact(identity.strict),
        cableKeyCompact(identity.loose),
      ]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function inferVerificationStatus(
  eventKind: string,
  payload: Record<string, unknown> | null,
): FieldVerificationStatus | null {
  const payloadObj = getObject(payload);
  const proof = getObject(payloadObj.proof);
  const status = getString(payloadObj.verification_status);
  if (
    status &&
    FIELD_VERIFICATION_STATUS_OPTIONS.some((option) => option.value === status)
  ) {
    return status as FieldVerificationStatus;
  }

  const position =
    getString(proof.detected_position) ??
    getString(payloadObj.detected_position);
  if (eventKind === "CABLE_POSATO" || eventKind === "POSED_REPORTED") {
    if (position === "partenza") return "AT_DEPARTURE";
    if (position === "arrivo") return "AT_DESTINATION";
    if (position === "entrambi") return "CONNECTED_BOTH";
  }
  if (eventKind === "CABLE_MANCANTE" || eventKind === "BLOCKED_REPORTED")
    return "NOT_FOUND";
  if (eventKind === "CABLE_CORTO" || eventKind === "CABLE_DA_CONTROLLARE")
    return "RECHECK";
  if (eventKind === "FIELD_VERIFIED") return null;
  return null;
}

function buildWhyResult(
  listItems: CableListItem[],
  linkedEvidence: ForensicEvidence[],
  ambiguousEvidence: ForensicEvidence[],
  relatedEvidence: ForensicEvidence[],
): string {
  const parts: string[] = [];
  parts.push(
    listItems.length > 0
      ? "Codice trovato nella lista attiva."
      : "Codice aperto direttamente dalla ricerca cavo.",
  );
  parts.push(
    linkedEvidence.length > 0
      ? linkedEvidence.length === 1
        ? "1 prova collegata confermata."
        : `${linkedEvidence.length} prove collegate confermate.`
      : "Nessuna prova campo confermata.",
  );
  if (ambiguousEvidence.length > 0) {
    const codes = Array.from(
      new Set(
        ambiguousEvidence
          .map((item) => item.match.normalized_detected_code)
          .filter(Boolean),
      ),
    ).join(", ");
    parts.push(
      `${ambiguousEvidence.length} candidat${ambiguousEvidence.length === 1 ? "o ambiguo" : "i ambigui"} trovati${codes ? `: ${codes}` : ""}. Validazione richiesta.`,
    );
  }
  if (relatedEvidence.length > 0) {
    parts.push(
      "Segnali presenti nel contesto, ma nessun riferimento diretto al cavo.",
    );
  }
  return parts.join(" ");
}

function isManualCoreEvent(event: FieldCoreEvent): boolean {
  return (
    event.event_type === "FIELD_VERIFIED" ||
    String(event.payload?.verification_source ?? "").toLowerCase() === "manual"
  );
}

function buildForensicEvidence(
  targetCableCode: string,
  events: CableEvent[],
  fieldEvents: FieldCoreEvent[],
): ForensicEvidence[] {
  const cableEvidence = events.map((event) => ({
    id: event.id,
    occurred_at: event.occurred_at,
    event_kind: event.event_kind,
    source: "cable_event" as const,
    note: event.note,
    match: classifyCableEvidence({
      targetCableCode,
      sourceText: event.note,
      sourceType: "telegram",
      validationStatus: null,
      isManualValidation: false,
    }),
    verification_status: inferVerificationStatus(event.event_kind, null),
    is_manual_validation: false,
  }));

  const coreEvidence = fieldEvents.map((event) => ({
    id: event.id,
    occurred_at: event.occurred_at,
    event_kind: event.event_type,
    source: "core_event" as const,
    note: event.raw_text,
    match: classifyCableEvidence({
      targetCableCode,
      sourceText: event.raw_text,
      sourceType: String(event.payload?.source ?? "core_event"),
      proofSourceType: String(
        event.payload?.source_type ?? event.payload?.proof_source_type ?? "",
      ),
      validationStatus: event.validation_status,
      isManualValidation: isManualCoreEvent(event),
    }),
    verification_status: inferVerificationStatus(
      event.event_type,
      event.payload,
    ),
    is_manual_validation: isManualCoreEvent(event),
  }));

  return [...cableEvidence, ...coreEvidence].sort(
    (a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );
}

async function fetchCableDetail(raw: string) {
  const lookupCodes = buildCableLookupCodes(raw);

  const [eventsRes, listRes, priRes, coreRes] = await Promise.all([
    supabase
      .from("cable_events")
      .select("*")
      .in("cable_code", lookupCodes)
      .order("occurred_at", { ascending: false })
      .limit(100),

    supabase
      .from("daily_list_items")
      .select(
        "list_number, import_id, app_partenza, app_arrivo, daily_list_imports!inner(list_date, file_name)",
      )
      .in("cable_code_normalized", lookupCodes)
      .order("import_id"),

    supabase
      .from("cable_priorities")
      .select("id, reason, priority, status, created_at")
      .in("cable_code", lookupCodes)
      .eq("status", "open")
      .order("created_at", { ascending: false }),

    supabase
      .from("core_events")
      .select(
        "id,event_type,validation_status,occurred_at,confidence,raw_text,source_message_id,payload",
      )
      .in("cable_code_normalized", lookupCodes)
      .neq("validation_status", "rejected")
      .order("occurred_at", { ascending: false })
      .limit(100),
  ]);

  const listItems: CableListItem[] = (listRes.data ?? []).map((item: any) => ({
    list_date: item.daily_list_imports?.list_date ?? null,
    file_name: item.daily_list_imports?.file_name ?? "",
    list_number: item.list_number ?? null,
    app_partenza: item.app_partenza ?? null,
    app_arrivo: item.app_arrivo ?? null,
  }));

  return {
    events: (eventsRes.data ?? []) as CableEvent[],
    listItems,
    priorities:
      priRes.data ??
      ([] as Array<{
        id: string;
        reason: string | null;
        priority: string;
        status: string;
        created_at: string;
      }>),
    fieldEvents: (coreRes.data ?? []) as FieldCoreEvent[],
  };
}

export default function CableDetailPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { uid } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const cableCode = code ? decodeURIComponent(code) : "";
  const displayCode = formatCableDisplay(cableCode);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["cable_detail", cableCode],
    queryFn: () => fetchCableDetail(cableCode),
    enabled: !!cableCode,
    staleTime: 15_000,
  });

  const events = data?.events ?? [];
  const listItems = data?.listItems ?? [];
  const priorities = data?.priorities ?? [];
  const fieldEvents = data?.fieldEvents ?? [];
  const latestListItem = listItems[0] ?? null;
  const forensicEvidence = buildForensicEvidence(
    displayCode || cableCode,
    events,
    fieldEvents,
  );
  const linkedEvidence = forensicEvidence.filter(
    (item) => item.match.bucket === "linked",
  );
  const ambiguousEvidence = forensicEvidence.filter(
    (item) => item.match.bucket === "ambiguous",
  );
  const relatedEvidence = forensicEvidence.filter(
    (item) => item.match.bucket === "related",
  );
  const lastEvent = linkedEvidence[0] ?? null;
  // Stato campo = SOLO prove "linked" o validazioni manuali del capo (§5 della
  // vision): una frase chiara in un messaggio collegato O un'azione esplicita
  // del capo possono muovere lo stato. Ambigui/correlati non lo toccano mai.
  const forensicFieldEntries: ForensicFieldVerificationEntry[] = forensicEvidence
    .filter((item) => item.verification_status != null)
    .map((item) => ({
      status: item.verification_status as FieldVerificationStatus,
      occurred_at: item.occurred_at,
      evidence_bucket: item.match.bucket,
      is_manual_validation: item.is_manual_validation,
    }));
  const cableFieldState = deriveForensicCableFieldState(forensicFieldEntries);
  const hasRealBlocker = isRealBlocker({ fieldStatus: cableFieldState.status });
  const whyResult = buildWhyResult(
    listItems,
    linkedEvidence,
    ambiguousEvidence,
    relatedEvidence,
  );

  // Nessuno stato è dedotto di default: l'operatore sceglie esplicitamente
  // cosa ha visto sul campo (mai un CONNECTED_BOTH implicito).
  async function verifyOnField(status: FieldVerificationStatus): Promise<void> {
    if (!uid) {
      setFeedback("Utente non autenticato");
      return;
    }
    try {
      await recordFieldVerification({
        cableCodeRaw: displayCode || cableCode,
        cableCodeNormalized: buildCableIdentity(cableCode).strict,
        verificationStatus: status,
        verificationSource: "manual",
        verifiedBy: uid,
        note: null,
      });
      setFeedback(
        `Stato registrato: ${getFieldVerificationStatusLabel(status)}`,
      );
      await queryClient.invalidateQueries({
        queryKey: ["cable_detail", cableCode],
      });
      await queryClient.invalidateQueries({
        queryKey: ["core_engine_snapshot"],
      });
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Errore durante la verifica",
      );
    }
  }

  return (
    <Screen className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500">
            Cavo
          </p>
          <h1 className="font-mono text-3xl font-bold tracking-tight text-stone-950">
            {displayCode || cableCode || "—"}
          </h1>
          {!isLoading && lastEvent && (
            <p className="text-sm text-stone-500">
              Ultima prova collegata:{" "}
              {new Date(lastEvent.occurred_at).toLocaleDateString("it-IT", {
                day: "2-digit",
                month: "long",
              })}{" "}
              alle{" "}
              {new Date(lastEvent.occurred_at).toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 pt-1">
          {!isLoading ? (
            <Pill
              tone={
                cableFieldState.status === "collegato"
                  ? "emerald"
                  : hasRealBlocker
                    ? "red"
                    : "amber"
              }
            >
              {formatCableFieldStatusLabel(cableFieldState.status)}
            </Pill>
          ) : null}
          <button
            onClick={() => navigate("/import")}
            className="min-h-9 rounded-lg border border-stone-200 px-3 text-xs font-medium text-stone-500 transition hover:border-stone-400 hover:text-stone-700"
          >
            INCA →
          </button>
        </div>
      </div>

      {/* Verifica sul campo — stato esplicito, nessun default */}
      {!isLoading && cableFieldState.status !== "bloccato" && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Stato rilevato sul campo
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FIELD_VERIFICATION_STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => void verifyOnField(option.value)}
                disabled={!uid}
                className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  option.isBlocker
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : option.countsAsVerified
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {feedback && (
            <p className="text-sm font-medium text-emerald-700">{feedback}</p>
          )}
        </section>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-stone-200 bg-stone-100"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore di caricamento. Verifica la connessione.
        </div>
      )}

      {/* Open priorities */}
      {!isLoading && priorities.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-700">
            {priorities.length} priorità aperte
          </h2>
          {priorities.map((p: any) => (
            <div
              key={p.id}
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-amber-800">
                  {p.reason ?? "Problema segnalato"}
                </p>
                <Pill tone="amber">
                  {p.priority === "critical"
                    ? "Critica"
                    : p.priority === "high"
                      ? "Alta"
                      : "Media"}
                </Pill>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {new Date(p.created_at).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "long",
                })}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Daily list membership */}
      {!isLoading && listItems.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            Presente nelle liste
          </h2>
          <div className="flex flex-wrap gap-2">
            {listItems.map((item: any, i: number) => (
              <div
                key={i}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm"
              >
                <span className="text-stone-700">
                  {item.list_date
                    ? new Date(item.list_date + "T12:00:00").toLocaleDateString(
                        "it-IT",
                        {
                          day: "2-digit",
                          month: "long",
                        },
                      )
                    : item.file_name}
                </span>
                {item.list_number && (
                  <span className="ml-2 text-xs text-stone-400">
                    · lista n° {item.list_number}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!isLoading &&
        !isError &&
        linkedEvidence.length === 0 &&
        ambiguousEvidence.length === 0 &&
        relatedEvidence.length === 0 && (
          <EmptyState
            title="Nessuna prova registrata"
            description="Questo cavo non ha ancora prove con codice esplicito o validazione manuale."
            icon="○"
          />
        )}
      {feedback ? (
        <p className="text-sm font-medium text-emerald-700">{feedback}</p>
      ) : null}

      {/* Forensic evidence */}
      {!isLoading && (
        <section className="space-y-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
              Perché questo risultato
            </h2>
            <p className="mt-2 text-sm text-stone-600">{whyResult}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Partenza / Arrivo
              </h2>
              <div className="mt-2 space-y-1 text-sm">
                <p className="font-semibold text-stone-700">Stato campo</p>
                <p className="text-stone-600">
                  Stato operativo:{" "}
                  {formatCableFieldStatusLabel(cableFieldState.status)}
                </p>
                <p className="text-stone-600">
                  Blocco reale: {hasRealBlocker ? "Sì" : "No"}
                </p>
                <p className="text-stone-600">
                  Partenza:{" "}
                  {formatCableEndpointStateLabel(
                    cableFieldState.stato_partenza,
                  )}
                </p>
                <p className="text-stone-600">
                  Arrivo:{" "}
                  {formatCableEndpointStateLabel(cableFieldState.stato_arrivo)}
                </p>
              </div>
              <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
                <p className="font-semibold text-stone-700">Apparati</p>
                <p className="text-stone-500">
                  Apparato partenza: {latestListItem?.app_partenza ?? "—"}
                </p>
                <p className="text-stone-500">
                  Apparato arrivo: {latestListItem?.app_arrivo ?? "—"}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Azione consigliata
              </h2>
              <p className="mt-2 text-sm text-stone-700">
                {linkedEvidence.length > 0
                  ? "Usare solo le prove collegate qui sotto per decisioni operative."
                  : ambiguousEvidence.length > 0
                    ? "Validare manualmente i candidati prima di considerarli prova."
                    : "Richiedere una foto/messaggio dove il codice target sia leggibile."}
              </p>
            </div>
          </div>

          <CableEvidenceSections
            linkedEvidence={linkedEvidence}
            ambiguousEvidence={ambiguousEvidence}
            relatedEvidence={relatedEvidence}
          />
        </section>
      )}
    </Screen>
  );
}
