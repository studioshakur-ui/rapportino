import type { DailyListItemVM } from "../daily-lists/dailyLists.types";
import type { IncaStatusCode } from "../../core/inca/statusDictionary";

export type EquipmentCableDirection = "outgoing" | "incoming";
export type EquipmentRiskLevel = "low" | "medium" | "high" | "critical";
export type EquipmentClosureStatus = "OPEN" | "PARTIAL" | "BLOCKED" | "CLOSED";
export type SystemClosureStatus = EquipmentClosureStatus;

export interface EquipmentLinkedCable extends DailyListItemVM {
  direction: EquipmentCableDirection;
  equipment_role: "app_partenza" | "app_arrivo";
  inca_status_code: IncaStatusCode | null;
  inca_status_label: string;
  open_blocker_count: number;
  open_priority_count: number;
  risk_reasons: string[];
}

export interface EquipmentSummary {
  equipment_code: string;
  total_cables: number;
  incoming_cables: number;
  outgoing_cables: number;
  status_distribution: Record<string, number>;
  confirmed_by_field: number;
  without_field_evidence: number;
  open_blockers: number;
  open_priorities: number;
  completion_rate: number;
  risk_level: EquipmentRiskLevel;
  risk_reasons: string[];
  recommended_actions: string[];
}

export interface EquipmentStoryVM {
  equipment_code: string;
  summary: EquipmentSummary;
  incoming: EquipmentLinkedCable[];
  outgoing: EquipmentLinkedCable[];
  linked_cables: EquipmentLinkedCable[];
  field_evidence: EquipmentLinkedCable[];
  open_problems: EquipmentLinkedCable[];
}

export interface EquipmentBriefingContext {
  equipment: {
    code: string;
    total_cables: number;
    incoming_cables: number;
    outgoing_cables: number;
  };
  inca_status_distribution: Record<string, number>;
  field_evidence_summary: {
    confirmed_by_field: number;
    without_field_evidence: number;
    completion_rate: number;
  };
  risks: string[];
  unresolved_items: Array<{
    cable_code: string;
    direction: EquipmentCableDirection;
    inca_status: string;
    reason: string;
  }>;
  recommended_actions: string[];
  linked_cables: Array<{
    cable_code: string;
    direction: EquipmentCableDirection;
    status: string;
    confirmed_by_field: boolean;
    last_actor: string | null;
    last_evidence_at: string | null;
  }>;
}

export interface EquipmentImpactSummary {
  equipment_code: string;
  total_cables: number;
  confirmed_by_field: number;
  without_field_evidence: number;
  blocked: number;
  risk_level: EquipmentRiskLevel;
  risk_reasons: string[];
  cable_codes: string[];
}

export interface EquipmentGraphNode {
  equipment_code: string;
  equipment_name: string | null;
  equipment_type: string | null;
  zone: string | null;
  system: string | null;
  incoming_cables: string[];
  outgoing_cables: string[];
  related_equipments: string[];
}

export interface CriticalPathCable {
  cable_code: string;
  reason: string;
  status: string;
  other_equipment_code: string | null;
}

export interface EquipmentIntelligence {
  equipment_code: string;
  equipment_name: string | null;
  equipment_type: string | null;
  zone: string | null;
  system: string | null;
  total_cables: number;
  confirmed_cables: number;
  open_cables: number;
  blocked_cables: number;
  ai_validation_required: number;
  ai_incoherences: number;
  incoming_cables: string[];
  outgoing_cables: string[];
  related_equipments: string[];
  closure_status: EquipmentClosureStatus;
  completion_rate: number;
  risk_level: EquipmentRiskLevel;
  risk_reasons: string[];
  without_field_evidence: number;
  status_distribution: Record<string, number>;
  recommended_actions: string[];
  critical_path: CriticalPathCable[];
}

export interface SystemClosure {
  system: string;
  zone: string | null;
  total_equipments: number;
  closed_equipments: number;
  open_equipments: number;
  blocked_equipments: number;
  closure_status: SystemClosureStatus;
  completion_rate: number;
  critical_path: CriticalPathCable[];
  equipment_codes: string[];
}

export interface TelegramImpact {
  message_id: string;
  message_ts: string | null;
  text: string | null;
  cable_code: string;
  equipment_codes: string[];
  systems: string[];
  before_label: string;
  after_label: string;
  system_closed: boolean;
}

export interface EquipmentIntelligenceDashboard {
  import_id: string | null;
  list_date: string | null;
  file_name: string | null;
  total_systems: number;
  closed_systems: number;
  blocked_systems: number;
  total_equipments: number;
  closed_equipments: number;
  blocked_equipments: number;
  systems: SystemClosure[];
  equipments: EquipmentIntelligence[];
  telegram_impacts: TelegramImpact[];
}
