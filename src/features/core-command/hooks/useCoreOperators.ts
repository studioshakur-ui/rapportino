// src/features/core-command/hooks/useCoreOperators.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCoreOperators, upsertCoreOperator } from "../api/coreOperators.api";
import type { InsertCoreOperator } from "../types";

export function useCoreOperators(onlyActive = true) {
  return useQuery({
    queryKey: ["core_operators", onlyActive],
    queryFn: () => listCoreOperators(onlyActive),
    staleTime: 60_000,
  });
}

export function useUpsertCoreOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (op: InsertCoreOperator) => upsertCoreOperator(op),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["core_operators"] }),
  });
}
