// src/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient centralisé pour CORE.
 * - retry faible par défaut (évite de spam Supabase)
 * - cacheTime raisonnable
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000, // 30s
    },
  },
});
