// src/features/core-command/hooks/useCableEvents.ts
import { useQuery } from "@tanstack/react-query";
import { listCableEvents, getCableTimeline } from "../api/cableEvents.api";
import type { CableEventFilters } from "../api/cableEvents.api";

export function useCableEvents(filters: CableEventFilters = {}) {
  return useQuery({
    queryKey: ["cable_events", filters],
    queryFn: () => listCableEvents(filters),
    staleTime: 15_000,
  });
}

export function useCableTimeline(cableCode: string | null | undefined, limit = 100) {
  return useQuery({
    queryKey: ["cable_timeline", cableCode, limit],
    queryFn: () => getCableTimeline(cableCode!, limit),
    enabled: !!cableCode,
    staleTime: 15_000,
  });
}
