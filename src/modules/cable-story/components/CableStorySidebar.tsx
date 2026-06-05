import { buildMessageExcerpt } from "../cableStory.logic";
import type { CableStoryFinding, CableStoryPriority, CableStorySource } from "../cableStory.types";

function formatDate(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function priorityTone(priority: string): string {
  switch (priority) {
    case "critical":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    case "high":
      return "border-orange-500/30 bg-orange-500/10 text-orange-200";
    case "medium":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-200";
  }
}

function severityTone(severity: string): string {
  switch (severity) {
    case "block":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    case "warn":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  }
}

export default function CableStorySidebar({
  priorities,
  findings,
  sources,
}: {
  priorities: CableStoryPriority[];
  findings: CableStoryFinding[];
  sources: CableStorySource[];
}): JSX.Element {
  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Priorités ouvertes</div>
        <div className="mt-3 space-y-3">
          {priorities.filter((priority) => priority.status === "open").length === 0 ? (
            <div className="text-sm text-zinc-400">Aucune priorité ouverte.</div>
          ) : (
            priorities
              .filter((priority) => priority.status === "open")
              .map((priority) => (
                <article key={priority.id} className={`rounded-2xl border p-3 ${priorityTone(priority.priority)}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold uppercase">{priority.priority}</div>
                    <div className="text-xs opacity-70">{formatDate(priority.created_at)}</div>
                  </div>
                  <div className="mt-2 text-sm">{priority.reason || "Sans raison détaillée"}</div>
                </article>
              ))
          )}
        </div>
      </section>

      <section className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Findings agents</div>
        <div className="mt-3 space-y-3">
          {findings.length === 0 ? (
            <div className="text-sm text-zinc-400">Aucun finding.</div>
          ) : (
            findings.map((finding) => (
              <article key={finding.id} className={`rounded-2xl border p-3 ${severityTone(finding.severity)}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{finding.agent_name}</div>
                  <div className="text-xs opacity-70">{formatDate(finding.created_at)}</div>
                </div>
                <div className="mt-1 text-xs uppercase opacity-70">{finding.finding_type}</div>
                <div className="mt-2 text-sm">{finding.message}</div>
                {finding.recommendation ? (
                  <div className="mt-2 text-xs opacity-80">→ {finding.recommendation}</div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Sources terrain</div>
        <div className="mt-3 space-y-3">
          {sources.length === 0 ? (
            <div className="text-sm text-zinc-400">Aucune preuve message liée.</div>
          ) : (
            sources.map((source) => (
              <article key={source.id} id={`source-${source.id}`} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span>{source.author || "Auteur inconnu"}</span>
                  <span>{formatDate(source.occurred_at)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-200">{buildMessageExcerpt(source)}</p>
                {source.media_type || source.media_filename ? (
                  <div className="mt-2 text-xs text-zinc-500">
                    {source.media_type || "media"} {source.media_filename ? `· ${source.media_filename}` : ""}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
