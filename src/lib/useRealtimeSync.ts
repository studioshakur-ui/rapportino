import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

const WATCHED_TABLES = [
  "whatsapp_messages",
  "core_events",
  "cable_events",
  "daily_list_item_events",
  "incoming_messages",
  "inca_cavi",
  "navemaster_runs",
  "navemaster_alerts",
] as const;

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
  ["telegram_live_feed"],
  ["core_engine_snapshot"],
  ["giro_oggi"],
  ["navemaster_view"],
  ["navemaster_perimetro_board"],
  ["navemaster_perimetro_cavi"],
  ["navemaster_active_import"],
  ["navemaster_archives"],
  ["navemaster_rows"],
];

export function useRealtimeSync(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let scheduled = false;

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
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table }, refresh);
    }
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
