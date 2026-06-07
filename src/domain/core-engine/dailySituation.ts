import { ensureArray } from "../../core/utils/array";
import { translateIncaStatus } from "./incaStatus";
import {
  buildSdcCableLookup,
  findSdcCableRecord,
  getDisplayCableCode,
  type SdcCableLookup,
} from "./sdc";
import type { ApparatusClosureView, FieldEvidenceView, TodayWorkView } from "./coreEngine";

export interface DailySituationToVerifyCable {
  cableCode: string;
  displayCableCode: string;
  area?: string | null;
  apparatusCode: string | null;
  system: string | null;
  reason: string;
}

export interface DailySituationRealBlocker {
  cableCode: string;
  displayCableCode: string;
  area?: string | null;
  apparatusCode: string | null;
  system: string | null;
  reason: string;
}

export interface DailySituationFieldEvidenceGroup {
  source: string;
  timestamp: string | null;
  cableCodes: string[];
  count: number;
  summary: string;
}

export interface DailySituationView {
  date: string;
  situationDate: string;
  listDate: string | null;
  listName: string | null;
  totals: {
    totalCables: number;
    verifiedCables: number;
    remainingCables: number;
    blockedCables: number;
    withoutFieldEvidence: number;
    toVerifyCables: number;
  };
  toVerifyCables: DailySituationToVerifyCable[];
  realBlockers: DailySituationRealBlocker[];
  fieldEvidenceGroups: DailySituationFieldEvidenceGroup[];
  blockers: DailySituationRealBlocker[];
  impactedApparatus: Array<{
    equipmentCode: string;
    area?: string | null;
    system: string | null;
    closureStatus: string;
    openCables: number;
    blockedCables: number;
    riskLevel: string | null;
  }>;
  impactedSystems: Array<{
    systemName: string;
    status: string;
    openEquipments: number;
    blockedEquipments: number;
  }>;
  fieldEvidenceToday: Array<{
    cableCode: string;
    source: string;
    timestamp: string | null;
    message: string | null;
  }>;
  telegramImpacts: Array<{
    cableCode: string;
    message: string;
    impact: string | null;
    timestamp: string | null;
  }>;
  recommendedActions: string[];
  messageToSend: string;
}

type DailySituationInput = {
  today: TodayWorkView;
  field: FieldEvidenceView;
  apparatus: ApparatusClosureView;
  sdc?: SdcCableLookup;
};

