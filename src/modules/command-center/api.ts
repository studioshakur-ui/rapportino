// src/modules/command-center/api.ts
import { supabase } from "../../core/supabase";
import type { CableEvent, ProductionDailyKpi } from "../../core/db/types";

export type TodayProduction = {
  cablesPosed: number;
  metersPosed: number;
  activeOperators: number;
  metersTarget: number | null;
  events: CableEvent[];
};

function todayRange(): { start: string; end: string; day: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  const day = start.toISOString().slice(0, 10);
  return { start: start.toISOString(), end: end.toISOString(), day };
}

export function todayKey(): string {
  return todayRange().day;
}

/** Définit l'objectif de mètres du jour (upsert sur production_daily_kpis). */
export async function setDailyTarget(meters: number): Promise<void> {
  const day = todayRange().day;
  const { error } = await supabase
    .from("production_daily_kpis")
    .upsert({ day, meters_target: meters, computed_at: new Date().toISOString() }, { onConflict: "day" });
  if (error) throw error;
}

export async function fetchTodayProduction(): Promise<TodayProduction> {
  const { start, end, day } = todayRange();

  const { data: events, error } = await supabase
    .from("cable_events")
    .select("*")
    .gte("occurred_at", start)
    .lt("occurred_at", end)
    .order("occurred_at", { ascending: false });
  if (error) throw error;

  const rows = (events ?? []) as CableEvent[];
  const posa = rows.filter((e) => e.event_type === "posa");
  const cablesPosed = new Set(posa.map((e) => e.cavo_code).filter(Boolean)).size;
  const metersPosed = posa.reduce((s, e) => s + (e.meters ?? 0), 0);
  const activeOperators = new Set(rows.map((e) => e.operator_id).filter(Boolean)).size;

  const { data: kpi } = await supabase
    .from("production_daily_kpis")
    .select("*")
    .eq("day", day)
    .maybeSingle();
  const metersTarget = (kpi as ProductionDailyKpi | null)?.meters_target ?? null;

  return { cablesPosed, metersPosed, activeOperators, metersTarget, events: rows };
}

export type GlobalProgress = {
  totalCables: number;
  totalMetersDesign: number;
  metersPosed: number;
  cablesPosed: number;
  ratio: number; // 0..1 on meters
};

const POSED_STATES = ["P", "T"]; // posé / terminé côté INCA (situazione)

export async function fetchGlobalProgress(): Promise<GlobalProgress> {
  const { data, error } = await supabase
    .from("inca_cavi")
    .select("situazione, stato_cantiere, metri_teo, metri_dis, metri_sit_cavo, metri_posati_teorici");
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    situazione: string | null;
    stato_cantiere: string | null;
    metri_teo: number | null;
    metri_dis: number | null;
    metri_sit_cavo: number | null;
    metri_posati_teorici: number | null;
  }>;

  let totalMetersDesign = 0;
  let metersPosed = 0;
  let cablesPosed = 0;
  for (const r of rows) {
    const theo = r.metri_teo ?? r.metri_dis ?? 0;
    totalMetersDesign += theo;
    const stato = (r.situazione ?? r.stato_cantiere ?? "").trim().toUpperCase();
    if (POSED_STATES.includes(stato)) {
      cablesPosed += 1;
      metersPosed += r.metri_posati_teorici ?? r.metri_sit_cavo ?? theo;
    }
  }
  const ratio = totalMetersDesign > 0 ? metersPosed / totalMetersDesign : 0;
  return {
    totalCables: rows.length,
    totalMetersDesign,
    metersPosed,
    cablesPosed,
    ratio,
  };
}
