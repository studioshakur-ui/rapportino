import { listRecentImports, loadItemsWithEvidence } from "../../modules/daily-lists/dailyLists.repo";
import { buildListSummary } from "../../modules/daily-lists/dailyLists.logic";
import { loadEquipmentIntelligenceDashboard } from "../../modules/equipment/equipmentIntelligence.repo";
import { listRecentTelegramMessages } from "../../features/core-command/api/telegramMessages.api";
import { listOpenPriorities } from "../../features/core-command/api/cablePriorities.api";
import { ensureArray } from "../../core/utils/array";
import { buildSdcCableLookup, getDisplayCableCode } from "./sdc";
import type { DailyListItemVM, DailyListSummary } from "../../modules/daily-lists/dailyLists.types";
import type { EquipmentIntelligence, SystemClosure } from "../../modules/equipment/equipment.types";
import { buildDailySituationView } from "./dailySituation";
import type { DailySituationView } from "./dailySituation";

export interface CoreEngineImportInfo {
  id: string;
  file_name: string;
  list_date: string | null;
  rows_count: number;
}

export interface TodayWorkClosureCard {
  key: string;
  kind: "system" | "equipment";
  code: string;
  name: string;
  zone: string | null;
  system: string | null;
  status: string;
  summary: string;
  blocker: string | null;
  route: string;
}

export interface TodayWorkTelegramCard {
  message_id: string;
  message_ts: string | null;
  text: string;
  cable_codes: string[];
  systems: string[];
  before_label: string;
  after_label: string;
  system_closed: boolean;
}

export interface TodayWorkView {
  latest_import: CoreEngineImportInfo | null;
  summary: DailyListSummary | null;
  open_priorities: Array<{
    cable_code: string;
    reason: string | null;
    priority: string;
  }>;
  metrics: {
    total_cables: number;
    confirmed_cables: number;
    remaining_cables: number;
    blocked_cables: number;
    open_systems: number;
    blocked_systems: number;
    open_equipments: number;
    blocked_equipments: number;
    telegram_impacts: number;
  };
  critical_closures: TodayWorkClosureCard[];
  telegram_impacts: TodayWorkTelegramCard[];
}

export interface ApparatusClosureCard {
  equipment_code: string;
  equipment_name: string | null;
  zone: string | null;
  system: string | null;
  closure_status: string;
  risk_level: string;
  total_cables: number;
  confirmed_cables: number;
  open_cables: number;
  blocked_cables: number;
  without_field_evidence: number;
  status_distribution: Record<string, number>;
  recommended_actions: string[];
  completion_rate: number;
  blocker: string | null;
  critical_path: string[];
  route: string;
}

export interface ApparatusClosureView {
  systems: SystemClosure[];
  equipments: ApparatusClosureCard[];
}

export interface FieldEvidenceCard {
  cable_code_raw: string | null;
  cable_code: string;
  display_cable_code: string;
  cable_story_path: string;
  perimetro: string | null;
  app_partenza: string | null;
  app_arrivo: string | null;
  stato_collegamento: string | null;
  situazione_inca: string | null;
  note: string | null;
  computed_status: string;
  evidence_count: number;
  last_event_at: string | null;
  last_actor: string | null;
  last_message: string | null;
  recommended_action: string;
  confirmed_by_whatsapp: boolean;
  missing_evidence: boolean;
  has_partial_progress: boolean;
  has_short_issue: boolean;
  has_missing_issue: boolean;
}

export interface FieldEvidenceView {
  imports: CoreEngineImportInfo[];
  summary: DailyListSummary | null;
  priority_items: FieldEvidenceCard[];
  missing_evidence_items: FieldEvidenceCard[];
  partial_items: FieldEvidenceCard[];
  blocked_items: FieldEvidenceCard[];
}

export interface ClosureSystemChartPoint {
  system: string;
  zone: string | null;
  total_equipments: number;
  closed_equipments: number;
  open_equipments: number;
  blocked_equipments: number;
}

export interface ClosureZoneChartPoint {
  zone: string;
  total_equipments: number;
  closed_equipments: number;
  open_equipments: number;
  blocked_equipments: number;
}

