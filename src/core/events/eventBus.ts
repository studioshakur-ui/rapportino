import { supabase } from "../../lib/supabaseClient";
import type { CoreEvent, InsertCoreEvent } from "../../features/core-command/types";

// CORE COMMAND event bus: every cockpit state mutation is persisted as an event.
// INCA is read-only here: this module never writes to inca_cavi.
export async function publishCoreEvent(payload: InsertCoreEvent): Promise<CoreEvent> {
  const { data, error } = await supabase
    .from("core_events")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}
