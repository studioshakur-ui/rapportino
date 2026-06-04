// src/features/core-command/hooks/useCoreEvents.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCoreEvents,
  getPendingEvents,
  updateCoreEvent,
  validateEvent,
  rejectEvent,
  promoteEvent,
} from "../api/coreEvents.api";
import type { CoreEventFilters } from "../api/coreEvents.api";
import type { UpdateCoreEvent } from "../types";

export function useCoreEvents(filters: CoreEventFilters = {}) {
  return useQuery({
    queryKey: ["core_events", filters],
    queryFn: () => listCoreEvents(filters),
    staleTime: 15_000,
  });
}

export function usePendingEvents(limit = 100) {
  return useQuery({
    queryKey: ["core_events", "pending", limit],
    queryFn: () => getPendingEvents(limit),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useUpdateCoreEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateCoreEvent }) =>
      updateCoreEvent(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["core_events"] }),
  });
}

export function useValidateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, uid }: { id: string; uid: string }) => validateEvent(id, uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["core_events"] }),
  });
}

export function useRejectEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, uid }: { id: string; uid: string }) => rejectEvent(id, uid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["core_events"] }),
  });
}

export function usePromoteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, uid }: { id: string; uid: string }) => promoteEvent(id, uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["core_events"] });
      qc.invalidateQueries({ queryKey: ["cable_events"] });
    },
  });
}
