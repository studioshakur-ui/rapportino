// src/core/events/useEvents.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listEvents,
  validateEvent,
  rejectEvent,
  createEvent,
  countPending,
  type DraftCoreEvent,
} from "./eventBus";
import type { EventSource, EventStatus } from "../db/types";

export function useEvents(opts?: { status?: EventStatus; source?: EventSource; limit?: number }) {
  return useQuery({
    queryKey: ["core_events", opts?.status ?? "all", opts?.source ?? "all", opts?.limit ?? 100],
    queryFn: () => listEvents(opts),
  });
}

export function usePendingCount() {
  return useQuery({ queryKey: ["core_events", "pending_count"], queryFn: countPending });
}

export function useEventMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["core_events"] });
    void qc.invalidateQueries({ queryKey: ["cable_events"] });
    void qc.invalidateQueries({ queryKey: ["cable_priorities"] });
    void qc.invalidateQueries({ queryKey: ["production_kpi"] });
  };

  const validate = useMutation({
    mutationFn: (id: string) => validateEvent(id),
    onSuccess: invalidate,
  });
  const reject = useMutation({ mutationFn: (id: string) => rejectEvent(id), onSuccess: invalidate });
  const create = useMutation({
    mutationFn: (draft: DraftCoreEvent) => createEvent(draft),
    onSuccess: invalidate,
  });

  return { validate, reject, create };
}
