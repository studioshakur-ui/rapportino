import type { CableStoryTimelineItem } from "../cableStory.types";
import { EmptyState, Pill, Section } from "../../../components/command-ui";

function toneForEvent(eventType: string): "neutral" | "emerald" | "amber" | "red" | "sky" {
  switch (eventType) {
    case "MATCHED_INCA":
    case "CONFIRMED":
      return "sky";
    case "POSED_REPORTED":
    case "RESOLVED":
      return "emerald";
    case "SHORT_REPORTED":
      return "amber";
    case "MISSING_REPORTED":
    case "BLOCKED_REPORTED":
      return "red";
    default:
      return "neutral";
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CableStoryTimeline({
  items,
  focusId,
}: {
  items: CableStoryTimelineItem[];
  focusId: string | null;
}): JSX.Element {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Aucun signal terrain"
        description="CORE COMMAND n'a pas encore d'histoire à raconter pour ce câble."
        icon="◌"
      />
    );
  }

  return (
    <Section title="Timeline câble" eyebrow="Événements" count={items.length} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
      <ol className="space-y-3">
        {items.map((item) => {
          const isFocused = focusId === item.id || focusId === item.core_event_id;
          return (
            <li
              key={item.id}
              className={`rounded-3xl border p-4 transition ${
                isFocused ? "border-sky-500/40 bg-sky-500/10" : "border-zinc-800 bg-zinc-900/60"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={toneForEvent(item.event_type)}>{item.event_type.replace(/_/g, " ")}</Pill>
                    <Pill tone="neutral">{item.source_type}</Pill>
                    {item.priority_level ? <Pill tone="amber">{item.priority_level}</Pill> : null}
                    {item.is_contradictory ? <Pill tone="red">Incohérence</Pill> : null}
                  </div>

                  <div>
                    <div className="text-base font-semibold text-zinc-50">{item.summary}</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      {item.actor_label || "Auteur non identifié"} · conf. {item.confidence}%
                    </div>
                  </div>

                  {item.detail ? <p className="max-w-3xl text-sm leading-6 text-zinc-300">{item.detail}</p> : null}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    {item.status ? <span>Statut: {item.status}</span> : null}
                    {item.message_id ? (
                      <a href={`#source-${item.message_id}`} className="font-medium text-sky-300 hover:text-sky-200">
                        Voir la source
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0 text-sm text-zinc-500">{formatDate(item.event_at)}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
