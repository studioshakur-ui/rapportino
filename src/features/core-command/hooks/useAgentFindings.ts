// src/features/core-command/hooks/useAgentFindings.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listOpenFindings, ignoreFinding } from "../api/agentFindings.api";
import type { EventSeverity } from "../types";

export function useAgentFindings(severity?: EventSeverity, limit = 100) {
  return useQuery({
    queryKey: ["agent_findings", "open", severity, limit],
    queryFn: () => listOpenFindings(severity, limit),
    staleTime: 20_000,
    refetchInterval: 60_000,
  });
}

export function useIgnoreFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ignoreFinding(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent_findings"] }),
  });
}
