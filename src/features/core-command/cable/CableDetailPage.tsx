// src/features/core-command/cable/CableDetailPage.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabaseClient";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import {
  buildHighlightedText,
  classifyCableEvidence,
  type CableEvidenceMatch,
} from "../../../core/cable/cableEvidence";
import { normalizeCableStrict } from "../../../core/cable/cableIdentity";
import { Pill, Screen, EmptyState } from "../../../components/command-ui";
import {
  FIELD_VERIFICATION_STATUS_OPTIONS,
  formatFieldStatusLabel,
  getFieldVerificationStatusLabel,
  resolveFieldStatus,
  type FieldVerificationStatus,
} from "../../../domain/core-engine/fieldVerification";
import { useAuth } from "../../../auth/AuthProvider";
import { recordFieldVerification } from "../api/fieldVerification.api";
import type { CableEvent } from "../types";

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

type ForensicEvidence = {
  id: string;
  occurred_at: string;
  event_kind: string;
  source: "cable_event" | "core_event";
  note: string | null;
  match: CableEvidenceMatch;
};

type CableListItem = {
  list_date: string | null;
  file_name: string;
  list_number: string | null;
  app_partenza: string | null;
  app_arrivo: string | null;
};

// Normalize cable code for DB lookup: "C CS 102" or "CCS102" → "CCS 102"
function normalizeForQuery(raw: string): string {
  const c = raw.replace(/\s+/g, "").replace(/\./g, "").toUpperCase();
  const m = c.match(/^([A-Z])([A-Z]{1,4})(\d{2,5})([A-Z]?)$/);
  if (m) {
    const [, head, letters, digits, suffix] = m;
    return suffix
      ? `${head}${letters} ${digits} ${suffix}`
      : `${head}${letters} ${digits}`;
  }
  return c;
}

const KIND_META: Record<string, { label: string; tone: string; dot: string }> =
  {
    CABLE_POSATO: {
      label: "Cavo posato",
      tone: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    CABLE_MENTION: {
      label: "Nota campo",
      tone: "text-stone-500",
      dot: "bg-stone-400",
    },
    CABLE_SFILATO: {
      label: "Cavo sfilato",
      tone: "text-sky-600",
      dot: "bg-sky-500",
    },
    CABLE_CORTO: {
      label: "Cavo corto",
      tone: "text-amber-700",
      dot: "bg-amber-500",
    },
    CABLE_MANCANTE: {
      label: "Cavo mancante",
      tone: "text-red-700",
      dot: "bg-red-500",
    },
    CABLE_DA_CONTROLLARE: {
      label: "Da verificare",
      tone: "text-amber-700",
      dot: "bg-amber-400",
    },
    GENERAL_MESSAGE: {
      label: "Segnale campo",
      tone: "text-stone-500",
      dot: "bg-stone-400",
    },
    posa: {
      label: "Cavo posato",
      tone: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    ripresa: { label: "Ripresa", tone: "text-sky-600", dot: "bg-sky-500" },
    blocco: { label: "Bloccato", tone: "text-red-700", dot: "bg-red-500" },
    anomalia: {
      label: "Anomalia",
      tone: "text-amber-700",
      dot: "bg-amber-500",
    },
  };

function kindMeta(kind: string) {
  return (
    KIND_META[kind] ?? {
      label: kind.replace(/_/g, " "),
      tone: "text-stone-500",
      dot: "bg-stone-400",
    }
  );
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
  }));

  return [...cableEvidence, ...coreEvidence].sort(
    (a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );
}

