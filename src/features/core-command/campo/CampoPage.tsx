import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppBar, Btn, EmptyState, Pill, Screen, Section, StatCard } from "../../../components/command-ui";
import { classifyIncomingNow, parseTerrainImagesNow } from "../api/ai.api";
import { useAuth } from "../../../auth/AuthProvider";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { loadCoreEngineSnapshot } from "../../../domain/core-engine";
import {
  canConfirmFieldVerification,
  FIELD_VERIFICATION_STATUS_OPTIONS,
  formatFieldStatusLabel,
  getFieldVerificationStatusLabel,
  resolveFieldStatus,
  type FieldVerificationStatus,
} from "../../../domain/core-engine/fieldVerification";
import { getPendingEvents, rejectEvent, validateEvent } from "../api/coreEvents.api";
import { recordFieldVerification } from "../api/fieldVerification.api";
import { listRecentTelegramMessages, type TelegramLiveMessage } from "../api/telegramMessages.api";
import type { CoreEvent } from "../types";

function formatDate(value: string | null): string {
  if (!value) return "data sconosciuta";
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Barra di sincronizzazione manuale. Il cron classifica/legge ogni 30 min ;
// questi pulsanti forzano un aggiornamento immediato quando serve.
function FieldSyncBar(): JSX.Element {
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  function invalidate(): void {
    void queryClient.invalidateQueries({ queryKey: ["core_engine_snapshot"] });
    void queryClient.invalidateQueries({ queryKey: ["core_events", "pending"] });
    void queryClient.invalidateQueries({ queryKey: ["incoming_messages", "telegram", "proofs"] });
  }

  const classify = useMutation({
    mutationFn: classifyIncomingNow,
    onSuccess: (r) => { setMsg(`Messaggi: ${r.processed} elaborati · ${r.events_created} prove`); invalidate(); },
    onError: (e) => setMsg((e as Error).message),
  });
  const vision = useMutation({
    mutationFn: parseTerrainImagesNow,
    onSuccess: (r) => { setMsg(`Foto: ${r.processed} lette · ${r.snapshots_created} apparati`); invalidate(); },
    onError: (e) => setMsg((e as Error).message),
  });

  const busy = classify.isPending || vision.isPending;

  return (
    <div className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-950">Aggiorna prove dal campo</p>
          <p className="mt-0.5 text-xs text-stone-500">Automatico ogni 30 min · forza ora se serve</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => classify.mutate()} disabled={busy} variant="secondary">
            {classify.isPending ? "…" : "Classifica messaggi"}
          </Btn>
          <Btn onClick={() => vision.mutate()} disabled={busy} variant="secondary">
            {vision.isPending ? "…" : "Leggi foto liste"}
          </Btn>
        </div>
      </div>
      {msg ? <p className="mt-2 text-xs font-medium text-stone-600">{msg}</p> : null}
    </div>
  );
}

