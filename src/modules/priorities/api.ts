// src/modules/priorities/api.ts
import { supabase } from "../../core/supabase";
import type { CablePriority } from "../../core/db/types";

export async function fetchOpenPriorities(): Promise<CablePriority[]> {
  const { data, error } = await supabase
    .from("cable_priorities")
    .select("*")
    .eq("status", "open")
    .order("priority", { ascending: false })
    .order("opened_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CablePriority[];
}

export async function resolvePriority(id: string): Promise<void> {
  const { error } = await supabase
    .from("cable_priorities")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
