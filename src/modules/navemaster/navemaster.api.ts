// src/modules/navemaster/navemaster.api.ts
// READ + compute + triage delle alert Navemaster. INCA resta read-only:
// nessuna scrittura su inca_cavi (il run è calcolato dall'RPC SECURITY DEFINER).

import { supabase } from "../../lib/supabaseClient";
import type { NavemasterAlert, NavemasterAlertStatus, NavemasterRun, NavemasterView, PerimetroBoardRow, PerimetroBoardView, PerimetroCavoRow } from "./navemaster.types";

// I nuovi RPC non sono nei tipi generati: piccolo wrapper non tipizzato.
type RpcFn = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
const rpc = ((fn: string, args?: Record<string, unknown>) => supabase.rpc(fn as never, args as never)) as unknown as RpcFn;

async function loadActiveShipId(): Promise<string | null> {
  const { data } = await supabase.from("ships").select("id").eq("is_active", true).limit(1).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function loadLatestRun(shipId: string): Promise<NavemasterRun | null> {
  const { data, error } = await supabase
    .from("navemaster_runs")
    .select("id, ship_id, verdict, created_at, drivers")
    .eq("ship_id", shipId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as NavemasterRun | null) ?? null;
}

async function loadAlerts(runId: string): Promise<NavemasterAlert[]> {
  const { data, error } = await supabase
    .from("navemaster_alerts")
    .select("id, run_id, codice, codice_norm, type, severity, status, evidence")
    .eq("run_id", runId)
    .order("severity", { ascending: true })
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as NavemasterAlert[];
}

/** Snapshot corrente: ultimo run + le sue alert. */
export async function loadNavemasterView(): Promise<NavemasterView> {
  const shipId = await loadActiveShipId();
  if (!shipId) return { run: null, alerts: [], shipId: null };
  const run = await loadLatestRun(shipId);
  const alerts = run ? await loadAlerts(run.id) : [];
  return { run, alerts, shipId };
}

/** Read-model périmètre: avancement live des 2 axes vers la consegna, par périmètre. */
export async function loadPerimetroBoard(): Promise<PerimetroBoardView> {
  const shipId = await loadActiveShipId();
  if (!shipId) return { shipId: null, rows: [] };
  const { data, error } = await rpc("navemaster_perimetro_board", { p_ship_id: shipId });
  if (error) throw new Error(error.message);
  return { shipId, rows: (data as PerimetroBoardRow[] | null) ?? [] };
}

/** Drill-down: i cavi che trattengono ancora un perimetro (non posati / non collegati / bloccati). */
export async function loadPerimetroCavi(shipId: string, perimetro: string): Promise<PerimetroCavoRow[]> {
  const { data, error } = await rpc("navemaster_perimetro_cavi", { p_ship_id: shipId, p_perimetro: perimetro });
  if (error) throw new Error(error.message);
  return (data as PerimetroCavoRow[] | null) ?? [];
}

/** Calcola un nuovo run di riconciliazione sul fichier INCA attivo. */
export async function computeNavemasterRun(shipId: string): Promise<string> {
  const { data, error } = await rpc("navemaster_compute_run_v2", { p_ship_id: shipId });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Triage di una alert (OPEN/ACK/RESOLVED). */
export async function setNavemasterAlertStatus(alertId: string, status: NavemasterAlertStatus): Promise<void> {
  const { error } = await rpc("navemaster_alert_set_status", { p_alert_id: alertId, p_status: status });
  if (error) throw new Error(error.message);
}