export default function CampoPage(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { uid } = useAuth();
  const [selectedItem, setSelectedItem] = useState<FieldItem | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<FieldVerificationStatus | null>(null);
  const [verificationNote, setVerificationNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["core_engine_snapshot"],
    queryFn: loadCoreEngineSnapshot,
    staleTime: 30_000,
  });
  const { data: pendingEvents = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["core_events", "pending"],
    queryFn: () => getPendingEvents(50),
    staleTime: 10_000,
  });
  const { data: telegramProofs = [], isLoading: telegramLoading } = useQuery({
    queryKey: ["incoming_messages", "telegram", "proofs"],
    queryFn: () => listRecentTelegramMessages(48),
    staleTime: 15_000,
  });

  const field = data?.field ?? null;
  const summary = field?.summary ?? null;
  const pendingFieldEvents = pendingEvents.filter((event) => event.event_type === "FIELD_VERIFIED");
  const pendingMessageEvents = pendingEvents.filter((event) => event.event_type !== "FIELD_VERIFIED");
  const proofsToday = telegramProofs.filter((message) => isToday(message.message_ts));
  const unlinkedProofs = telegramProofs.filter((message) => !message.linked_to_cable && !message.linked_to_equipment);
  const failedOcrProofs = telegramProofs.filter((message) =>
    message.classification.ocr_status === "OCR fallito" || message.classification.ocr_status === "Cavo non riconosciuto"
  );
  const lowConfidenceProofs = telegramProofs.filter((message) =>
    (message.classification.confidence ?? 1) < 0.6 || message.classification.ocr_status === "Bassa confidenza"
  );
  const toValidateProofs = telegramProofs.filter((message) => message.classification.requires_human_validation);
  const linkedCableProofs = telegramProofs.filter((message) => message.linked_to_cable);
  const linkedEquipmentProofs = telegramProofs.filter((message) => message.linked_to_equipment);
  const incoherentProofs = telegramProofs.filter((message) => Boolean(message.classification.incoherence_reason));
  const actionItems = field ? mergeFieldItems([
    ...field.partial_items,
    ...field.missing_evidence_items,
    ...field.priority_items,
  ].filter((item) => item.computed_status !== "confirmed_field" && item.computed_status !== "likely_laid")) : [];
  const verifiedItems = field ? mergeFieldItems(field.priority_items.filter((item) => item.computed_status === "confirmed_field" || item.computed_status === "likely_laid")) : [];

  function openVerification(item: FieldItem): void {
    setSelectedItem(item);
    setVerificationStatus(null);
    setVerificationNote("");
    setFeedback(null);
  }

  function closeVerification(): void {
    setSelectedItem(null);
    setVerificationStatus(null);
    setVerificationNote("");
  }

  async function confirmVerification(): Promise<void> {
    if (!selectedItem || !verificationStatus) return;
    if (!uid) {
      setFeedback("Utente non autenticato");
      return;
    }

    try {
      await recordFieldVerification({
        cableCodeRaw: selectedItem.display_cable_code || formatCableDisplay(selectedItem.cable_code),
        cableCodeNormalized: selectedItem.cable_code,
        verificationSource: "manual",
        verificationStatus,
        verifiedBy: uid,
        note: verificationNote.trim() || null,
        appPartenza: selectedItem.app_partenza ?? null,
        appArrivo: selectedItem.app_arrivo ?? null,
      });
      const label = getFieldVerificationStatusLabel(verificationStatus);
      closeVerification();
      setFeedback(`${label} registrato. In attesa di validazione.`);
      await queryClient.invalidateQueries({ queryKey: ["core_engine_snapshot"] });
      await queryClient.invalidateQueries({ queryKey: ["core_events"] });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Errore durante la verifica");
    }
  }

  async function decidePendingEvent(eventId: string, decision: "validate" | "reject"): Promise<void> {
    if (!uid) {
      setFeedback("Utente non autenticato");
      return;
    }

    try {
      if (decision === "validate") {
        await validateEvent(eventId, uid);
        setFeedback("Evento validato. Il motore aggiornerà Campo e Apparati.");
      } else {
        await rejectEvent(eventId, uid);
        setFeedback("Evento rifiutato.");
      }
      await queryClient.invalidateQueries({ queryKey: ["core_events"] });
      await queryClient.invalidateQueries({ queryKey: ["core_engine_snapshot"] });
      await queryClient.invalidateQueries({ queryKey: ["cable_detail"] });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Errore durante la validazione");
    }
  }

  return (
    <Screen className="max-w-6xl space-y-6">
      <AppBar
        title="Campo"
        subtitle="Prove, import e messaggi che hanno cambiato la situazione sul terreno."
      />

      <FieldSyncBar />

      <section className="theme-card-surface rounded-[24px] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] theme-token-faint">Come funziona</p>
        <h2 className="mt-2 text-base font-semibold theme-token-text">Raccoglie e prepara le prove dal campo</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 theme-token-muted">
          CORE classifica i messaggi e legge le foto delle liste automaticamente ogni 30 minuti. Usa le azioni qui sopra
          solo quando serve forzare un aggiornamento immediato; le prove elaborate alimentano poi cavi, apparati e validazioni.
        </p>
      </section>

      {!isLoading && !field ? (
        <EmptyState
          title="Nessun dato disponibile"
          description="Importa una lista o sincronizza Telegram per vedere le prove campo."
          icon="📡"
        />
      ) : null}

      {field ? (
        <>
          {summary ? (
            <Section title="Lista attiva" eyebrow="Import">
              <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">{summary.file_name}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {summary.list_date ?? "data sconosciuta"} · {summary.total} cavi
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/import")}
                    className="min-h-10 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-950"
                  >
                    Gestisci import
                  </button>
                </div>
              </div>
            </Section>
          ) : null}

          <EvidenceList
            title="Da fare sul campo"
            count={actionItems.length}
            items={actionItems}
            onOpen={(item) => openVerification(item)}
            onOpenDetail={(code) => navigate(code)}
            primaryAction="Verifica sul campo"
          />

          <PendingEventsList
            events={pendingFieldEvents}
            messageEventsCount={pendingMessageEvents.length}
            isLoading={pendingLoading}
            onValidate={(eventId) => void decidePendingEvent(eventId, "validate")}
            onReject={(eventId) => void decidePendingEvent(eventId, "reject")}
            onOpenCable={(route) => navigate(route)}
          />

          <ProofOverview
            isLoading={telegramLoading}
            sections={[
              { title: "Prove arrivate oggi", items: proofsToday },
              { title: "Prove non collegate", items: unlinkedProofs },
              { title: "Foto OCR fallite", items: failedOcrProofs },
              { title: "Prove a bassa confidenza", items: lowConfidenceProofs },
              { title: "Prove da validare", items: toValidateProofs },
              { title: "Prove collegate a cavo", items: linkedCableProofs },
              { title: "Prove collegate ad apparato", items: linkedEquipmentProofs },
              { title: "Incoerenze da verificare", items: incoherentProofs },
            ]}
          />

          <section className="grid gap-4 lg:grid-cols-2">
            <EvidenceList
              title="Bloccanti reali"
              count={field.blocked_items.length}
              items={field.blocked_items}
              onOpen={(item) => navigate(item.cable_story_path)}
              onOpenDetail={(code) => navigate(code)}
              primaryAction="Apri blocco"
            />
            <EvidenceList
              title="Verificati oggi"
              count={verifiedItems.length}
              items={verifiedItems}
              onOpen={(item) => navigate(item.cable_story_path)}
              onOpenDetail={(code) => navigate(code)}
              primaryAction="Apri cavo"
            />
          </section>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Da fare" value={actionItems.length} tone={actionItems.length > 0 ? "amber" : "emerald"} />
            <StatCard label="Validazioni" value={pendingFieldEvents.length} tone={pendingFieldEvents.length > 0 ? "amber" : "neutral"} helper={pendingMessageEvents.length > 0 ? `${pendingMessageEvents.length} messaggi esclusi` : undefined} />
            <StatCard label="Bloccanti reali" value={field.blocked_items.length} tone={field.blocked_items.length > 0 ? "red" : "neutral"} />
            <StatCard label="Verificati oggi" value={verifiedItems.length} tone="emerald" />
          </div>
        </>
      ) : null}

      {feedback ? (
        <div className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg lg:left-auto lg:right-6 lg:w-96">
          {feedback}
        </div>
      ) : null}

      {selectedItem ? (
        <aside className="fixed inset-x-0 bottom-0 z-40 max-h-[88vh] overflow-y-auto border-t border-stone-200 bg-white shadow-[0_-12px_30px_rgba(15,23,42,0.14)] lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[420px] lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-stone-950">Verifica sul campo</p>
              <p className="mt-1 text-xs text-stone-500">Scegli cosa hai visto. Nessuna conferma automatica.</p>
            </div>
            <button
              type="button"
              onClick={closeVerification}
              className="min-h-10 rounded-xl border border-stone-200 px-3 text-sm font-semibold text-stone-500 transition hover:text-stone-950"
            >
              Chiudi
            </button>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Cavo</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-stone-950">
                {selectedItem.display_cable_code || formatCableDisplay(selectedItem.cable_code)}
              </p>
              <p className="mt-2 text-sm text-stone-600">
                {selectedItem.perimetro ?? "Sistema non assegnato"} · {selectedItem.evidence_count} prove ·{" "}
                {selectedItem.last_event_at ? formatDate(selectedItem.last_event_at) : "senza data"}
              </p>
              <p className="mt-2 text-xs text-stone-500">
                Da {selectedItem.app_partenza ?? "—"} · A {selectedItem.app_arrivo ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-stone-950">Stato rilevato</p>
              <div className="mt-3 grid gap-2">
                {FIELD_VERIFICATION_STATUS_OPTIONS.map((option) => {
                  const selected = verificationStatus === option.value;
                  const tone = option.isBlocker
                    ? "border-red-200 bg-red-50 text-red-700"
                    : option.countsAsVerified
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700";
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVerificationStatus(option.value)}
                      className={`min-h-12 rounded-2xl border px-4 text-left text-sm font-semibold transition ${tone} ${
                        selected ? "ring-2 ring-stone-950/80" : "hover:border-stone-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs leading-5 text-stone-500">
                Trovato a partenza o arrivo resta parziale. Trovato a entrambi chiude le due estremità. Non trovato e Da ricontrollare non confermano il cavo.
              </p>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-stone-950">Nota opzionale</span>
              <textarea
                rows={4}
                value={verificationNote}
                onChange={(event) => setVerificationNote(event.target.value)}
                placeholder="Es. visto da Mario, foto ricevuta, accesso non possibile..."
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm outline-none placeholder:text-stone-400 focus:border-emerald-300"
              />
            </label>

            <div className="flex gap-2 border-t border-stone-200 pt-4">
              <button
                type="button"
                onClick={() => navigate(selectedItem.cable_story_path)}
                className="min-h-11 flex-1 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700"
              >
                Apri scheda
              </button>
              <button
                type="button"
                onClick={() => void confirmVerification()}
                disabled={!canConfirmFieldVerification("TO_VERIFY", verificationStatus)}
                className="min-h-11 flex-1 rounded-2xl border border-stone-950 bg-stone-950 px-4 text-sm font-semibold text-white shadow-lg transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-200 disabled:text-stone-500"
              >
                Registra
              </button>
            </div>
          </div>
        </aside>
      ) : null}
    </Screen>
  );
}

function ProofOverview({
  isLoading,
  sections,
}: {
  isLoading: boolean;
  sections: Array<{ title: string; items: TelegramLiveMessage[] }>;
}): JSX.Element {
  if (isLoading) {
    return (
      <Section title="Prove IA" eyebrow="Campo">
        <div className="h-24 animate-pulse rounded-[24px] border border-stone-200 bg-stone-100" />
      </Section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {sections.map((section) => (
        <Section key={section.title} title={section.title} eyebrow="Campo" count={section.items.length}>
          {section.items.length === 0 ? (
            <EmptyState
              title="Nessuna prova"
              description="Questa vista si aggiorna quando arrivano messaggi o foto dal campo."
              icon="∅"
            />
          ) : (
            <div className="space-y-3">
              {section.items.slice(0, 4).map((message) => (
                <article key={`${section.title}:${message.id}`} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-950">
                        {message.classification.detected_status ?? "Da validare"}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {message.sender_name ?? "Sorgente sconosciuta"} · {formatDate(message.message_ts)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-stone-700">{message.text ?? "Messaggio senza testo"}</p>
                      <p className="mt-2 text-xs text-stone-500">
                        {message.classification.confidence_reason ?? message.classification.recommended_action ?? "Validazione richiesta"}
                      </p>
                    </div>
                    <Pill tone={proofTone(message)}>
                      {proofPillLabel(message)}
                    </Pill>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Section>
      ))}
    </section>
  );
}

function PendingEventsList({
  events,
  messageEventsCount,
  isLoading,
  onValidate,
  onReject,
  onOpenCable,
}: {
  events: CoreEvent[];
  messageEventsCount: number;
  isLoading: boolean;
  onValidate: (eventId: string) => void;
  onReject: (eventId: string) => void;
  onOpenCable: (route: string) => void;
}): JSX.Element {
  if (isLoading) {
    return (
      <Section title="In attesa di validazione" eyebrow="Campo">
        <div className="h-24 animate-pulse rounded-[24px] border border-stone-200 bg-stone-100" />
      </Section>
    );
  }

  if (events.length === 0) {
    return (
      <Section title="In attesa di validazione" eyebrow="Campo" count={0}>
        <EmptyState
          title="Nessuna verifica in attesa"
          description={
            messageEventsCount > 0
              ? `${messageEventsCount} messaggi restano in memoria, ma non sono prove campo da validare.`
              : "Le verifiche registrate dal campo appariranno qui prima di aggiornare cavi e apparati."
          }
          icon="✓"
          tone="emerald"
        />
      </Section>
    );
  }

  return (
    <Section title="In attesa di validazione" eyebrow="Campo" count={events.length}>
      <div className="space-y-3">
        {events.map((event) => {
          const payload = asPayload(event.payload);
          const statusLabel = getString(payload.verification_status_label) ?? event.event_type;
          const cableCode = event.cable_code_normalized ?? event.cable_code_raw ?? getString(payload.cable_code) ?? "—";
          const note = event.raw_text ?? getString(payload.note);
          return (
            <article key={event.id} className="rounded-[24px] border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-stone-950">{formatCableDisplay(cableCode)}</p>
                  <p className="mt-1 text-xs text-stone-600">
                    {statusLabel} · {formatDate(event.occurred_at)}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Da {getString(payload.app_partenza) ?? "—"} · A {getString(payload.app_arrivo) ?? "—"}
                  </p>
                  {note ? <p className="mt-2 text-xs leading-5 text-stone-700">{note}</p> : null}
                </div>
                <Pill tone="amber">In attesa</Pill>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => onValidate(event.id)}
                  className="min-h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  Valida
                </button>
                <button
                  type="button"
                  onClick={() => onReject(event.id)}
                  className="min-h-10 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Rifiuta
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCable(`/cable/${encodeURIComponent(cableCode)}`)}
                  className="min-h-10 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:text-stone-950"
                >
                  Apri scheda
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

const EVIDENCE_PAGE_SIZE = 10;

function EvidenceList({
  title,
  count,
  items,
  onOpen,
  onOpenDetail,
  primaryAction,
}: {
  title: string;
  count: number;
  items: FieldItem[];
  onOpen: (item: FieldItem) => void;
  onOpenDetail: (route: string) => void;
  primaryAction: string;
}): JSX.Element {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, EVIDENCE_PAGE_SIZE);

  return (
    <Section title={title} eyebrow="Campo" count={count}>
      {items.length === 0 ? (
        <EmptyState
          title="Nessun dato disponibile"
          description="Questa sezione si riempirà quando arriveranno prove o blocchi."
          icon="∅"
        />
      ) : (
        <>
          <div className="space-y-3">
            {visible.map((item) => (
              <article
                key={item.cable_code}
                className="w-full rounded-[24px] border border-stone-200 bg-white p-4 text-left shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-stone-950">{formatCableDisplay(item.cable_code)}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {item.perimetro ?? "—"} · {item.evidence_count} prove · {item.last_event_at ? formatDate(item.last_event_at) : "senza data"}
                    </p>
                    {item.last_actor ? <p className="mt-2 text-xs text-stone-600">{item.last_actor}</p> : null}
                    {item.last_message ? <p className="mt-1 text-xs leading-5 text-stone-600">{item.last_message}</p> : null}
                  </div>
                  <Pill tone={translateTone(item.computed_status)}>
                    {formatFieldStatusLabel(resolveFieldStatus({
                      hasVerificationProof: item.computed_status === "confirmed_field" || item.computed_status === "likely_laid",
                      hasCriticalFinding: item.computed_status === "blocked",
                      hasTechnicalAnomaly: false,
                    }))}
                  </Pill>
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-stone-600">{item.recommended_action}</p>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onOpen(item)}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      {primaryAction}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDetail(item.cable_story_path)}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 transition hover:border-stone-300 hover:text-stone-950"
                    >
                      Scheda
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!showAll && items.length > EVIDENCE_PAGE_SIZE && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-2 w-full rounded-2xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-950"
            >
              Mostra tutti ({items.length})
            </button>
          )}
        </>
      )}
    </Section>
  );
}

type FieldItem = {
  cable_code: string;
  display_cable_code?: string | null;
  cable_story_path: string;
  perimetro: string | null;
  computed_status: string;
  evidence_count: number;
  last_event_at: string | null;
  last_actor: string | null;
  last_message: string | null;
  recommended_action: string;
  app_partenza?: string | null;
  app_arrivo?: string | null;
};

function mergeFieldItems(items: FieldItem[]): FieldItem[] {
  const merged = new Map<string, FieldItem>();
  for (const item of items) {
    if (!merged.has(item.cable_code)) merged.set(item.cable_code, item);
  }
  return Array.from(merged.values());
}

function translateTone(status: string): "red" | "amber" | "emerald" {
  if (status === "blocked") return "red";
  if (status === "no_evidence" || status === "to_verify") return "amber";
  return "emerald";
}

function asPayload(payload: CoreEvent["payload"]): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function isToday(value: string | null): boolean {
  if (!value) return false;
  return value.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function proofTone(message: TelegramLiveMessage): "red" | "amber" | "emerald" {
  if (message.classification.incoherence_reason || message.classification.ocr_status === "OCR fallito") return "red";
  if (message.classification.requires_human_validation || (message.classification.confidence ?? 1) < 0.85) return "amber";
  return "emerald";
}

function proofPillLabel(message: TelegramLiveMessage): string {
  if (message.classification.incoherence_reason) return "Incoerenza";
  if (message.classification.ocr_status) return message.classification.ocr_status;
  if (message.classification.requires_human_validation) return "Da validare";
  return "Prova collegata";
}
