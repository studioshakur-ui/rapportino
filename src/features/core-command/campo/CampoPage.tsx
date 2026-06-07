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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Import recenti" value={field.imports.length} tone="neutral" />
            <StatCard label="Priorità" value={field.priority_items.length} tone={field.priority_items.length > 0 ? "red" : "neutral"} />
            <StatCard label="Prove mancanti" value={field.missing_evidence_items.length} tone={field.missing_evidence_items.length > 0 ? "amber" : "neutral"} />
            <StatCard label="Da verificare" value={field.partial_items.length} tone={field.partial_items.length > 0 ? "amber" : "neutral"} />
          </div>

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

          <section className="grid gap-4 lg:grid-cols-2">
            <EvidenceList
              title="Priorità campo"
              count={field.priority_items.length}
              items={field.priority_items}
              onOpen={(code) => navigate(code)}
            />
            <EvidenceList
              title="Prove mancanti"
              count={field.missing_evidence_items.length}
              items={field.missing_evidence_items}
              onOpen={(code) => navigate(code)}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <EvidenceList
              title="Da verificare"
              count={field.partial_items.length}
              items={field.partial_items}
              onOpen={(code) => navigate(code)}
            />
            <EvidenceList
              title="Bloccati"
              count={field.blocked_items.length}
              items={field.blocked_items}
              onOpen={(code) => navigate(code)}
            />
          </section>

          <Section title="Import recenti" eyebrow="Storico" count={field.imports.length}>
            {field.imports.length === 0 ? (
              <EmptyState
                title="Nessun import recente"
                description="Carica una lista per iniziare."
                icon="📋"
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {field.imports.map((item) => (
                  <article key={item.id} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-stone-950">{item.file_name}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {item.list_date ?? "data sconosciuta"} · {item.rows_count} cavi · {formatDate(item.list_date)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </Section>
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
              <p className="mt-3 text-xs leading-5 text-stone-600">{item.recommended_action}</p>
            </button>
          ))}
        </div>
      )}
    </Section>
  );
}

function translateTone(status: string): "red" | "amber" | "emerald" {
  if (status === "blocked") return "red";
  if (status === "no_evidence" || status === "to_verify") return "amber";
  return "emerald";
}
