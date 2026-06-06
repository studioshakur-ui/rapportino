import { formatCableDisplay } from "../../core/cable/cableDisplay";
import { normalizeCableCode } from "../../features/core-command/agents/normalizer.agent";
import type { TelegramLiveMessage } from "../../features/core-command/api/telegramMessages.api";
import type { DailyItemEvidence } from "../daily-lists/dailyLists.types";
import type { NavemasterAiOverview, NavemasterNormalizedRow } from "./navemaster.types";

export interface NavemasterWorklistItem {
  cableCode: string;
  displayCode: string;
  score: number;
  level: "critical" | "high" | "watch";
  reasons: string[];
  nextAction: string;
  perimetro: string | null;
  apparati: string[];
  telegramMessages: TelegramLiveMessage[];
  terrainEvidence: DailyItemEvidence[];
  row: NavemasterNormalizedRow;
}

export interface NavemasterWorklistSummary {
  total: number;
  critical: number;
  high: number;
  withTelegram: number;
  withTerrain: number;
  apparatiImpacted: number;
}

export interface NavemasterWorklistEquipment {
  code: string;
  count: number;
  maxScore: number;
  cables: string[];
}

export interface NavemasterWorklistPerimeter {
  name: string;
  count: number;
  maxScore: number;
}

export interface NavemasterWorklistModel {
  items: NavemasterWorklistItem[];
  summary: NavemasterWorklistSummary;
  equipments: NavemasterWorklistEquipment[];
  perimeters: NavemasterWorklistPerimeter[];
}

function codeKey(value: string | null | undefined): string {
  return normalizeCableCode(value ?? "").replace(/\s+/g, "");
}

function cleanText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function levelFromScore(score: number): NavemasterWorklistItem["level"] {
  if (score >= 70) return "critical";
  if (score >= 45) return "high";
  return "watch";
}

function pushEquipment(
  map: Map<string, NavemasterWorklistEquipment>,
  equipment: string | null,
  item: NavemasterWorklistItem,
): void {
  const code = cleanText(equipment);
  if (!code) return;
  const current = map.get(code) ?? { code, count: 0, maxScore: 0, cables: [] };
  current.count += 1;
  current.maxScore = Math.max(current.maxScore, item.score);
  if (!current.cables.includes(item.displayCode)) current.cables.push(item.displayCode);
  map.set(code, current);
}

export function buildNavemasterWorklist(
  rows: NavemasterNormalizedRow[],
  aiOverview: NavemasterAiOverview,
  telegramMessages: TelegramLiveMessage[],
  evidenceMap: Map<string, DailyItemEvidence[]>,
): NavemasterWorklistModel {
  const insightMap = new Map(aiOverview.insights.map((insight) => [codeKey(insight.marcacavo), insight]));
  const telegramMap = new Map<string, TelegramLiveMessage[]>();

  for (const message of telegramMessages) {
    for (const ref of message.cable_refs) {
      const key = codeKey(ref);
      const list = telegramMap.get(key) ?? [];
      list.push(message);
      telegramMap.set(key, list);
    }
  }

  const items: NavemasterWorklistItem[] = [];

  for (const row of rows) {
    const key = codeKey(row.marcacavo);
    const insight = insightMap.get(key);
    const telegram = telegramMap.get(key) ?? [];
    const terrainEvidence = evidenceMap.get(row.marcacavo) ?? evidenceMap.get(formatCableDisplay(row.marcacavo)) ?? [];
    const text = [
      row.payload.problematiche_cavi,
      row.payload.problematiche_collegamenti,
      row.payload.note_sviluppo,
      row.payload.note_conit,
    ].map(cleanText).join(" ").toUpperCase();

    let score = insight?.aiRiskScore ?? 0;
    const reasons = [...(insight?.aiRiskReasons ?? [])];

    if (telegram.length > 0) {
      score += Math.min(14, telegram.length * 4);
      reasons.push(`${telegram.length} signal Telegram`);
    }

    if (terrainEvidence.length > 0) {
      score += Math.min(10, terrainEvidence.length * 3);
      reasons.push(`${terrainEvidence.length} preuve terrain`);
    }

    if (/BLOCC|MANC|DA TROVARE|RISTENDERE|CORT|SHORT/.test(text)) {
      score += 20;
      if (!reasons.includes("signal chantier bloquant")) reasons.push("signal chantier bloquant");
    }

    if (score < 35) continue;

    items.push({
      cableCode: row.marcacavo,
      displayCode: formatCableDisplay(row.marcacavo),
      score: Math.min(score, 100),
      level: levelFromScore(score),
      reasons: Array.from(new Set(reasons)).slice(0, 5),
      nextAction: insight?.aiNextAction ?? "Relire les signaux terrain et confirmer dans Cable Story",
      perimetro: row.impianto,
      apparati: [row.apparato_da, row.apparato_a].map(cleanText).filter(Boolean),
      telegramMessages: telegram,
      terrainEvidence,
      row,
    });
  }

  items.sort((left, right) => right.score - left.score || left.displayCode.localeCompare(right.displayCode));

  const equipmentMap = new Map<string, NavemasterWorklistEquipment>();
  const perimeterMap = new Map<string, NavemasterWorklistPerimeter>();

  for (const item of items) {
    pushEquipment(equipmentMap, item.row.apparato_da, item);
    pushEquipment(equipmentMap, item.row.apparato_a, item);
    const perimeter = item.perimetro ?? "Sans perimetro";
    const current = perimeterMap.get(perimeter) ?? { name: perimeter, count: 0, maxScore: 0 };
    current.count += 1;
    current.maxScore = Math.max(current.maxScore, item.score);
    perimeterMap.set(perimeter, current);
  }

  return {
    items,
    summary: {
      total: items.length,
      critical: items.filter((item) => item.level === "critical").length,
      high: items.filter((item) => item.level === "high").length,
      withTelegram: items.filter((item) => item.telegramMessages.length > 0).length,
      withTerrain: items.filter((item) => item.terrainEvidence.length > 0).length,
      apparatiImpacted: equipmentMap.size,
    },
    equipments: Array.from(equipmentMap.values()).sort((left, right) => right.maxScore - left.maxScore || right.count - left.count).slice(0, 12),
    perimeters: Array.from(perimeterMap.values()).sort((left, right) => right.maxScore - left.maxScore || right.count - left.count).slice(0, 10),
  };
}
