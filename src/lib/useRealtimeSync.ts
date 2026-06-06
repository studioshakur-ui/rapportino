// src/lib/useRealtimeSync.ts
// P3.2 — Live Field Reaction Engine.
// Subscribes to Supabase Realtime INSERTs on the ingestion tables and
// invalidates the React Query caches so the UI reacts to a Telegram/WhatsApp
// message instantly — no passive 2-minute polling wait.
//
// Requires the watched tables to be members of the `supabase_realtime`
// publication (see migration *_core_command_realtime.sql). INCA stays read-only.

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

// Tables whose INSERTs mean "new field signal arrived".
const WATCHED_TABLES = [
  "whatsapp_messages",
  "core_events",
  "cable_events",
  "daily_list_item_events",
  "incoming_messages",
] as const;

// React Query keys to refresh. Partial-match (React Query invalidates any query
// whose key starts with these), so ["daily_list_items_vm"] also refreshes
// ["daily_list_items_vm", importId], etc.
const INVALIDATE_KEYS: readonly (readonly unknown[])[] = [
  ["daily_list_imports"],
  ["daily_list_items_vm"],
  ["cable_story"],
  ["equipment_story"],
  ["cable_events"],
  ["cable_timeline"],
  ["core_events"],
  ["cable_priorities"],
  ["agent_findings"],
];

export function useRealtimeSync(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let scheduled = false;

    // Coalesce bursts (a single message produces several INSERTs across tables)
    // into one invalidation pass per animation frame / tick.
    const refresh = (): void => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        for (const queryKey of INVALIDATE_KEYS) {
          void queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
        }
      });
    };

    const channel = supabase.channel("core-command-live");
    for (const table of WATCHED_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table },
        refresh
      );
    }
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
