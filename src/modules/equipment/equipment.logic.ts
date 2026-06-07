import { getIncaStatusDefinition, formatIncaStatus } from "../../core/inca/statusDictionary";
import type { DailyListItemVM } from "../daily-lists/dailyLists.types";
import type { EquipmentBriefingContext, EquipmentImpactSummary, EquipmentLinkedCable, EquipmentRiskLevel, EquipmentStoryVM, EquipmentSummary } from "./equipment.types";

const RISK_RANK: Record<EquipmentRiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function buildEquipmentStory(
  equipmentCode: string,
  cables: EquipmentLinkedCable[]
): EquipmentStoryVM {
  const linked = [...cables].sort((left, right) =>
    left.direction.localeCompare(right.direction) ||
    left.cable_code_normalized.localeCompare(right.cable_code_normalized)
  );
  const summary = buildEquipmentSummary(equipmentCode, linked);

  return {
    equipment_code: equipmentCode,
    summary,
    incoming: linked.filter((cable) => cable.direction === "incoming"),
    outgoing: linked.filter((cable) => cable.direction === "outgoing"),
    linked_cables: linked,
    field_evidence: linked.filter((cable) => cable.confirmed_by_whatsapp || cable.evidence_count > 0),
    open_problems: linked.filter((cable) => cable.risk_reasons.length > 0),
  };
}

export function enrichEquipmentCable(cable: EquipmentLinkedCable): EquipmentLinkedCable {
  const statusDefinition = getIncaStatusDefinition(cable.situazione_inca ?? cable.stato_collegamento);
  const riskReasons = buildCableRiskReasons(cable);

  return {
    ...cable,
    inca_status_code: statusDefinition?.code ?? null,
    inca_status_label: formatIncaStatus(cable.situazione_inca ?? cable.stato_collegamento),
    risk_reasons: riskReasons,
  };
}

export function buildEquipmentSummary(
  equipmentCode: string,
  cables: EquipmentLinkedCable[]
): EquipmentSummary {
  const statusDistribution: Record<string, number> = {};
  let openBlockers = 0;
  let openPriorities = 0;
  const allRiskReasons: string[] = [];

  for (const cable of cables) {
    const statusKey = cable.inca_status_code ?? "unknown";
    statusDistribution[statusKey] = (statusDistribution[statusKey] ?? 0) + 1;
    openBlockers += cable.open_blocker_count;
    openPriorities += cable.open_priority_count;
    allRiskReasons.push(...cable.risk_reasons);
  }

  const confirmedByField = cables.filter((cable) => isFieldConfirmed(cable)).length;
  const withoutFieldEvidence = cables.filter((cable) => cable.missing_evidence).length;
  const completionRate = cables.length > 0 ? Math.round((confirmedByField / cables.length) * 100) : 0;
  const riskLevel = computeRiskLevel({
    completionRate,
    openBlockers,
    openPriorities,
    withoutFieldEvidence,
    riskReasons: allRiskReasons,
  });

  return {
    equipment_code: equipmentCode,
    total_cables: cables.length,
    incoming_cables: cables.filter((cable) => cable.direction === "incoming").length,
    outgoing_cables: cables.filter((cable) => cable.direction === "outgoing").length,
    status_distribution: statusDistribution,
    confirmed_by_field: confirmedByField,
    without_field_evidence: withoutFieldEvidence,
    open_blockers: openBlockers,
    open_priorities: openPriorities,
    completion_rate: completionRate,
    risk_level: riskLevel,
    risk_reasons: Array.from(new Set(allRiskReasons)).slice(0, 8),
    recommended_actions: buildEquipmentActions(cables, riskLevel),
  };
}

export function isFieldConfirmed(cable: EquipmentLinkedCable): boolean {
  if (cable.confirmed_by_whatsapp && cable.progress_percent === null) return true;
  if (cable.progress_percent !== null && cable.progress_percent >= 100) return true;
  return cable.evidence.some((evidence) => {
    const pct = evidence.progress_percent;
    return evidence.event_kind === "CABLE_POSATO" && (pct === null || pct >= 100);
  });
}

function buildCableRiskReasons(cable: EquipmentLinkedCable): string[] {
  const reasons: string[] = [];
  const status = getIncaStatusDefinition(cable.situazione_inca ?? cable.stato_collegamento);

  if (status?.code === "B") reasons.push("INCA bloccato");
  if (status?.code === "P" && cable.missing_evidence) reasons.push("Posato INCA non confermato sul terreno");
  if (cable.has_short_issue) reasons.push("Segnale cavo corto");
  if (cable.has_missing_issue) reasons.push("Segnale cavo mancante");
  if (cable.has_partial_progress) reasons.push("Progressione parziale");
  if (cable.open_blocker_count > 0) reasons.push("Anomalia bloccante aperta");
  if (cable.open_priority_count > 0) reasons.push("Priorità aperta");
  if (/blocc|bloqu/i.test(cable.last_message ?? cable.note ?? "")) reasons.push("Messaggio terreno bloccante");

  return Array.from(new Set(reasons));
}

function computeRiskLevel(args: {
  completionRate: number;
  openBlockers: number;
  openPriorities: number;
  withoutFieldEvidence: number;
  riskReasons: string[];
}): EquipmentRiskLevel {
  let risk: EquipmentRiskLevel = "low";
  if (args.withoutFieldEvidence > 0 || args.openPriorities > 0 || args.completionRate < 80) risk = "medium";
  if (args.openBlockers > 0 || args.riskReasons.some((reason) => /court|manquant|bloqu/i.test(reason))) risk = "high";
  if (args.openBlockers >= 2 || args.completionRate < 40) risk = "critical";
  return risk;
}