export interface TelegramTrendChartPoint {
  label: string;
  total_messages: number;
  with_cables: number;
  blocking: number;
}

export interface IncaDistributionPoint {
  label: string;
  count: number;
}

export interface ClosureChartsView {
  system_closures: ClosureSystemChartPoint[];
  blocked_by_zone: ClosureZoneChartPoint[];
  telegram_trend: TelegramTrendChartPoint[];
  inca_distribution: IncaDistributionPoint[];
}

export interface CoreEngineSnapshot {
  today: TodayWorkView;
  apparatus: ApparatusClosureView;
  field: FieldEvidenceView;
  charts: ClosureChartsView;
  situation: DailySituationView;
}

function emptySnapshot(): CoreEngineSnapshot {
  const today: TodayWorkView = {
    latest_import: null,
    summary: null,
    open_priorities: [],
    metrics: {
      total_cables: 0,
      confirmed_cables: 0,
      remaining_cables: 0,
      blocked_cables: 0,
      open_systems: 0,
      blocked_systems: 0,
      open_equipments: 0,
      blocked_equipments: 0,
      telegram_impacts: 0,
    },
    critical_closures: [],
    telegram_impacts: [],
  };
  const apparatus: ApparatusClosureView = {
    systems: [],
    equipments: [],
  };
  const field: FieldEvidenceView = {
    imports: [],
    summary: null,
    priority_items: [],
    missing_evidence_items: [],
    partial_items: [],
    blocked_items: [],
  };
  const charts: ClosureChartsView = {
    system_closures: [],
    blocked_by_zone: [],
    telegram_trend: [],
    inca_distribution: [],
  };

  return {
    today,
    apparatus,
    field,
    charts,
    situation: buildDailySituationView({ today, field, apparatus }),
  };
}

function toImportInfo(item: { id: string; file_name: string; list_date: string | null; rows_count: number }): CoreEngineImportInfo {
  return {
    id: item.id,
    file_name: item.file_name,
    list_date: item.list_date,
    rows_count: item.rows_count,
  };
}

function buildTodayClosures(
  systems: SystemClosure[],
  equipments: EquipmentIntelligence[]
): TodayWorkClosureCard[] {
  const criticalSystems = ensureArray(systems, "coreEngine.today.systems")
    .filter((system) => system.closure_status !== "CLOSED")
    .slice(0, 8)
    .map((system) => ({
      key: `system:${system.system}`,
      kind: "system" as const,
      code: system.system,
      name: system.system,
      zone: system.zone,
      system: system.system,
      status: system.closure_status,
      summary: `${system.closed_equipments}/${system.total_equipments} chiusi`,
      blocker: system.critical_path[0]?.reason ?? null,
      route: "/apparati",
    }));

  const criticalEquipments = ensureArray(equipments, "coreEngine.today.equipments")
    .filter((equipment) => equipment.closure_status !== "CLOSED")
    .slice(0, 10)
    .map((equipment) => ({
      key: `equipment:${equipment.equipment_code}`,
      kind: "equipment" as const,
      code: equipment.equipment_code,
      name: equipment.equipment_name ?? equipment.equipment_code,
      zone: equipment.zone,
      system: equipment.system,
      status: equipment.closure_status,
      summary: `${equipment.confirmed_cables}/${equipment.total_cables} cavi confermati`,
      blocker: equipment.critical_path[0]?.reason ?? null,
      route: `/equipment/${encodeURIComponent(equipment.equipment_code)}`,
    }));

  return [...criticalSystems, ...criticalEquipments];
}

