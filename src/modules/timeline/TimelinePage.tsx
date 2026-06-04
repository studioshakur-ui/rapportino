// src/modules/timeline/TimelinePage.tsx
// Module 5 — Timeline : par câble, opérateur, journée, zone.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Card, Empty, Badge, useSurface } from "../_ui/kit";
import { fetchTimelineEvents, groupByAxis, type TimelineAxis } from "./api";

const AXES: Array<{ id: TimelineAxis; label: string }> = [
  { id: "giornata", label: "Journée" },
  { id: "cavo", label: "Câble" },
  { id: "operatore", label: "Opérateur" },
  { id: "zona", label: "Zone" },
];

const TONE: Record<string, "emerald" | "rose" | "amber" | "sky"> = {
  posa: "emerald",
  blocco: "rose",
  anomalia: "amber",
  ripresa: "sky",
};

export default function TimelinePage(): JSX.Element {
  const { subtle, btn } = useSurface();
  const [axis, setAxis] = useState<TimelineAxis>("giornata");
  const events = useQuery({ queryKey: ["cable_events", "timeline"], queryFn: () => fetchTimelineEvents() });
  const groups = useMemo(() => groupByAxis(events.data ?? [], axis), [events.data, axis]);

  return (
    <div>
      <PageHeader title="Timeline" subtitle="Historique des mouvements câbles" />

      <div className="mb-4 flex flex-wrap gap-2">
        {AXES.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAxis(a.id)}
            className={`${btn} ${axis === a.id ? "ring-2 ring-sky-500" : ""}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {events.isLoading && <Empty>Chargement…</Empty>}
      {!events.isLoading && groups.length === 0 && <Empty>Aucun événement.</Empty>}

      <div className="space-y-4">
        {groups.map((g) => (
          <Card key={g.key} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{g.key}</h3>
              <Badge tone="sky">{g.events.length}</Badge>
            </div>
            <ol className="relative space-y-3 border-l border-slate-700/40 pl-4">
              {g.events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-sky-500" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={TONE[e.event_type] ?? "neutral"}>{e.event_type}</Badge>
                    <span className="text-sm font-medium">{e.cavo_code ?? "—"}</span>
                    {e.meters != null && <span className={`text-xs ${subtle}`}>{e.meters} m</span>}
                    {e.zone && <span className={`text-xs ${subtle}`}>· {e.zone}</span>}
                    <span className={`ml-auto text-xs ${subtle}`}>
                      {new Date(e.occurred_at).toLocaleString("fr-FR")}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
    </div>
  );
}
