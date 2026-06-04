// src/features/core-command/api/coreOperators.api.ts
import { supabase } from "../../../lib/supabaseClient";
import type { CoreOperator, InsertCoreOperator } from "../types";

export async function listCoreOperators(onlyActive = true): Promise<CoreOperator[]> {
  let q = supabase.from("core_operators").select("*").order("display_name");
  if (onlyActive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getCoreOperator(id: string): Promise<CoreOperator | null> {
  const { data, error } = await supabase
    .from("core_operators")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertCoreOperator(op: InsertCoreOperator): Promise<CoreOperator> {
  const { data, error } = await supabase
    .from("core_operators")
    .upsert(op, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function findOperatorByWhatsAppName(name: string): Promise<CoreOperator | null> {
  const norm = name.trim().toLowerCase();
  const { data, error } = await supabase
    .from("core_operators")
    .select("*")
    .or(`whatsapp_name.ilike.${norm},display_name.ilike.${norm}`)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