function buildFieldEvidenceCards(items: DailyListItemVM[]): FieldEvidenceCard[] {
  return ensureArray(items, "coreEngine.field.items")
    .filter((item) =>
      item.missing_evidence ||
      item.has_partial_progress ||
      item.has_short_issue ||
      item.has_missing_issue ||
      item.computed_status === "blocked"
    )
    .slice(0, 24)
    .map((item) => ({
      cable_code_raw: item.cable_code_raw ?? null,
      cable_code: item.cable_code_normalized,
      display_cable_code: getDisplayCableCode(item.cable_code_raw ?? item.cable_code_normalized),
      cable_story_path: item.cable_story_path,
      perimetro: item.perimetro,
      app_partenza: item.app_partenza,
      app_arrivo: item.app_arrivo,
      stato_collegamento: item.stato_collegamento,
      situazione_inca: item.situazione_inca,
      note: item.note,
      computed_status: item.computed_status,
      evidence_count: item.evidence_count,
      last_event_at: item.last_event_at,
      last_actor: item.last_actor,
      last_message: item.last_message,
      recommended_action: item.recommended_action,
      confirmed_by_whatsapp: item.confirmed_by_whatsapp,
      missing_evidence: item.missing_evidence,
      has_partial_progress: item.has_partial_progress,
      has_short_issue: item.has_short_issue,
      has_missing_issue: item.has_missing_issue,
    }));
}

function buildTelegramTrend(messages: Array<{ message_ts: string | null; cable_refs: string[]; text?: string | null }>): TelegramTrendChartPoint[] {
  const map = new Map<string, { label: string; total: number; withCables: number; blocking: number }>();
  for (const message of ensureArray(messages, "coreEngine.telegram.messages")) {
    const key = message.message_ts ? message.message_ts.slice(0, 10) : "0000-00-00";
    const label = message.message_ts ? new Date(message.message_ts).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }) : "Senza data";
    const current = map.get(key) ?? { label, total: 0, withCables: 0, blocking: 0 };
    current.total += 1;
    if (ensureArray(message.cable_refs, `coreEngine.telegram.${label}.cable_refs`).length > 0) {
      current.withCables += 1;
    }
    const text = String(message.text ?? "").toLowerCase();
    if (/blocc|mancant|cort|crit/.test(text)) {
      current.blocking += 1;
    }
    map.set(key, current);
  }

  return Array.from(map.entries())
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([, stats]) => ({
      label: stats.label,
      total_messages: stats.total,
      with_cables: stats.withCables,
      blocking: stats.blocking,
    }));
}

function buildBlockedByZone(equipments: EquipmentIntelligence[]): ClosureZoneChartPoint[] {
  const map = new Map<string, { total: number; closed: number; open: number; blocked: number }>();
  for (const equipment of ensureArray(equipments, "coreEngine.blockedByZone.equipments")) {
    const zone = equipment.zone ?? "Zona non assegnata";
    const current = map.get(zone) ?? { total: 0, closed: 0, open: 0, blocked: 0 };
    current.total += 1;
    if (equipment.closure_status === "CLOSED") current.closed += 1;
    else if (equipment.closure_status === "BLOCKED") current.blocked += 1;
    else current.open += 1;
    map.set(zone, current);
  }

  return Array.from(map.entries())
    .map(([zone, stats]) => ({
      zone,
      total_equipments: stats.total,
      closed_equipments: stats.closed,
      open_equipments: stats.open,
      blocked_equipments: stats.blocked,
    }))
    .sort((left, right) => right.blocked_equipments - left.blocked_equipments || right.open_equipments - left.open_equipments);
}

