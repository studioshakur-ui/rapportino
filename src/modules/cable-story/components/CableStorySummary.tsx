import { Link } from "react-router-dom";
import type { CableStoryCandidate, CableStoryViewModel } from "../cableStory.types";
import { AppBar, EmptyState, Pill, Section, StatCard } from "../../../components/command-ui";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function candidateToSearch(candidate: CableStoryCandidate, baseSource: string | null): string {
  const params = new URLSearchParams();
  params.set("match", candidate.id);
  if (baseSource) params.set("source", baseSource);
  return `?${params.toString()}`;
}

function statusTone(status: string): "neutral" | "emerald" | "amber" | "red" | "sky" {
  if (status === "Pose confirmée") return "emerald";
  if (status === "Bloqué" || status === "Court") return "red";
  if (status === "À vérifier") return "amber";
  if (status === "Mentionné") return "sky";
  return "neutral";
}

function confidenceTone(band: string): "emerald" | "amber" | "red" {
  if (band === "High") return "emerald";
  if (band === "Medium") return "amber";
  return "red";
}

export function CableStoryAmbiguousState({
  normalizedCode,
  candidates,
  source,
}: {
  normalizedCode: string;
  candidates: CableStoryCandidate[];
  source: string | null;
}): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
        <div className="text-xs uppercase tracking-[0.22em] text-amber-300/80">Désambiguïsation</div>
        <h2 className="mt-2 text-2xl font-semibold">Plusieurs correspondances pour {formatCableDisplay(normalizedCode)}</h2>
        <p className="mt-2 text-sm text-amber-50/80">
          CORE COMMAND a trouvé plusieurs câbles proches dans INCA. Choisis la bonne fiche avant de raconter l&apos;histoire.
        </p>
      </div>

      <div className="grid gap-3">
        {candidates.map((candidate) => (
          <Link
            key={candidate.id}
            to={candidateToSearch(candidate, source)}
            className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 transition hover:border-sky-500/40 hover:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-lg font-semibold text-zinc-50">{formatCableDisplay(candidate.display_code)}</div>
                <div className="mt-1 text-sm text-zinc-400">
                  Commessa {candidate.commessa || "—"} · Impianto {candidate.impianto || "—"}
                </div>
              </div>
              <div className="text-right text-xs text-zinc-500">
                <div>{candidate.zona_da || "—"}</div>
                <div>{candidate.zona_a || "—"}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CableStoryHeader({
  model,
  source,
}: {
  model: CableStoryViewModel;
  source: string | null;
}): JSX.Element {
  const topPriority = model.priorities.find((priority) => priority.status === "open") ?? null;

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.30)]">
      <AppBar
        title={formatCableDisplay(model.cable.normalized_code)}
        subtitle={`Entrée ${formatCableDisplay(model.cable.code)} · Canon ${formatCableDisplay(model.cable.normalized_code)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Pill tone={statusTone(model.memory_summary.computed_status)}>{model.memory_summary.computed_status}</Pill>
            <Pill tone={confidenceTone(model.memory_summary.confidence_band)}>{model.memory_summary.global_confidence}% confiance</Pill>
            {model.memory_summary.has_contradictions ? <Pill tone="red">Incohérence</Pill> : null}
          </div>
        }
      />
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
        <span>{source ? `Source ${source}` : "CORE Memory"}</span>
        <span>·</span>
        <span>Priorité {topPriority?.priority ?? "—"}</span>
        {topPriority?.reason ? <span className="text-zinc-400">· {topPriority.reason}</span> : null}
      </div>
    </section>
  );
}

export function CableStoryCards({ model }: { model: CableStoryViewModel }): JSX.Element {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
      <Section title="INCA" eyebrow="Lecture seule" className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
        {model.inca ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="ID" value={model.inca.id} mono />
            <Info label="Codice" value={model.inca.codice ? formatCableDisplay(model.inca.codice) : null} mono />
            <Info label="Situazione" value={model.inca.situazione} />
            <Info label="Metri teo" value={model.inca.metri_teo ?? "—"} />
            <Info label="Impianto" value={model.inca.impianto} />
            <Info label="Commessa" value={model.inca.commessa} />
            <Info label="Zona DA" value={model.inca.zona_da} />
            <Info label="Zona A" value={model.inca.zona_a} />
          </div>
        ) : (
          <EmptyState title="Non trouvé dans INCA" description="CORE Memory reste disponible pour ce câble." icon="!" />
        )}
      </Section>

      <Section title="Résumé mémoire" eyebrow="Signaux CORE" className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="grid grid-cols-2 gap-3">
          <Info label="Premier signal" value={formatDate(model.memory_summary.first_signal_at)} />
          <Info label="Dernier signal" value={formatDate(model.memory_summary.last_signal_at)} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Messages" value={model.memory_summary.source_messages_count} />
          <StatCard label="Événements" value={model.memory_summary.events_count} />
          <StatCard label="Findings" value={model.memory_summary.findings_count} tone={model.memory_summary.findings_count > 0 ? "amber" : "neutral"} />
          <StatCard label="Priorités" value={model.memory_summary.open_priorities_count} tone={model.memory_summary.open_priorities_count > 0 ? "red" : "neutral"} />
        </div>
      </Section>

      <Section title="Histoire courte" eyebrow="Synthèse" className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
        {model.short_story.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucun résumé disponible.</p>
        ) : (
          <ol className="space-y-2 text-sm text-zinc-200">
            {model.short_story.map((line) => (
              <li key={line} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 leading-6">
                {line}
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string | number | null; mono?: boolean }): JSX.Element {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className={`mt-1 break-words text-sm text-zinc-100 ${mono ? "font-mono" : ""}`}>{value ?? "—"}</div>
    </div>
  );
}
