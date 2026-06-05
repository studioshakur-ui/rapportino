import { Link } from "react-router-dom";
import { formatConfidenceTone, formatStatusTone } from "../cableStory.logic";
import type { CableStoryCandidate, CableStoryViewModel } from "../cableStory.types";

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
        <h2 className="mt-2 text-2xl font-semibold">Plusieurs correspondances pour {normalizedCode}</h2>
        <p className="mt-2 text-sm text-amber-50/80">
          CORE COMMAND a trouvé plusieurs câbles proches dans INCA. Choisis la bonne fiche avant de raconter l&apos;histoire.
        </p>
      </div>

      <div className="grid gap-3">
        {candidates.map((candidate) => (
          <Link
            key={candidate.id}
            to={candidateToSearch(candidate, source)}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 transition hover:border-sky-500/40 hover:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-lg font-semibold text-zinc-50">{candidate.display_code}</div>
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
    <section className="rounded-[28px] border border-zinc-800 bg-zinc-950/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.30)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
            {source ? `Cable Story · ${source}` : "Cable Story"}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-3xl font-semibold text-zinc-50">{model.cable.normalized_code}</h1>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${formatStatusTone(model.memory_summary.computed_status)}`}>
              {model.memory_summary.computed_status}
            </span>
            {model.memory_summary.has_contradictions ? (
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200">
                Incohérence
              </span>
            ) : null}
          </div>
          <div className="text-sm text-zinc-400">
            Entrée: {model.cable.code} · Canon: {model.cable.normalized_code}
          </div>
        </div>

        <div className="grid min-w-[220px] grid-cols-2 gap-3 lg:max-w-sm">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Confiance</div>
            <div className={`mt-1 text-2xl font-semibold ${formatConfidenceTone(model.memory_summary.confidence_band)}`}>
              {model.memory_summary.global_confidence}%
            </div>
            <div className="text-xs text-zinc-500">{model.memory_summary.confidence_band}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Priorité</div>
            <div className="mt-1 text-lg font-semibold text-zinc-100">{topPriority?.priority ?? "—"}</div>
            <div className="text-xs text-zinc-500">{topPriority?.reason ?? "Aucune priorité ouverte"}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CableStoryCards({ model }: { model: CableStoryViewModel }): JSX.Element {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
      <section className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">INCA</div>
        {model.inca ? (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-zinc-500">ID</div>
              <div className="font-mono text-zinc-100">{model.inca.id}</div>
            </div>
            <div>
              <div className="text-zinc-500">Codice</div>
              <div className="font-mono text-zinc-100">{model.inca.codice}</div>
            </div>
            <div>
              <div className="text-zinc-500">Situazione</div>
              <div className="text-zinc-100">{model.inca.situazione || "—"}</div>
            </div>
            <div>
              <div className="text-zinc-500">Metri teo</div>
              <div className="text-zinc-100">{model.inca.metri_teo ?? "—"}</div>
            </div>
            <div>
              <div className="text-zinc-500">Impianto</div>
              <div className="text-zinc-100">{model.inca.impianto || "—"}</div>
            </div>
            <div>
              <div className="text-zinc-500">Commessa</div>
              <div className="text-zinc-100">{model.inca.commessa || "—"}</div>
            </div>
            <div>
              <div className="text-zinc-500">Zona DA</div>
              <div className="text-zinc-100">{model.inca.zona_da || "—"}</div>
            </div>
            <div>
              <div className="text-zinc-500">Zona A</div>
              <div className="text-zinc-100">{model.inca.zona_a || "—"}</div>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Non trouvé dans INCA. CORE Memory reste disponible.
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Résumé mémoire</div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-zinc-500">Premier signal</div>
            <div className="text-zinc-100">{formatDate(model.memory_summary.first_signal_at)}</div>
          </div>
          <div>
            <div className="text-zinc-500">Dernier signal</div>
            <div className="text-zinc-100">{formatDate(model.memory_summary.last_signal_at)}</div>
          </div>
          <div>
            <div className="text-zinc-500">Messages source</div>
            <div className="text-zinc-100">{model.memory_summary.source_messages_count}</div>
          </div>
          <div>
            <div className="text-zinc-500">Événements</div>
            <div className="text-zinc-100">{model.memory_summary.events_count}</div>
          </div>
          <div>
            <div className="text-zinc-500">Findings</div>
            <div className="text-zinc-100">{model.memory_summary.findings_count}</div>
          </div>
          <div>
            <div className="text-zinc-500">Priorités ouvertes</div>
            <div className="text-zinc-100">{model.memory_summary.open_priorities_count}</div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Histoire courte</div>
        <ol className="mt-3 space-y-2 text-sm text-zinc-200">
          {model.short_story.map((line) => (
            <li key={line} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
              {line}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
