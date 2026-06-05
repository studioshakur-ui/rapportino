import { supabase } from "../../lib/supabaseClient";
import { buildItemVM } from "../daily-lists/dailyLists.logic";
import { fetchEvidenceForCodes } from "../daily-lists/dailyLists.repo";
import type { DailyListItem } from "../daily-lists/dailyLists.types";
import { buildEquipmentBriefingContext, buildEquipmentStory, enrichEquipmentCable } from "./equipment.logic";
import type { EquipmentCableDirection, EquipmentLinkedCable, EquipmentStoryVM } from "./equipment.types";

interface FindingRow {
  entity_id: string | null;
  core_event_id: string | null;
  severity: string;
  status: string;
}

interface PriorityRow {
  cable_code: string;
  status: string;
}

interface IncaStatusRow {
  id: string;
  situazione: string | null;
}

function normalizeEquipmentCode(code: string): string {
  return code.trim().toUpperCase();
}

function toEquipmentCable(
  item: DailyListItem,
  direction: EquipmentCableDirection,
  evidence: ReturnType<typeof buildItemVM>["evidence"],
  blockerCount: number,
  priorityCount: number
): EquipmentLinkedCable {
  const base = buildItemVM(item, evidence, blockerCount > 0);
  const linked: EquipmentLinkedCable = {
    ...base,
    direction,
    equipment_role: direction === "outgoing" ? "app_partenza" : "app_arrivo",
    inca_status_code: null,
    inca_status_label: "—",
    open_blocker_count: blockerCount,
    open_priority_count: priorityCount,
    risk_reasons: [],
  };

  return enrichEquipmentCable(linked);
}

export async function loadEquipmentStory(equipmentCode: string): Promise<EquipmentStoryVM> {
  const code = normalizeEquipmentCode(equipmentCode);
  if (!code) return buildEquipmentStory(code, []);

  const { data: items, error } = await supabase
    .from("daily_list_items")
    .select("*")
    .or(`app_partenza.eq.${code},app_arrivo.eq.${code}`)
    .order("cable_code_normalized", { ascending: true })
    .limit(1000);

  if (error) throw error;

  const dailyItems = (items ?? []) as DailyListItem[];
  if (dailyItems.length === 0) return buildEquipmentStory(code, []);

  const cableCodes = Array.from(new Set(dailyItems.map((item) => item.cable_code_normalized)));
  const incaIds = Array.from(new Set(dailyItems.map((item) => item.inca_cavo_id).filter((id): id is string => Boolean(id))));
  const [evidenceMap, blockerMap, priorityMap, incaStatusMap] = await Promise.all([
    fetchEvidenceForCodes(cableCodes),
    fetchOpenBlockers(cableCodes),
    fetchOpenPriorities(cableCodes),
    fetchIncaStatuses(incaIds),
  ]);

  const linked = dailyItems.map((item) => {
    const officialStatus = item.inca_cavo_id ? incaStatusMap.get(item.inca_cavo_id) ?? null : null;
    const effectiveItem = officialStatus ? { ...item, situazione_inca: officialStatus } : item;
    const direction: EquipmentCableDirection =
      normalizeEquipmentCode(effectiveItem.app_partenza ?? "") === code ? "outgoing" : "incoming";
    return toEquipmentCable(
      effectiveItem,
      direction,
      evidenceMap.get(effectiveItem.cable_code_normalized) ?? [],
      blockerMap.get(effectiveItem.cable_code_normalized) ?? 0,
      priorityMap.get(effectiveItem.cable_code_normalized) ?? 0
    );
  });

  return buildEquipmentStory(code, linked);
}

async function fetchIncaStatuses(incaIds: string[]): Promise<Map<string, string | null>> {
  if (incaIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("inca_cavi")
    .select("id,situazione")
    .in("id", incaIds);

  if (error) throw error;
  return new Map(((data ?? []) as IncaStatusRow[]).map((row) => [row.id, row.situazione]));
}

async function fetchOpenBlockers(cableCodes: string[]): Promise<Map<string, number>> {
  if (cableCodes.length === 0) return new Map();

  const { data, error } = await supabase
    .from("agent_findings")
    .select("entity_id,core_event_id,severity,status")
    .eq("status", "open")
    .eq("severity", "block")
    .eq("entity_type", "cable_code")
    .in("entity_id", cableCodes);

  if (error) throw error;

  const result = new Map<string, number>();
  for (const row of (data ?? []) as FindingRow[]) {
    if (!row.entity_id) continue;
    result.set(row.entity_id, (result.get(row.entity_id) ?? 0) + 1);
  }
  return result;
}

async function fetchOpenPriorities(cableCodes: string[]): Promise<Map<string, number>> {
  if (cableCodes.length === 0) return new Map();

  const { data, error } = await supabase
    .from("cable_priorities")
    .select("cable_code,status")
    .eq("status", "open")
    .in("cable_code", cableCodes);

  if (error) throw error;

  const result = new Map<string, number>();
  for (const row of (data ?? []) as PriorityRow[]) {
    result.set(row.cable_code, (result.get(row.cable_code) ?? 0) + 1);
  }
  return result;
}

export async function loadEquipmentBriefingContext(equipmentCode: string) {
  return buildEquipmentBriefingContext(await loadEquipmentStory(equipmentCode));
}
