import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppBar, EmptyState, Pill, Screen, Section, StatCard } from "../../../components/command-ui";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { loadCoreEngineSnapshot } from "../../../domain/core-engine";
import { formatFieldStatusLabel, resolveFieldStatus } from "../../../domain/core-engine/fieldVerification";

function formatDate(value: string | null): string {
  if (!value) return "data sconosciuta";
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CampoPage(): JSX.Element {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["core_engine_snapshot"],
    queryFn: loadCoreEngineSnapshot,
    staleTime: 30_000,
  });

  const field = data?.field ?? null;
  const summary = field?.summary ?? null;
  const actionItems = field ? mergeFieldItems([
    ...field.partial_items,
    ...field.missing_evidence_items,
    ...field.priority_items,
  ].filter((item) => item.computed_status !== "confirmed_field" && item.computed_status !== "likely_laid")) : [];
  const verifiedItems = field ? mergeFieldItems(field.priority_items.filter((item) => item.computed_status === "confirmed_field" || item.computed_status === "likely_laid")) : [];

  return (
    <Screen className="max-w-6xl space-y-6">
      <AppBar
        title="Campo"
        subtitle="Prove, import e messaggi che hanno cambiato la situazione sul terreno."
      />

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
            onOpen={(code) => navigate(code)}
            primaryAction="Verifica sul campo"
          />

          <section className="grid gap-4 lg:grid-cols-2">
            <EvidenceList
              title="Bloccanti reali"
              count={field.blocked_items.length}
              items={field.blocked_items}
              onOpen={(code) => navigate(code)}
              primaryAction="Apri blocco"
            />
            <EvidenceList
              title="Verificati oggi"
              count={verifiedItems.length}
              items={verifiedItems}
              onOpen={(code) => navigate(code)}
              primaryAction="Apri cavo"
            />
          </section>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Da fare" value={actionItems.length} tone={actionItems.length > 0 ? "amber" : "emerald"} />
            <StatCard label="Bloccanti reali" value={field.blocked_items.length} tone={field.blocked_items.length > 0 ? "red" : "neutral"} />
            <StatCard label="Verificati oggi" value={verifiedItems.length} tone="emerald" />
            <StatCard label="Import recenti" value={field.imports.length} tone="neutral" />
          </div>
        </>
      ) : null}
    </Screen>
  );
}

function EvidenceList({
  title,
  count,
  items,
  onOpen,
  primaryAction,
}: {
  title: string;
  count: number;
  items: Array<{
    cable_code: string;
    cable_story_path: string;
    perimetro: string | null;
    computed_status: string;
    evidence_count: number;
    last_event_at: string | null;
    last_actor: string | null;
    last_message: string | null;
    recommended_action: string;
  }>;
  onOpen: (route: string) => void;
  primaryAction: string;
}): JSX.Element {
  return (
    <Section title={title} eyebrow="Campo" count={count}>
      {items.length === 0 ? (
        <EmptyState
          title="Nessun dato disponibile"
          description="Questa sezione si riempirà quando arriveranno prove o blocchi."
          icon="∅"
        />
      ) : (
        <div className="space-y-3">
          {items.slice(0, 10).map((item) => (
            <button
              key={item.cable_code}
              onClick={() => onOpen(item.cable_story_path)}
              className="w-full rounded-[24px] border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300"
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
                <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
                  {primaryAction}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </Section>
  );
}

type FieldItem = Parameters<typeof EvidenceList>[0]["items"][number];

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
