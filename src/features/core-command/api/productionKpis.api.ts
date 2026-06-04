// src/features/core-command/api/productionKpis.api.ts
import { supabase } from "../../../lib/supabaseClient";
import type { ProductionKpi, InsertProductionKpi } from "../types";

export async function listProductionKpis(
  commessa?: string,
  days = 30
): Promise<ProductionKpi[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  let q = supabase
    .from("production_daily_kpis")
    .select("*")
    .gte("day", sinceStr)
    .order("day", { ascending: false });

  if (commessa) q = q.eq("commessa", commessa);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getKpiForDay(
  day: string,
  commessa?: string | null
): Promise<ProductionKpi | null> {
  let q = supabase
    .from("production_daily_kpis")
    .select("*")
    .eq("day", day);

  if (commessa) {
    q = q.eq("commessa", commessa);
  } else {
    q = q.is("commessa", null);
  }

  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertKpi(payload: InsertProductionKpi): Promise<ProductionKpi> {
  // Use the two partial unique indexes: (day, commessa NOT NULL) or (day WHERE commessa IS NULL)
  const { data, error } = await supabase
    .from("production_daily_kpis")
    .upsert(payload, { onConflict: "day,commessa" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Recompute KPI for a given day from cable_events + core_events
export async function recomputeKpiFromEvents(
  day: string,
  commessa?: string | null
): Promise<InsertProductionKpi> {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const [cableEvtsRes, openPriRes, openFindRes] = await Promise.all([
    supabase
      .from("cable_events")
      .select("id, cable_code, operator_id")
      .gte("occurred_at", dayStart.toISOString())
      .lte("occurred_at", dayEnd.toISOString()),
    supabase
      .from("cable_priorities")
      .select("id")
      .eq("status", "open"),
    supabase
      .from("agent_findings")
      .select("id")
      .eq("status", "open"),
  ]);

  if (cableEvtsRes.error) throw cableEvtsRes.error;
  if (openPriRes.error)   throw openPriRes.error;
  if (openFindRes.error)  throw openFindRes.error;

  const evts = cableEvtsRes.data ?? [];
  const uniqueCables   = new Set(evts.map((e) => e.cable_code)).size;
  const uniqueOperators = new Set(evts.map((e) => e.operator_id).filter(Boolean)).size;

  return {
    day,
    commessa: commessa ?? null,
    cables_count: uniqueCables,
    meters_done: 0,
    active_operators_count: uniqueOperators,
    open_priorities_count: openPriRes.data?.length ?? 0,
    open_anomalies_count: openFindRes.data?.length ?? 0,
  };
}
