import type { CableStoryLoadResult, CableStoryViewModel } from "../../../modules/cable-story/cableStory.types";

export type CommanderCommandName =
  | "today"
  | "risk"
  | "priority"
  | "equipment"
  | "cable"
  | "tomorrow";

export type CommanderParsedCommand =
  | { name: "today"; raw: string }
  | { name: "risk"; raw: string }
  | { name: "priority"; raw: string }
  | { name: "tomorrow"; raw: string }
  | { name: "equipment"; raw: string; code: string }
  | { name: "cable"; raw: string; code: string };

export type CommanderRiskLevel = "Basso" | "Medio" | "Alto" | "Critico";

export interface CommanderTodayReadModel {
  planned: number | null;
  confirmed: number | null;
  withoutEvidence: number | null;
  toVerify: number | null;
  blocked: number | null;
  topPriority: string | null;
  criticalZones: string[];
}

export interface CommanderPriorityItem {
  cableCode: string;
  priority: string;
  reason: string | null;
  status: string;
}

export interface CommanderPriorityReadModel {
  openItems: CommanderPriorityItem[];
}

export interface CommanderRiskItem {
  title: string;
  detail: string;
  level: CommanderRiskLevel;
}

export interface CommanderRiskReadModel {
  items: CommanderRiskItem[];
}

export interface CommanderEquipmentReadModel {
  equipmentCode: string;
  cablesTotal: number | null;
  posati: number | null;
  collegatiCompleti: number | null;
  bloccati: number | null;
  withoutEvidence: number | null;
  riskLevel: CommanderRiskLevel | null;
  actions: string[];
}

export interface CommanderTomorrowAction {
  title: string;
  detail: string;
}

export interface CommanderTomorrowReadModel {
  actions: CommanderTomorrowAction[];
  recommendation: string | null;
}

export interface CommanderCableReadModel {
  code: string;
  story: CableStoryViewModel | null;
  resolution: CableStoryLoadResult;
}
