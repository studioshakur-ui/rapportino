import type { CableStoryTimelineItem } from "../cableStory.types";

function toneForEvent(eventType: string): string {
  switch (eventType) {
    case "MATCHED_INCA":
      return "bg-sky-500/15 text-sky-200 border-sky-500/30";
    case "POSED_REPORTED":
    case "RESOLVED":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
    case "SHORT_REPORTED":
      return "bg-orange-500/15 text-orange-200 border-orange-500/30";
    case "MISSING_REPORTED":
    case "BLOCKED_REPORTED":
      return "bg-rose-500/15 text-rose-200 border-rose-500/30";
    case "CONFIRMED":
      return "bg-blue-500/15 text-blue-200 border-blue-500/30";
    default:
      return "bg-zinc-500/15 text-zinc-200 border-zinc-500/30";
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
      <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-6 text-sm text-zinc-400">
        Aucun signal terrain. CORE COMMAND n&apos;a pas encore d&apos;histoire à raconter pour ce câble.
      </div>
    );
  }

  return (
    <section className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Timeline câble</div>
      <ol className="relative mt-4 border-l border-zinc-800 pl-5">
        {items.map((item) => {
          const isFocused = focusId === item.id || focusId === item.core_event_id;
          return (
            <li
              key={item.id}
              className={`relative py-4 ${isFocused ? "rounded-2xl bg-sky-500/5 px-3 -ml-3" : ""}`}
            >
              <span
                className={`absolute -left-[22px] top-7 h-3.5 w-3.5 rounded-full border border-zinc-900 ${isFocused ? "bg-sky-400" : "bg-zinc-500"}`}
              />

              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneForEvent(item.event_type)}`}>
                      {item.event_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-zinc-500">{item.source_type}</span>
                    {item.priority_level ? (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                        {item.priority_level}
                      </span>
                    ) : null}
                    {item.is_contradictory ? (
                      <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-200">
                        Incohérence
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <div className="text-base font-semibold text-zinc-50">{item.summary}</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      {item.actor_label || "Auteur non identifié"} · conf. {item.confidence}%
                    </div>
                  </div>

                  {item.detail ? (
                    <p className="max-w-3xl text-sm leading-6 text-zinc-300">{item.detail}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    {item.status ? <span>Statut: {item.status}</span> : null}
                    {item.message_id ? (
                      <a href={`#source-${item.message_id}`} className="text-sky-300 hover:text-sky-200">
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
    </section>
  );
}
