// src/features/core-command/api/coreEvents.api.ts
// CORE Memory — vérité opérationnelle.
// Aucune écriture dans inca_cavi depuis ce module.
import { supabase } from "../../../lib/supabaseClient";
import type { CoreEvent, InsertCoreEvent, UpdateCoreEvent, ValidationStatus } from "../types";

export interface CoreEventFilters {
  validation_status?: ValidationStatus;
  commessa?: string;
  cable_code?: string;
  operator_id?: string;
  date_from?: string;
  date_to?: string;
  source?: string;
  limit?: number;
}

export async function listCoreEvents(filters: CoreEventFilters = {}): Promise<CoreEvent[]> {
  const { validation_status, commessa, cable_code, operator_id, date_from, date_to, source, limit = 200 } = filters;

  let q = supabase
    .from("core_events")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (validation_status) q = q.eq("validation_status", validation_status);
  if (commessa)          q = q.eq("commessa", commessa);
  if (operator_id)       q = q.eq("operator_id", operator_id);
  if (source)            q = q.eq("source", source);
  if (cable_code)        q = q.or(`cable_code_raw.ilike.%${cable_code}%,cable_code_normalized.ilike.%${cable_code}%`);
  if (date_from)         q = q.gte("occurred_at", new Date(date_from).toISOString());
  if (date_to) {
    const end = new Date(date_to);
    end.setHours(23, 59, 59, 999);
    q = q.lte("occurred_at", end.toISOString());
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getPendingEvents(limit = 100): Promise<CoreEvent[]> {
  return listCoreEvents({ validation_status: "pending", limit });
}

export async function getCoreEvent(id: string): Promise<CoreEvent | null> {
  const { data, error } = await supabase
    .from("core_events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertCoreEvent(payload: InsertCoreEvent): Promise<CoreEvent> {
  const { data, error } = await supabase
    .from("core_events")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function bulkInsertCoreEvents(events: InsertCoreEvent[]): Promise<CoreEvent[]> {
  if (events.length === 0) return [];
  const { data, error } = await supabase
    .from("core_events")
    .insert(events)
    .select("*");
  if (error) throw error;
  return (data ?? []) as CoreEvent[];
}

export async function updateCoreEvent(id: string, patch: UpdateCoreEvent): Promise<CoreEvent> {
  const { data, error } = await supabase
    .from("core_events")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function validateEvent(
  id: string,
  validatedBy: string
): Promise<CoreEvent> {
  return updateCoreEvent(id, {
    validation_status: "validated",
    validated_at: new Date().toISOString(),
    validated_by: validatedBy,
  });
}

export async function rejectEvent(
  id: string,
  validatedBy: string
): Promise<CoreEvent> {
  return updateCoreEvent(id, {
    validation_status: "rejected",
    validated_at: new Date().toISOString(),
    validated_by: validatedBy,
  });
}

// Promote: creates cable_event, marks event as promoted.
// DOES NOT write to inca_cavi — V1 rule.
export async function promoteEvent(
  id: string,
  validatedBy: string
): Promise<CoreEvent> {
  return updateCoreEvent(id, {
    validation_status: "promoted",
    validated_at: new Date().toISOString(),
    validated_by: validatedBy,
  });
}