type FieldEvidenceCard = FieldEvidenceView["priority_items"][number];
type EquipmentSnapshot = ApparatusClosureView["equipments"][number];
type ResolvedEquipment = {
  equipmentCode: string;
  equipmentName: string | null;
  area: string | null;
  system: string | null;
  description: string | null;
  locale: string | null;
  source: "apparatus" | "sdc";
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function displayCableCode(value: string | null | undefined): string {
  return getDisplayCableCode(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dedupeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function extractSystemFromText(text: string | null | undefined): string | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  const upper = normalized.replace(/[’']/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  const match =
    upper.match(/\bRACK\s+[A-Z0-9]+\s+DATA\s+CENTER\s+C\d+\b/) ??
    upper.match(/\bRACK\s+[A-Z0-9]+\s+DATA\s+CENTER\b/) ??
    upper.match(/\bRACK\s+[A-Z0-9]+\b/);

  if (!match) return null;
  return titleCase(match[0]);
}

function isEswbsEquipmentCode(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{12}$/.test(value.trim());
}

function buildEquipmentIndex(
  equipments: EquipmentSnapshot[],
  sdcLookup: SdcCableLookup
): Map<string, ResolvedEquipment> {
  const index = new Map<string, ResolvedEquipment>();
  for (const equipment of ensureArray(equipments, "dailySituation.equipmentsIndex")) {
    const equipmentCode = normalizeText(equipment.equipment_code).toUpperCase();
    if (!isEswbsEquipmentCode(equipmentCode)) continue;
    index.set(equipmentCode, {
      equipmentCode,
      equipmentName: equipment.equipment_name ?? null,
      area: equipment.zone ?? null,
      system: equipment.system ?? null,
      description: equipment.equipment_name ?? equipment.equipment_code,
      locale: null,
      source: "apparatus",
    });
  }

  for (const [equipmentCode, master] of sdcLookup.equipmentMasterByCode.entries()) {
    const existing = index.get(equipmentCode);
    const next: ResolvedEquipment = {
      equipmentCode,
      equipmentName: existing?.equipmentName ?? master.description,
      area: existing?.area ?? master.area,
      system: existing?.system ?? master.system,
      description: existing?.description ?? master.description,
      locale: existing?.locale ?? master.locale,
      source: existing ? existing.source : "sdc",
    };
    index.set(equipmentCode, next);
  }
  return index;
}

function resolveSystemLabel(
  card: FieldEvidenceCard,
  equipmentIndex: Map<string, ResolvedEquipment>,
  sdcLookup: SdcCableLookup
): string {
  const record = findSdcCableRecord(sdcLookup, card.display_cable_code ?? card.cable_code_raw ?? card.cable_code);
  const fromNote =
    extractSystemFromText(record?.sistema) ??
    extractSystemFromText(card.note) ??
    extractSystemFromText(card.situazione_inca) ??
    extractSystemFromText(card.perimetro);
  if (fromNote) return fromNote;

  for (const code of [record?.appPartenza, record?.appArrivo, card.app_partenza, card.app_arrivo]) {
    if (!isNonEmptyString(code)) continue;
    const equipment = equipmentIndex.get(normalizeText(code).toUpperCase());
    if (equipment?.system) return titleCase(equipment.system);
  }

  return "Sistema non assegnato";
}

function resolveAreaLabel(
  card: FieldEvidenceCard,
  equipmentIndex: Map<string, ResolvedEquipment>,
  sdcLookup: SdcCableLookup
): string | null {
  const record = findSdcCableRecord(sdcLookup, card.display_cable_code ?? card.cable_code_raw ?? card.cable_code);

  const fromRecord = normalizeText(record?.area) || normalizeText(record?.locale);
  if (fromRecord) return fromRecord;

  for (const code of [record?.appPartenza, record?.appArrivo, card.app_partenza, card.app_arrivo]) {
    if (!isNonEmptyString(code)) continue;
    const equipment = equipmentIndex.get(normalizeText(code).toUpperCase());
    if (equipment?.area) return equipment.area;
  }

  return extractSystemFromText(card.note) || extractSystemFromText(card.perimetro) || null;
}

function resolveApparatusCode(
  card: FieldEvidenceCard,
  equipmentIndex: Map<string, ResolvedEquipment>,
  sdcLookup: SdcCableLookup
): string | null {
  const record = findSdcCableRecord(sdcLookup, card.display_cable_code ?? card.cable_code_raw ?? card.cable_code);
  for (const code of [record?.appPartenza, record?.appArrivo, card.app_partenza, card.app_arrivo]) {
    if (!isEswbsEquipmentCode(code)) continue;
    const equipment = equipmentIndex.get(code.trim().toUpperCase());
    if (equipment) return equipment.equipmentCode;
  }
  return isEswbsEquipmentCode(card.app_partenza) ? card.app_partenza.trim().toUpperCase() : isEswbsEquipmentCode(card.app_arrivo) ? card.app_arrivo.trim().toUpperCase() : null;
}

function buildSituationDate(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildListDate(input: DailySituationInput): string | null {
  return (
    formatDateOnly(input.today.summary?.list_date) ??
    formatDateOnly(input.field.summary?.list_date) ??
    formatDateOnly(input.today.latest_import?.list_date)
  );
}

function buildListName(input: DailySituationInput): string | null {
  return input.today.summary?.file_name ?? input.today.latest_import?.file_name ?? input.field.summary?.file_name ?? null;
}

function isRealBlocker(card: FieldEvidenceCard): boolean {
  const status = translateIncaStatus(card.situazione_inca ?? card.stato_collegamento);
  return status.status === "BLOCCATO" || card.computed_status === "blocked";
}

function buildToVerifyCables(
  input: DailySituationInput,
  equipmentIndex: Map<string, ResolvedEquipment>,
  sdcLookup: SdcCableLookup
): DailySituationToVerifyCable[] {
  const cards = [
    ...ensureArray(input.field.missing_evidence_items, "dailySituation.toVerify.missing"),
    ...ensureArray(input.field.partial_items, "dailySituation.toVerify.partial"),
  ];

  const items = cards
    .filter((card) => !isRealBlocker(card))
    .map((card) => {
      const record = findSdcCableRecord(sdcLookup, card.display_cable_code ?? card.cable_code_raw ?? card.cable_code);
      const displayCode = record?.cableCodeOriginal || card.display_cable_code || displayCableCode(card.cable_code_raw ?? card.cable_code);
      const system = resolveSystemLabel(card, equipmentIndex, sdcLookup);
      const area = resolveAreaLabel(card, equipmentIndex, sdcLookup);
      const apparatusCode = resolveApparatusCode(card, equipmentIndex, sdcLookup);
      const reason =
        card.computed_status === "likely_laid"
          ? "posato probabile"
          : card.has_partial_progress
            ? "da verificare"
            : "senza prova campo";

      return {
        cableCode: card.cable_code,
        displayCableCode: displayCode,
        area,
        apparatusCode,
        system,
        reason,
      };
    });

  return dedupeBy(items, (item) => [item.cableCode, item.apparatusCode ?? "", item.system ?? "", item.reason].join("|"))
    .sort((left, right) => left.displayCableCode.localeCompare(right.displayCableCode));
}

function buildRealBlockers(
  input: DailySituationInput,
  equipmentIndex: Map<string, ResolvedEquipment>,
  sdcLookup: SdcCableLookup
): DailySituationRealBlocker[] {
  const blockers = ensureArray(input.field.blocked_items, "dailySituation.realBlockers");

  const items = blockers
    .map((card) => {
      const record = findSdcCableRecord(sdcLookup, card.display_cable_code ?? card.cable_code_raw ?? card.cable_code);
      const displayCode = record?.cableCodeOriginal || card.display_cable_code || displayCableCode(card.cable_code_raw ?? card.cable_code);
      const system = resolveSystemLabel(card, equipmentIndex, sdcLookup);
      const area = resolveAreaLabel(card, equipmentIndex, sdcLookup);
      const apparatusCode = resolveApparatusCode(card, equipmentIndex, sdcLookup);
      const status = translateIncaStatus(card.situazione_inca ?? card.stato_collegamento);
      const reason = status.status === "BLOCCATO" ? "INCA = B" : "finding critico";

      return {
        cableCode: card.cable_code,
        displayCableCode: displayCode,
        area,
        apparatusCode,
        system,
        reason,
      };
    })
    .filter((item) => item.reason.length > 0);

  return dedupeBy(items, (item) => [item.cableCode, item.apparatusCode ?? "", item.system ?? "", item.reason].join("|"))
    .sort((left, right) => left.displayCableCode.localeCompare(right.displayCableCode));
}

function buildFieldEvidenceGroups(input: DailySituationInput): DailySituationFieldEvidenceGroup[] {
  const grouped = new Map<string, { source: string; timestamp: string | null; cableCodes: Set<string> }>();

  for (const card of ensureArray(input.field.priority_items, "dailySituation.fieldEvidenceGroups.priority")) {
    const source = card.confirmed_by_whatsapp ? "WhatsApp" : normalizeText(card.last_actor) || "Campo";
    const timestamp = card.last_event_at ?? null;
    const key = `${source}|${timestamp ?? "null"}`;
    const current = grouped.get(key) ?? { source, timestamp, cableCodes: new Set<string>() };
    current.cableCodes.add(card.display_cable_code || displayCableCode(card.cable_code_raw ?? card.cable_code));
    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .map((group) => {
      const cableCodes = Array.from(group.cableCodes).sort((left, right) => left.localeCompare(right));
      const count = cableCodes.length;
      return {
        source: group.source,
        timestamp: group.timestamp,
        cableCodes,
        count,
        summary: `${count} cavi riconosciuti`,
      };
    })
    .sort((left, right) => {
      if (left.timestamp === right.timestamp) return left.source.localeCompare(right.source);
      if (!left.timestamp) return 1;
      if (!right.timestamp) return -1;
      return right.timestamp.localeCompare(left.timestamp);
    });
}

function buildTelegramImpacts(input: DailySituationInput): DailySituationView["telegramImpacts"] {
  return ensureArray(input.today.telegram_impacts, "dailySituation.telegramImpacts")
    .map((impact) => ({
      cableCode: displayCableCode(impact.cable_codes[0] ?? "Senza cavo"),
      message: normalizeText(impact.text) || `${impact.before_label} → ${impact.after_label}`,
      impact: impact.system_closed ? "SYSTEM CLOSED" : `${impact.before_label} → ${impact.after_label}`,
      timestamp: impact.message_ts,
    }))
    .sort((left, right) => {
      if (left.timestamp === right.timestamp) return left.cableCode.localeCompare(right.cableCode);
      if (!left.timestamp) return 1;
      if (!right.timestamp) return -1;
      return right.timestamp.localeCompare(left.timestamp);
    });
}

function buildImpactedApparatus(input: DailySituationInput): DailySituationView["impactedApparatus"] {
  return ensureArray(input.apparatus.equipments, "dailySituation.impactedApparatus")
    .filter((equipment) => equipment.closure_status !== "CLOSED" || equipment.blocked_cables > 0 || equipment.open_cables > 0)
    .map((equipment) => ({
      equipmentCode: equipment.equipment_code,
      area: equipment.zone ?? null,
      system: equipment.system,
      closureStatus: equipment.closure_status,
      openCables: equipment.open_cables,
      blockedCables: equipment.blocked_cables,
      riskLevel: equipment.risk_level,
    }))
    .sort((left, right) => {
      if (right.blockedCables !== left.blockedCables) return right.blockedCables - left.blockedCables;
      if (right.openCables !== left.openCables) return right.openCables - left.openCables;
      return left.equipmentCode.localeCompare(right.equipmentCode);
    });
}

function buildImpactedSystems(input: DailySituationInput): DailySituationView["impactedSystems"] {
  return ensureArray(input.apparatus.systems, "dailySituation.impactedSystems")
    .filter((system) => system.closure_status !== "CLOSED" || system.blocked_equipments > 0 || system.open_equipments > 0)
    .map((system) => ({
      systemName: system.system,
      status: system.closure_status,
      openEquipments: system.open_equipments,
      blockedEquipments: system.blocked_equipments,
    }))
    .sort((left, right) => {
      if (right.blockedEquipments !== left.blockedEquipments) return right.blockedEquipments - left.blockedEquipments;
      if (right.openEquipments !== left.openEquipments) return right.openEquipments - left.openEquipments;
      return left.systemName.localeCompare(right.systemName);
    });
}

function buildRecommendedActions(
  toVerifyCables: DailySituationToVerifyCable[],
  realBlockers: DailySituationRealBlocker[],
  impactedApparatus: DailySituationView["impactedApparatus"],
  fieldEvidenceGroups: DailySituationFieldEvidenceGroup[]
): string[] {
  const actions: string[] = [];

  if (toVerifyCables.length > 0) actions.push("completare verifiche campo sui cavi restanti");
  if (impactedApparatus.length > 0) actions.push("verificare apparati non chiusi");
  if (realBlockers.length > 0) actions.push("risolvere i bloccanti reali");
  if (fieldEvidenceGroups.length > 0) actions.push("allineare le prove campo con Telegram");

  return dedupeBy(actions, (action) => action);
}

function formatCableList(items: Array<{ displayCableCode: string; area?: string | null; system: string | null; reason?: string }>): string[] {
  if (items.length === 0) return ["- Nessun dato disponibile"];
  return items.map((item) => {
    const pieces = [item.displayCableCode];
    if (item.area) pieces.push(item.area);
    if (item.system) pieces.push(item.system);
    if (item.reason) pieces.push(item.reason);
    return `- ${pieces.join(" — ")}`;
  });
}

function formatEvidenceList(groups: DailySituationFieldEvidenceGroup[]): string[] {
  if (groups.length === 0) return ["- Nessuna prova campo disponibile"];
  return groups.map((group) => {
    const time = formatTime(group.timestamp);
    const head = `${time ?? "--:--"} — ${group.source} — ${group.summary}`;
    return `${head}: ${group.cableCodes.join(", ")}`;
  });
}

function buildMessageToSend(situation: DailySituationView): string {
  const lines = [
    "SITUAZIONE ORE 16:30",
    "",
    `Data situazione: ${situation.situationDate}`,
    `Data lista: ${situation.listDate ?? "N/D"}`,
    `Lista: ${situation.listName ?? "N/D"}`,
    "",
    `Totale cavi: ${situation.totals.totalCables}`,
    `Verificati campo: ${situation.totals.verifiedCables}`,
    `Da verificare: ${situation.totals.toVerifyCables}`,
    `Bloccati INCA: ${situation.totals.blockedCables}`,
    "",
    "Cavi da verificare:",
    ...formatCableList(situation.toVerifyCables.map((item) => ({
      displayCableCode: item.displayCableCode,
      area: item.area,
      system: item.system,
    }))),
    "",
    "Apparati non chiusi:",
    ...formatCableList(situation.impactedApparatus.map((item) => ({
      displayCableCode: item.equipmentCode,
      area: item.area,
      system: item.system,
      reason: `${item.openCables} aperti`,
    }))),
    "",
    "Bloccanti reali:",
    ...(situation.realBlockers.length > 0
      ? formatCableList(situation.realBlockers.map((item) => ({
          displayCableCode: item.displayCableCode,
          system: item.system,
          reason: item.reason,
        })))
      : ["Nessun bloccante INCA dichiarato."]),
    "",
    "Prove campo:",
    ...formatEvidenceList(situation.fieldEvidenceGroups),
    "",
    "Azioni:",
    ...(situation.recommendedActions.length > 0
      ? situation.recommendedActions.map((action) => `- ${action}`)
      : ["- Nessuna azione proposta"]),
  ];

  return lines.join("\n");
}

export function buildDailySituationView(input: DailySituationInput): DailySituationView {
  const sdcLookup = input.sdc ?? buildSdcCableLookup([
    ...ensureArray(input.field.priority_items, "dailySituation.sdc.priority"),
    ...ensureArray(input.field.missing_evidence_items, "dailySituation.sdc.missing"),
    ...ensureArray(input.field.partial_items, "dailySituation.sdc.partial"),
    ...ensureArray(input.field.blocked_items, "dailySituation.sdc.blocked"),
  ]);
  const equipmentIndex = buildEquipmentIndex(input.apparatus.equipments, sdcLookup);
  const toVerifyCables = buildToVerifyCables(input, equipmentIndex, sdcLookup);
  const realBlockers = buildRealBlockers(input, equipmentIndex, sdcLookup);
  const fieldEvidenceGroups = buildFieldEvidenceGroups(input);
  const impactedApparatus = buildImpactedApparatus(input);
  const impactedSystems = buildImpactedSystems(input);
  const telegramImpacts = buildTelegramImpacts(input);
  const recommendedActions = buildRecommendedActions(toVerifyCables, realBlockers, impactedApparatus, fieldEvidenceGroups);
  const listDate = buildListDate(input);
  const situationDate = buildSituationDate();

  const situation: DailySituationView = {
    date: situationDate,
    situationDate,
    listDate,
    listName: buildListName(input),
    totals: {
      totalCables: input.today.metrics.total_cables,
      verifiedCables: input.today.metrics.confirmed_cables,
      remainingCables: input.today.metrics.remaining_cables,
      blockedCables: realBlockers.length,
      withoutFieldEvidence: toVerifyCables.filter((item) => item.reason === "senza prova campo").length,
      toVerifyCables: toVerifyCables.length,
    },
    toVerifyCables,
    realBlockers,
    fieldEvidenceGroups,
    blockers: realBlockers,
    impactedApparatus,
    impactedSystems,
    fieldEvidenceToday: fieldEvidenceGroups.map((group) => ({
      cableCode: group.cableCodes[0] ?? "",
      source: group.source,
      timestamp: group.timestamp,
      message: group.summary,
    })),
    telegramImpacts,
    recommendedActions,
    messageToSend: "",
  };

  return {
    ...situation,
    messageToSend: buildMessageToSend(situation),
  };
}