function buildIncaDistribution(items: DailyListItemVM[]): IncaDistributionPoint[] {
  const map = new Map<string, number>();
  for (const item of ensureArray(items, "coreEngine.incaDistribution.items")) {
    const label = item.situazione_inca?.trim() || item.stato_collegamento?.trim() || "Senza dato";
    map.set(label, (map.get(label) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count);
}

export async function loadCoreEngineSnapshot(): Promise<CoreEngineSnapshot> {
  const [latestImport] = await listRecentImports(1);
  const imports = await listRecentImports(12);
  if (!latestImport) return emptySnapshot();

  const [items, dashboard, telegramMessages, openPriorities] = await Promise.all([
    loadItemsWithEvidence(latestImport.id),
    loadEquipmentIntelligenceDashboard(),
    listRecentTelegramMessages(24),
    listOpenPriorities(10),
  ]);

  const summary = buildListSummary(latestImport.id, latestImport.list_date, latestImport.file_name, items);
  const systems = ensureArray(dashboard.systems, "coreEngine.dashboard.systems");
  const equipments = ensureArray(dashboard.equipments, "coreEngine.dashboard.equipments");
  const telegramImpacts = ensureArray(dashboard.telegram_impacts, "coreEngine.dashboard.telegram_impacts");
  const sdcLookup = buildSdcCableLookup(items);

  const today: TodayWorkView = {
    latest_import: toImportInfo(latestImport),
    summary,
    open_priorities: ensureArray(openPriorities, "coreEngine.today.open_priorities").map((priority) => ({
      cable_code: priority.cable_code,
      reason: priority.reason ?? null,
      priority: priority.priority,
    })),
    metrics: {
      total_cables: summary.total,
      confirmed_cables: summary.confirmed + summary.likely_laid,
      remaining_cables: Math.max(summary.total - summary.confirmed - summary.likely_laid, 0),
      blocked_cables: summary.blocked,
      open_systems: systems.filter((system) => system.closure_status !== "CLOSED").length,
      blocked_systems: systems.filter((system) => system.closure_status === "BLOCKED").length,
      open_equipments: equipments.filter((equipment) => equipment.closure_status !== "CLOSED").length,
      blocked_equipments: equipments.filter((equipment) => equipment.closure_status === "BLOCKED").length,
      telegram_impacts: telegramImpacts.length,
    },
    critical_closures: buildTodayClosures(systems, equipments),
    telegram_impacts: telegramImpacts.map((impact) => ({
      message_id: impact.message_id,
      message_ts: impact.message_ts,
      text: impact.text ?? "",
      cable_codes: [impact.cable_code],
      systems: impact.systems,
      before_label: impact.before_label,
      after_label: impact.after_label,
      system_closed: impact.system_closed,
    })),
  };

  const apparatus: ApparatusClosureView = {
    systems,
    equipments: equipments.map((equipment) => ({
      equipment_code: equipment.equipment_code,
      equipment_name: equipment.equipment_name,
      zone: equipment.zone,
      system: equipment.system,
      closure_status: equipment.closure_status,
      risk_level: equipment.risk_level,
      total_cables: equipment.total_cables,
      confirmed_cables: equipment.confirmed_cables,
      open_cables: equipment.open_cables,
      blocked_cables: equipment.blocked_cables,
      without_field_evidence: equipment.without_field_evidence,
      status_distribution: equipment.status_distribution,
      recommended_actions: equipment.recommended_actions,
      completion_rate: equipment.completion_rate,
      blocker: equipment.critical_path[0]?.reason ?? null,
      critical_path: ensureArray(equipment.critical_path, `coreEngine.apparatus.${equipment.equipment_code}.critical_path`).map((cable) => cable.cable_code),
      route: `/equipment/${encodeURIComponent(equipment.equipment_code)}`,
    })),
  };

  const field: FieldEvidenceView = {
    imports: imports.map(toImportInfo),
    summary,
    priority_items: buildFieldEvidenceCards(items).filter((item) => item.computed_status === "blocked" || item.has_partial_progress || item.confirmed_by_whatsapp),
    missing_evidence_items: buildFieldEvidenceCards(items).filter((item) => item.computed_status === "no_evidence"),
    partial_items: buildFieldEvidenceCards(items).filter((item) => item.computed_status === "to_verify" || item.computed_status === "likely_laid"),
    blocked_items: buildFieldEvidenceCards(items).filter((item) => item.computed_status === "blocked"),
  };

  const charts: ClosureChartsView = {
    system_closures: systems.map((system) => ({
      system: system.system,
      zone: system.zone,
      total_equipments: system.total_equipments,
      closed_equipments: system.closed_equipments,
      open_equipments: system.open_equipments,
      blocked_equipments: system.blocked_equipments,
    })),
    blocked_by_zone: buildBlockedByZone(equipments),
    telegram_trend: buildTelegramTrend(telegramMessages),
    inca_distribution: buildIncaDistribution(items),
  };

  return {
    today,
    apparatus,
    field,
    charts,
    situation: buildDailySituationView({ today, field, apparatus, sdc: sdcLookup }),
  };
}
