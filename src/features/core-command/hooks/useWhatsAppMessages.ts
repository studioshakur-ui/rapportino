// src/features/core-command/hooks/useWhatsAppMessages.ts
import { useQuery } from "@tanstack/react-query";
import { listWhatsAppMessages, searchWhatsAppMessages } from "../api/whatsappMessages.api";

export function useWhatsAppMessages(importId: string | null | undefined, limit = 500) {
  return useQuery({
    queryKey: ["whatsapp_messages", importId, limit],
    queryFn: () => listWhatsAppMessages(importId!, limit),
    enabled: !!importId,
    staleTime: 60_000,
  });
}

export function useSearchWhatsAppMessages(query: string, importId?: string, limit = 100) {
  return useQuery({
    queryKey: ["whatsapp_messages", "search", query, importId, limit],
    queryFn: () => searchWhatsAppMessages(query, importId, limit),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
