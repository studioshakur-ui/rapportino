import type { DailyListItemVM } from "../daily-lists/dailyLists.types";
import type { IncaStatusCode } from "../../core/inca/statusDictionary";

export type EquipmentCableDirection = "outgoing" | "incoming";
export type EquipmentRiskLevel = "low" | "medium" | "high" | "critical";

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