function EvidenceCard({ item }: { item: ForensicEvidence }) {
  const meta = kindMeta(item.event_kind);
  const text = item.note ?? item.match.source_text_excerpt ?? "";
  const parts = buildHighlightedText(
    text,
    item.match.highlight_start,
    item.match.highlight_end,
  );
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
          <span className={`text-sm font-semibold ${meta.tone}`}>
            {meta.label}
          </span>
          <Pill
            tone={
              item.match.bucket === "linked"
                ? "emerald"
                : item.match.bucket === "ambiguous"
                  ? "amber"
                  : "neutral"
            }
          >
            {item.match.match_type}
          </Pill>
        </div>
        <span className="text-xs text-stone-400">
          {new Date(item.occurred_at).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short",
          })}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-xs text-stone-600 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-stone-500">target_cable_code</dt>
          <dd className="font-mono">{item.match.target_cable_code}</dd>
        </div>
        <div>
          <dt className="font-semibold text-stone-500">raw_detected_code</dt>
          <dd className="font-mono">{item.match.raw_detected_code ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-stone-500">
            normalized_detected_code
          </dt>
          <dd className="font-mono">
            {item.match.normalized_detected_code ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-stone-500">match_confidence</dt>
          <dd>{Math.round(item.match.match_confidence * 100)}%</dd>
        </div>
      </dl>
      <div className="mt-3 rounded-xl bg-stone-50 p-3 text-sm leading-relaxed text-stone-700">
        {parts.map((part, index) =>
          part.highlight ? (
            <mark
              key={index}
              className="rounded bg-amber-200 px-1 font-semibold text-stone-950"
            >
              {part.text}
            </mark>
          ) : (
            <span key={index}>{part.text}</span>
          ),
        )}
      </div>
      <p className="mt-2 text-xs text-stone-500">{item.match.match_reason}</p>
      {item.match.requires_human_validation ? (
        <p className="mt-1 text-xs font-semibold text-amber-700">
          Richiede validazione capo
        </p>
      ) : null}
    </div>
  );
}

async function fetchCableDetail(raw: string) {
  const normalized = normalizeForQuery(raw);
  const strict = normalizeCableStrict(raw);
  const compact = strict.replace(/\s+/g, "").toUpperCase();
  const lookupCodes = Array.from(
    new Set([normalized, strict, compact, raw.toUpperCase()].filter(Boolean)),
  );

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
  const latestFieldEvent =
    fieldEvents.find(
      (event) =>
        event.event_type === "FIELD_VERIFIED" ||
        event.event_type === "POSED_REPORTED" ||
        event.event_type === "RESOLVED" ||
        event.event_type === "CONFIRMED",
    ) ?? null;
  const fieldStatus = resolveFieldStatus({
    hasCriticalFinding: fieldEvents.some(
      (event) => event.event_type === "BLOCKED_REPORTED",
    ),
    hasVerificationProof: Boolean(
      latestFieldEvent ||
      lastEvent?.event_kind === "CABLE_POSATO" ||
      lastEvent?.event_kind === "posa",
    ),
  });

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
        cableCodeNormalized: normalizeForQuery(cableCode),
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
                fieldStatus === "VERIFIED"
                  ? "emerald"
                  : fieldStatus === "BLOCKED"
                    ? "red"
                    : "amber"
              }
            >
              {formatFieldStatusLabel(fieldStatus)}
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
      {!isLoading && fieldStatus !== "BLOCKED" && (
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
            <p className="mt-2 text-sm text-stone-600">
              Storico confermato solo con strict match evidenziabile nel
              testo/OCR o validazione manuale. I loose match e i segnali senza
              codice target restano fuori dallo storico principale.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Partenza / Arrivo
              </h2>
              <p className="mt-2 text-sm text-stone-700">
                Stato operativo: {formatFieldStatusLabel(fieldStatus)}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Partenza: {latestListItem?.app_partenza ?? "—"}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                Arrivo: {latestListItem?.app_arrivo ?? "—"}
              </p>
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

          <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            Prove collegate — {linkedEvidence.length}
          </h2>
          {linkedEvidence.length > 0 ? (
            linkedEvidence.map((item) => (
              <EvidenceCard key={`${item.source}:${item.id}`} item={item} />
            ))
          ) : (
            <p className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">
              Nessuna prova confermata per questo cavo.
            </p>
          )}

          {ambiguousEvidence.length > 0 && (
            <>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-700">
                Candidati ambigui — {ambiguousEvidence.length}
              </h2>
              {ambiguousEvidence.map((item) => (
                <EvidenceCard key={`${item.source}:${item.id}`} item={item} />
              ))}
            </>
          )}

          {relatedEvidence.length > 0 && (
            <>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Segnali correlati non collegati — {relatedEvidence.length}
              </h2>
              {relatedEvidence.map((item) => (
                <EvidenceCard key={`${item.source}:${item.id}`} item={item} />
              ))}
            </>
          )}
        </section>
      )}
    </Screen>
  );
}
