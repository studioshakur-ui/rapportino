// src/features/core-command/hooks/useWhatsAppImports.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listWhatsAppImports } from "../api/whatsappImports.api";

export function useWhatsAppImports(limit = 50) {
  return useQuery({
    queryKey: ["whatsapp_imports", limit],
    queryFn: () => listWhatsAppImports(limit),
    staleTime: 30_000,
  });
}

export function useInvalidateWhatsAppImports() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["whatsapp_imports"] });
}