function buildEquipmentActions(cables: EquipmentLinkedCable[], riskLevel: EquipmentRiskLevel): string[] {
  const actions: string[] = [];
  const noEvidence = cables.filter((cable) => cable.missing_evidence);
  const blocked = cables.filter((cable) => cable.inca_status_code === "B" || cable.open_blocker_count > 0);
  const partial = cables.filter((cable) => cable.has_partial_progress);
  const shortOrMissing = cables.filter((cable) => cable.has_short_issue || cable.has_missing_issue);

  if (blocked.length > 0) actions.push(`Sbloccare ${blocked.length} cav${blocked.length === 1 ? "o" : "i"} collegati`);
  if (shortOrMissing.length > 0) actions.push(`Controllare cavi corti/mancanti: ${shortOrMissing.slice(0, 5).map((cable) => cable.cable_code_normalized).join(", ")}`);
  if (noEvidence.length > 0) actions.push(`Richiedere evidenza terreno per ${noEvidence.length} cav${noEvidence.length === 1 ? "o" : "i"}`);
  if (partial.length > 0) actions.push("Confermare completamento delle progressioni parziali");
  if (RISK_RANK[riskLevel] >= RISK_RANK.high) actions.push("Inserire questa apparecchiatura nelle priorità del briefing cantiere");
  if (actions.length === 0) actions.push("Solo monitoraggio — nessun rischio aperto rilevato");

  return actions;
}

export function buildEquipmentBriefingContext(story: EquipmentStoryVM): EquipmentBriefingContext {
  return {
    equipment: {
      code: story.equipment_code,
      total_cables: story.summary.total_cables,
      incoming_cables: story.summary.incoming_cables,
      outgoing_cables: story.summary.outgoing_cables,
    },
    inca_status_distribution: story.summary.status_distribution,
    field_evidence_summary: {
      confirmed_by_field: story.summary.confirmed_by_field,
      without_field_evidence: story.summary.without_field_evidence,
      completion_rate: story.summary.completion_rate,
    },
    risks: story.summary.risk_reasons,
    unresolved_items: story.open_problems.map((cable) => ({
      cable_code: cable.cable_code_normalized,
      direction: cable.direction,
      inca_status: cable.inca_status_label,
      reason: cable.risk_reasons[0] ?? cable.recommended_action,
    })),
    recommended_actions: story.summary.recommended_actions,
    linked_cables: story.linked_cables.map((cable) => ({
      cable_code: cable.cable_code_normalized,
      direction: cable.direction,
      status: cable.computed_status,
      confirmed_by_field: isFieldConfirmed(cable),
      last_actor: cable.last_actor,
      last_evidence_at: cable.last_evidence_at,
    })),
  };
}

export function buildEquipmentImpactsFromDailyItems(items: DailyListItemVM[]): EquipmentImpactSummary[] {
  const map = new Map<string, DailyListItemVM[]>();

  for (const item of items) {
    for (const code of [item.app_partenza, item.app_arrivo]) {
      const key = String(code ?? "").trim().toUpperCase();
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
  }

  return Array.from(map.entries())
    .map(([equipmentCode, cables]) => {
      const blocked = cables.filter((cable) => {
        const status = getIncaStatusDefinition(cable.situazione_inca ?? cable.stato_collegamento);
        return status?.code === "B" || cable.computed_status === "blocked" || cable.has_short_issue || cable.has_missing_issue;
      }).length;
      const withoutFieldEvidence = cables.filter((cable) => cable.missing_evidence).length;
      const confirmedByField = cables.filter((cable) => cable.confirmed_by_whatsapp || cable.evidence_count > 0).length;
      const riskReasons = Array.from(new Set(cables.flatMap((cable) => {
        const reasons: string[] = [];
        const status = getIncaStatusDefinition(cable.situazione_inca ?? cable.stato_collegamento);
        if (status?.code === "B") reasons.push("INCA bloccato");
        if (status?.code === "P" && cable.missing_evidence) reasons.push("Posato INCA non confermato sul terreno");
        if (cable.has_short_issue) reasons.push("Cavo corto");
        if (cable.has_missing_issue) reasons.push("Cavo mancante");
        if (cable.has_partial_progress) reasons.push("Progressione parziale");
        return reasons;
      })));
      const riskLevel = computeRiskLevel({
        completionRate: cables.length > 0 ? Math.round((confirmedByField / cables.length) * 100) : 0,
        openBlockers: blocked,
        openPriorities: 0,
        withoutFieldEvidence,
        riskReasons,
      });

      return {
        equipment_code: equipmentCode,
        total_cables: cables.length,
        confirmed_by_field: confirmedByField,
        without_field_evidence: withoutFieldEvidence,
        blocked,
        risk_level: riskLevel,
        risk_reasons: riskReasons,
        cable_codes: cables.map((cable) => cable.cable_code_normalized),
      };
    })
    .sort((left, right) => {
      const riskDelta = RISK_RANK[right.risk_level] - RISK_RANK[left.risk_level];
      if (riskDelta !== 0) return riskDelta;
      return right.without_field_evidence - left.without_field_evidence || right.total_cables - left.total_cables;
    });
}
