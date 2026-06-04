// src/features/core-command/api/cablePriorities.api.ts
import { supabase } from "../../../lib/supabaseClient";
import type { CablePriority, InsertCablePriority, Priority } from "../types";

export async function listOpenPriorities(limit = 100): Promise<CablePriority[]> {
  const { data, error } = await supabase
    .from("cable_priorities")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function listPrioritiesForCable(cableCode: string): Promise<CablePriority[]> {
  const { data, error } = await supabase
    .from("cable_priorities")
    .select("*")
    .eq("cable_code", cableCode)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertCablePriority(
  payload: InsertCablePriority
): Promise<CablePriority> {
  const { data, error } = await supabase
    .from("cable_priorities")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function closePriority(id: string): Promise<void> {
  const { error } = await supabase
    .from("cable_priorities")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function upsertPriorityForCable(
  cableCode: string,
  priority: Priority,
  reason: string,
  sourceEventId?: string
): Promise<CablePriority> {
  return insertCablePriority({
    cable_code: cableCode,
    priority,
    reason,
    status: "open",
    source_event_id: sourceEventId ?? null,
  });
}
