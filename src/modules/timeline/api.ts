// src/modules/timeline/api.ts
import { supabase } from "../../core/supabase";
import type { CableEvent } from "../../core/db/types";

export type TimelineAxis = "cavo" | "operatore" | "giornata" | "zona";

export async function fetchTimelineEvents(limit = 300): Promise<CableEvent[]> {
  const { data, error } = await supabase
    .from("cable_events")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CableEvent[];
}

export type TimelineGroup = {
  key: string;
  events: CableEvent[];
};

export function groupByAxis(events: CableEvent[], axis: TimelineAxis): TimelineGroup[] {
  const map = new Map<string, CableEvent[]>();
  for (const e of events) {
    let key: string;
    switch (axis) {
      case "cavo":
        key = e.cavo_code ?? "—";
        break;
      case "operatore":
        key = e.operator_id ?? "—";
        break;
      case "zona":
        key = e.zone ?? "—";
        break;
      case "giornata":
      default:
        key = e.occurred_at.slice(0, 10);
        break;
    }
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return [...map.entries()]
    .map(([key, evs]) => ({ key, events: evs }))
    .sort((a, b) => b.events.length - a.events.length);
}
