import type { DailyListItemVM } from "../daily-lists/dailyLists.types";
import type {
  CriticalPathCable,
  EquipmentClosureStatus,
  EquipmentGraphNode,
  EquipmentIntelligence,
  EquipmentRiskLevel,
  SystemClosure,
  TelegramImpact,
} from "./equipment.types";

interface IncaEquipmentMeta {
  apparato_a: string | null;
  apparato_da: string | null;
  descrizione_a: string | null;
  descrizione_da: string | null;
  impianto: string | null;
  sezione: string | null;
  tipo: string | null;
  zona_a: string | null;
  zona_da: string | null;
}

interface CablePriorityMeta {
  count: number;
  highest: EquipmentRiskLevel | null;
}

export interface EquipmentIntelligenceSource {
  item: DailyListItemVM;
  inca: IncaEquipmentMeta | null;
  priority: CablePriorityMeta | undefined;
}

const ESWBS_CODE_RE = /^\d{12}$/;

function normalizeEquipmentCode(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeEswbsEquipmentCode(value: string | null | undefined): string | null {
  const normalized = normalizeEquipmentCode(value);
  if (!normalized) return null;
  return ESWBS_CODE_RE.test(normalized) ? normalized : null;
}

function buildMetaForRole(
  item: DailyListItemVM,
  inca: IncaEquipmentMeta | null,
  role: "app_partenza" | "app_arrivo"
): Pick<EquipmentGraphNode, "equipment_code" | "equipment_name" | "equipment_type" | "zone" | "system"> | null {
  const equipmentCode = normalizeEswbsEquipmentCode(
    role === "app_partenza"
      ? item.app_partenza ?? inca?.apparato_da
      : item.app_arrivo ?? inca?.apparato_a
  );
  if (!equipmentCode) return null;

  const equipmentName = role === "app_partenza"
    ? inca?.descrizione_da ?? inca?.apparato_da ?? equipmentCode
    : inca?.descrizione_a ?? inca?.apparato_a ?? equipmentCode;
  const zone = role === "app_partenza"
    ? inca?.zona_da ?? item.perimetro ?? null
    : inca?.zona_a ?? item.perimetro ?? null;

  return {
    equipment_code: equipmentCode,
    equipment_name: equipmentName,
    equipment_type: inca?.tipo ?? inca?.sezione ?? "ESWBS",
    zone,
    system: inca?.impianto ?? null,
  };
}

function isCableConfirmed(item: DailyListItemVM): boolean {
  return item.computed_status === "confirmed_field" || item.computed_status === "likely_laid";
}

function isCableBlocked(item: DailyListItemVM): boolean {
  return item.computed_status === "blocked" || item.situazione_inca === "B";
}

function buildCableReason(item: DailyListItemVM): string {
  if (item.situazione_inca === "B") return "INCA B";
  if (item.computed_status === "blocked") return "finding critique";
  if (item.has_missing_issue) return "cable manquant";
  if (item.has_short_issue) return "cable court";
  if (item.has_partial_progress) return "progression partielle";
  if (item.missing_evidence) return "sans preuve";
  return "non confirme";
}

function toCriticalPathCable(
  item: DailyListItemVM,
  currentEquipmentCode: string
): CriticalPathCable {
  const currentPartenza = normalizeEswbsEquipmentCode(item.app_partenza);
  const otherEquipmentCode = normalizeEswbsEquipmentCode(
    currentPartenza === currentEquipmentCode ? item.app_arrivo : item.app_partenza
  );

  return {
    cable_code: item.cable_code_normalized,
    reason: buildCableReason(item),
    status: item.computed_status,
    other_equipment_code: otherEquipmentCode || null,
  };
}

function computeRiskLevel(args: {
  blocked: number;
  open: number;
  noEvidence: number;
  highPriority: number;
  criticalPriority: number;
}): EquipmentRiskLevel {
  if (args.blocked > 0 || args.criticalPriority > 0) return "critical";
  if (args.highPriority > 0 || args.noEvidence >= 2 || args.open >= 3) return "high";
  if (args.noEvidence > 0 || args.open > 0) return "medium";
  return "low";
}

export function buildEquipmentGraph(
  sources: EquipmentIntelligenceSource[]
): EquipmentGraphNode[] {
  const graph = new Map<string, EquipmentGraphNode>();

  for (const source of sources) {
    const outgoing = buildMetaForRole(source.item, source.inca, "app_partenza");
    const incoming = buildMetaForRole(source.item, source.inca, "app_arrivo");

    for (const [meta, direction] of [
      [outgoing, "outgoing"] as const,
      [incoming, "incoming"] as const,
    ]) {
      if (!meta) continue;
      const existing = graph.get(meta.equipment_code) ?? {
        ...meta,
        incoming_cables: [],
        outgoing_cables: [],
        related_equipments: [],
      };

      existing.equipment_name = existing.equipment_name ?? meta.equipment_name;
      existing.equipment_type = existing.equipment_type ?? meta.equipment_type;
      existing.zone = existing.zone ?? meta.zone;
      existing.system = existing.system ?? meta.system;

      const cableList = direction === "incoming" ? existing.incoming_cables : existing.outgoing_cables;
      if (!cableList.includes(source.item.cable_code_normalized)) {
        cableList.push(source.item.cable_code_normalized);
      }

      const related = normalizeEquipmentCode(
        direction === "incoming"
          ? (normalizeEswbsEquipmentCode(source.item.app_partenza) ?? "")
          : (normalizeEswbsEquipmentCode(source.item.app_arrivo) ?? "")
      );
      if (related && related !== meta.equipment_code && !existing.related_equipments.includes(related)) {
        existing.related_equipments.push(related);
      }

      graph.set(meta.equipment_code, existing);
    }
  }

  return Array.from(graph.values()).sort((left, right) => left.equipment_code.localeCompare(right.equipment_code));
}

export function buildEquipmentIntelligence(
  sources: EquipmentIntelligenceSource[]
): EquipmentIntelligence[] {
  const groups = new Map<string, EquipmentIntelligenceSource[]>();
  const graph = new Map(buildEquipmentGraph(sources).map((node) => [node.equipment_code, node]));

  for (const source of sources) {
    for (const equipmentCode of [source.item.app_partenza, source.item.app_arrivo].map(normalizeEswbsEquipmentCode)) {
      if (!equipmentCode) continue;
      const list = groups.get(equipmentCode) ?? [];
      list.push(source);
      groups.set(equipmentCode, list);
    }
  }

  return Array.from(groups.entries())
    .map(([equipmentCode, relatedSources]) => {
      const uniqueCables = new Map<string, EquipmentIntelligenceSource>();
      for (const source of relatedSources) {
        uniqueCables.set(source.item.cable_code_normalized, source);
      }

      const cables = Array.from(uniqueCables.values());
      const confirmed = cables.filter((entry) => isCableConfirmed(entry.item)).length;
      const blocked = cables.filter((entry) => isCableBlocked(entry.item)).length;
      const open = Math.max(cables.length - confirmed, 0);
      const noEvidence = cables.filter((entry) => entry.item.missing_evidence).length;
      const highPriority = cables.filter((entry) => entry.priority?.highest === "high").length;
      const criticalPriority = cables.filter((entry) => entry.priority?.highest === "critical").length;

      let closureStatus: EquipmentClosureStatus = "OPEN";
      if (blocked > 0) {
        closureStatus = "BLOCKED";
      } else if (cables.length > 0 && confirmed === cables.length) {
        closureStatus = "CLOSED";
      } else if (confirmed > 0) {
        closureStatus = "PARTIAL";
      }

      const criticalPath = cables
        .filter((entry) => !isCableConfirmed(entry.item) || isCableBlocked(entry.item))
        .sort((left, right) => {
          const leftBlocked = isCableBlocked(left.item) ? 1 : 0;
          const rightBlocked = isCableBlocked(right.item) ? 1 : 0;
          if (leftBlocked !== rightBlocked) return rightBlocked - leftBlocked;
          return left.item.cable_code_normalized.localeCompare(right.item.cable_code_normalized);
        })
        .map((entry) => toCriticalPathCable(entry.item, equipmentCode));

      const riskLevel = computeRiskLevel({
        blocked,
        open,
        noEvidence,
        highPriority,
        criticalPriority,
      });

      const graphNode = graph.get(equipmentCode);
      const riskReasons = Array.from(new Set(criticalPath.map((item) => item.reason))).slice(0, 6);

      return {
        equipment_code: equipmentCode,
        equipment_name: graphNode?.equipment_name ?? null,
        equipment_type: graphNode?.equipment_type ?? null,
        zone: graphNode?.zone ?? null,
        system: graphNode?.system ?? "SYSTEM UNASSIGNED",
        total_cables: cables.length,
        confirmed_cables: confirmed,
        open_cables: open,
        blocked_cables: blocked,
        incoming_cables: graphNode?.incoming_cables ?? [],
        outgoing_cables: graphNode?.outgoing_cables ?? [],
        related_equipments: graphNode?.related_equipments ?? [],
        closure_status: closureStatus,
        completion_rate: cables.length > 0 ? Math.round((confirmed / cables.length) * 100) : 0,
        risk_level: riskLevel,
        risk_reasons: riskReasons,
        critical_path: criticalPath,
      };
    })
    .sort((left, right) => {
      const order: Record<EquipmentClosureStatus, number> = {
        BLOCKED: 0,
        OPEN: 1,
        PARTIAL: 2,
        CLOSED: 3,
      };
      if (order[left.closure_status] !== order[right.closure_status]) {
        return order[left.closure_status] - order[right.closure_status];
      }
      return right.open_cables - left.open_cables || left.equipment_code.localeCompare(right.equipment_code);
    });
}

export function buildSystemClosures(
  equipments: EquipmentIntelligence[]
): SystemClosure[] {
  const groups = new Map<string, EquipmentIntelligence[]>();

  for (const equipment of equipments) {
    const key = equipment.system ?? "SYSTEM UNASSIGNED";
    const list = groups.get(key) ?? [];
    list.push(equipment);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .map(([system, list]) => {
      const closed = list.filter((equipment) => equipment.closure_status === "CLOSED").length;
      const blocked = list.filter((equipment) => equipment.closure_status === "BLOCKED").length;
      const open = list.length - closed;
      let closureStatus: EquipmentClosureStatus = "OPEN";

      if (blocked > 0) {
        closureStatus = "BLOCKED";
      } else if (list.length > 0 && closed === list.length) {
        closureStatus = "CLOSED";
      } else if (closed > 0) {
        closureStatus = "PARTIAL";
      }

      const criticalPath = list
        .filter((equipment) => equipment.closure_status !== "CLOSED")
        .flatMap((equipment) => equipment.critical_path)
        .slice(0, 8);

      return {
        system,
        zone: list.map((equipment) => equipment.zone).find(Boolean) ?? null,
        total_equipments: list.length,
        closed_equipments: closed,
        open_equipments: open,
        blocked_equipments: blocked,
        closure_status: closureStatus,
        completion_rate: list.length > 0 ? Math.round((closed / list.length) * 100) : 0,
        critical_path: criticalPath,
        equipment_codes: list.map((equipment) => equipment.equipment_code),
      };
    })
    .sort((left, right) => {
      const order: Record<EquipmentClosureStatus, number> = {
        BLOCKED: 0,
        OPEN: 1,
        PARTIAL: 2,
        CLOSED: 3,
      };
      if (order[left.closure_status] !== order[right.closure_status]) {
        return order[left.closure_status] - order[right.closure_status];
      }
      return right.open_equipments - left.open_equipments || left.system.localeCompare(right.system);
    });
}

function messageLooksPositive(text: string | null): boolean {
  return /\b(ok|done|fait|chiuso|close|100%)\b/i.test(text ?? "");
}

export function buildTelegramImpacts(
  messages: Array<{
    id: string;
    message_ts: string | null;
    text: string | null;
    cable_refs: string[];
  }>,
  equipments: EquipmentIntelligence[],
  systems: SystemClosure[]
): TelegramImpact[] {
  const equipmentByCable = new Map<string, EquipmentIntelligence[]>();
  const systemByName = new Map(systems.map((system) => [system.system, system]));

  for (const equipment of equipments) {
    for (const cable of [...equipment.incoming_cables, ...equipment.outgoing_cables]) {
      const list = equipmentByCable.get(cable) ?? [];
      list.push(equipment);
      equipmentByCable.set(cable, list);
    }
  }

  return messages
    .flatMap((message) => {
      const positive = messageLooksPositive(message.text);
      return message.cable_refs.map((cableCode) => {
        const impactedEquipments = equipmentByCable.get(cableCode) ?? [];
        if (impactedEquipments.length === 0) return null;

        const systemsTouched = Array.from(new Set(impactedEquipments.map((equipment) => equipment.system ?? "SYSTEM UNASSIGNED")));
        const beforeSystem = systemsTouched
          .map((name) => systemByName.get(name))
          .filter((system): system is SystemClosure => Boolean(system))
          .find((system) => system.closure_status !== "CLOSED");

        const closingEquipments = impactedEquipments.filter((equipment) => equipment.open_cables === 1 && equipment.blocked_cables === 0).length;
        const afterSystemClosed = Boolean(
          positive
          && beforeSystem
          && beforeSystem.closed_equipments + closingEquipments >= beforeSystem.total_equipments
        );

        const beforeLabel = beforeSystem
          ? `${beforeSystem.system} ${beforeSystem.closed_equipments}/${beforeSystem.total_equipments}`
          : systemsTouched[0] ?? "SYSTEM UNASSIGNED";
        const afterLabel = beforeSystem && positive
          ? `${beforeSystem.system} ${Math.min(beforeSystem.total_equipments, beforeSystem.closed_equipments + closingEquipments)}/${beforeSystem.total_equipments}`
          : beforeLabel;

        return {
          message_id: message.id,
          message_ts: message.message_ts,
          text: message.text,
          cable_code: cableCode,
          equipment_codes: impactedEquipments.map((equipment) => equipment.equipment_code),
          systems: systemsTouched,
          before_label: beforeLabel,
          after_label: afterLabel,
          system_closed: afterSystemClosed,
        } satisfies TelegramImpact;
      });
    })
    .filter((impact): impact is TelegramImpact => Boolean(impact))
    .slice(0, 12);
}
