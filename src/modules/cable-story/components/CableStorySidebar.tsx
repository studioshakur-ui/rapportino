import { buildMessageExcerpt } from "../cableStory.logic";
import type { CableStoryFinding, CableStoryPriority, CableStorySource } from "../cableStory.types";
import { Pill, Section } from "../../../components/command-ui";

function formatDate(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function priorityTone(priority: string): "neutral" | "amber" | "red" {
  if (priority === "critical" || priority === "high") return "red";
  if (priority === "medium") return "amber";
  return "neutral";
}

function severityTone(severity: string): "neutral" | "amber" | "red" | "sky" {
  if (severity === "block") return "red";
  if (severity === "warn") return "amber";
  return "sky";
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
  const openPriorities = priorities.filter((priority) => priority.status === "open");

  return (
    <div className="space-y-4">
      <Section title="Priorités ouvertes" eyebrow="Action" count={openPriorities.length} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="space-y-3">
          {openPriorities.length === 0 ? (
            <div className="text-sm text-zinc-400">Aucune priorité ouverte.</div>
          ) : (
            openPriorities.map((priority) => (
              <article key={priority.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <Pill tone={priorityTone(priority.priority)}>{priority.priority}</Pill>
                  <div className="text-xs text-zinc-500">{formatDate(priority.created_at)}</div>
                </div>
                <div className="mt-2 text-sm leading-6 text-zinc-200">{priority.reason || "Sans raison détaillée"}</div>
              </article>
            ))
          )}
        </div>
      </Section>

      <Section title="Findings agents" eyebrow="Contrôles" count={findings.length} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="space-y-3">
          {findings.length === 0 ? (
            <div className="text-sm text-zinc-400">Aucun finding.</div>
          ) : (
            findings.map((finding) => (
              <article key={finding.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-100">{finding.agent_name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-500">{finding.finding_type}</div>
                  </div>
                  <Pill tone={severityTone(finding.severity)}>{finding.severity}</Pill>
                </div>
                <div className="mt-2 text-sm leading-6 text-zinc-200">{finding.message}</div>
                {finding.recommendation ? <div className="mt-2 text-xs leading-5 text-zinc-400">→ {finding.recommendation}</div> : null}
                <div className="mt-2 text-xs text-zinc-500">{formatDate(finding.created_at)}</div>
              </article>
            ))
          )}
        </div>
      </Section>

      <Section title="Sources terrain" eyebrow="Messages" count={sources.length} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="space-y-3">
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
      </Section>
    </div>
  );
}
