import type { Database } from "../../types/supabase.generated";
import { listRecentImports, loadItemsWithEvidence } from "../daily-lists/dailyLists.repo";
import { listRecentTelegramMessages } from "../../features/core-command/api/telegramMessages.api";
import { supabase } from "../../lib/supabaseClient";
import {
  buildEquipmentIntelligence,
  buildSystemClosures,
  buildTelegramImpacts,
  type EquipmentIntelligenceSource,
} from "./equipment.intelligence";
import type { EquipmentIntelligenceDashboard, EquipmentRiskLevel } from "./equipment.types";

type IncaCableRow = Database["public"]["Tables"]["inca_cavi"]["Row"];
type CablePriorityRow = Database["public"]["Tables"]["cable_priorities"]["Row"];

function mapPriority(priority: string | null): EquipmentRiskLevel | null {
  if (priority === "critical" || priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }
  return null;
}

async function fetchIncaCables(ids: string[]): Promise<Map<string, IncaCableRow>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("inca_cavi")
    .select("id,apparato_a,apparato_da,descrizione_a,descrizione_da,impianto,sezione,tipo,zona_a,zona_da")
    .in("id", ids);

  if (error) throw error;
  return new Map(((data ?? []) as IncaCableRow[]).map((row) => [row.id, row]));
}

async function fetchCablePriorities(codes: string[]): Promise<Map<string, { count: number; highest: EquipmentRiskLevel | null }>> {
  if (codes.length === 0) return new Map();

  const { data, error } = await supabase
    .from("cable_priorities")
    .select("cable_code,priority,status")
    .eq("status", "open")
    .in("cable_code", codes);

  if (error) throw error;

  const map = new Map<string, { count: number; highest: EquipmentRiskLevel | null }>();
  const rank: Record<EquipmentRiskLevel, number> = { low: 1, medium: 2, high: 3, critical: 4 };

  for (const row of (data ?? []) as CablePriorityRow[]) {
    const current = map.get(row.cable_code) ?? { count: 0, highest: null };
    const next = mapPriority(row.priority);
    current.count += 1;
    if (next && (!current.highest || rank[next] > rank[current.highest])) {
      current.highest = next;
    }
    map.set(row.cable_code, current);
  }

  return map;
}

export async function loadEquipmentIntelligenceDashboard(): Promise<EquipmentIntelligenceDashboard> {
  const latest = (await listRecentImports(1))[0] ?? null;
  if (!latest) {
    return {
      import_id: null,
      list_date: null,
      file_name: null,
      total_systems: 0,
      closed_systems: 0,
      blocked_systems: 0,
      total_equipments: 0,
      closed_equipments: 0,
      blocked_equipments: 0,
      systems: [],
      equipments: [],
      telegram_impacts: [],
    };
  }

  const items = await loadItemsWithEvidence(latest.id);
  const incaIds = Array.from(new Set(items.map((item) => item.inca_cavo_id).filter((id): id is string => Boolean(id))));
  const cableCodes = Array.from(new Set(items.map((item) => item.cable_code_normalized)));

  const [incaMap, priorityMap, telegramMessages] = await Promise.all([
    fetchIncaCables(incaIds),
    fetchCablePriorities(cableCodes),
    listRecentTelegramMessages(16),
  ]);

  const sources: EquipmentIntelligenceSource[] = items.map((item) => ({
    item,
    inca: item.inca_cavo_id ? incaMap.get(item.inca_cavo_id) ?? null : null,
    priority: priorityMap.get(item.cable_code_normalized),
  }));

  const equipments = buildEquipmentIntelligence(sources);
  const systems = buildSystemClosures(equipments);
  const telegramImpacts = buildTelegramImpacts(telegramMessages, equipments, systems);

  return {
    import_id: latest.id,
    list_date: latest.list_date,
    file_name: latest.file_name,
    total_systems: systems.length,
    closed_systems: systems.filter((system) => system.closure_status === "CLOSED").length,
    blocked_systems: systems.filter((system) => system.closure_status === "BLOCKED").length,
    total_equipments: equipments.length,
    closed_equipments: equipments.filter((equipment) => equipment.closure_status === "CLOSED").length,
    blocked_equipments: equipments.filter((equipment) => equipment.closure_status === "BLOCKED").length,
    systems,
    equipments,
    telegram_impacts: telegramImpacts,
  };
}
