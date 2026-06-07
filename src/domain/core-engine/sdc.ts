import { formatCableDisplay } from "../../core/cable/cableDisplay";
import { ensureArray } from "../../core/utils/array";
import { normalizeCableCode as normalizeCableCodeSource } from "../../features/core-command/agents/normalizer.agent";

export interface SdcCableLookupRow {
  cable_code_raw?: string | null;
  cable_code_normalized?: string | null;
  cable_code?: string | null;
  display_cable_code?: string | null;
  app_partenza?: string | null;
  app_arrivo?: string | null;
  perimetro?: string | null;
  sistema?: string | null;
  system?: string | null;
  sottosistema?: string | null;
  note?: string | null;
  locale?: string | null;
  area?: string | null;
  situazione_inca?: string | null;
  stato_collegamento?: string | null;
}

export interface SdcCableRecord {
  cableCodeOriginal: string;
  cableCodeNormalized: string;
  appPartenza: string | null;
  appArrivo: string | null;
  perimetro: string | null;
  sistema: string | null;
  sottosistema: string | null;
  statoInca: string | null;
  note: string | null;
  locale: string | null;
  area: string | null;
}

export interface SdcEquipmentMasterEntry {
  equipmentCode: string;
  description: string | null;
  locale: string | null;
  area: string | null;
  system: string | null;
  source: "app_partenza" | "app_arrivo" | "both";
}

export interface SdcEquipmentEdge {
  cableCodeOriginal: string;
  cableCodeNormalized: string;
  fromEquipment: string | null;
  toEquipment: string | null;
  statoInca: string | null;
  perimetro: string | null;
  area: string | null;
}

export interface SdcCableLookup {
  byNormalizedCode: Map<string, SdcCableRecord[]>;
  byOriginalCode: Map<string, SdcCableRecord[]>;
  equipmentMasterByCode: Map<string, SdcEquipmentMasterEntry>;
  equipmentEdges: SdcEquipmentEdge[];
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function isRealEquipmentCode(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{12}$/.test(value.trim());
}

function mergeText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) return text;
  }
  return null;
}

function deriveArea(row: SdcCableLookupRow): string | null {
  return mergeText(row.area, row.locale, row.perimetro, row.note);
}

function deriveSystem(row: SdcCableLookupRow): string | null {
  return mergeText(row.sistema, row.system, row.perimetro, row.note);
}

function compactCableKey(code: string): string {
  return normalizeCableCode(code).replace(/\s+/g, "").toUpperCase();
}

export function normalizeCableCode(raw: string): string {
  return normalizeCableCodeSource(raw);
}

export function getDisplayCableCode(code: string | null | undefined): string {
  return formatCableDisplay(code);
}

export function buildSdcCableLookup(rows: SdcCableLookupRow[]): SdcCableLookup {
  const byNormalizedCode = new Map<string, SdcCableRecord[]>();
  const byOriginalCode = new Map<string, SdcCableRecord[]>();
  const equipmentMasterByCode = new Map<string, SdcEquipmentMasterEntry>();
  const equipmentEdges: SdcEquipmentEdge[] = [];

  for (const row of ensureArray(rows, "coreEngine.sdc.rows")) {
    const cableCodeOriginal = getDisplayCableCode(
      row.display_cable_code ?? row.cable_code_raw ?? row.cable_code_normalized ?? row.cable_code
    );
    const cableCodeNormalized = normalizeCableCode(
      row.cable_code_normalized ?? row.cable_code_raw ?? row.cable_code ?? cableCodeOriginal
    );
    const record: SdcCableRecord = {
      cableCodeOriginal,
      cableCodeNormalized,
      appPartenza: normalizeText(row.app_partenza) || null,
      appArrivo: normalizeText(row.app_arrivo) || null,
      perimetro: normalizeText(row.perimetro) || null,
      sistema: deriveSystem(row),
      sottosistema: mergeText(row.sottosistema),
      statoInca: mergeText(row.situazione_inca, row.stato_collegamento),
      note: mergeText(row.note),
      locale: mergeText(row.locale),
      area: deriveArea(row),
    };

    const normalizedList = byNormalizedCode.get(record.cableCodeNormalized) ?? [];
    normalizedList.push(record);
    byNormalizedCode.set(record.cableCodeNormalized, normalizedList);

    const originalList = byOriginalCode.get(record.cableCodeOriginal) ?? [];
    originalList.push(record);
    byOriginalCode.set(record.cableCodeOriginal, originalList);

    const equipmentSources: Array<["app_partenza" | "app_arrivo", string | null | undefined]> = [
      ["app_partenza", record.appPartenza],
      ["app_arrivo", record.appArrivo],
    ];

    for (const [source, equipmentCode] of equipmentSources) {
      if (!isRealEquipmentCode(equipmentCode)) continue;

      const existing = equipmentMasterByCode.get(equipmentCode);
      const next: SdcEquipmentMasterEntry = {
        equipmentCode,
        description: mergeText(row.note, row.perimetro, row.sottosistema, row.sistema, row.system),
        locale: record.locale,
        area: record.area,
        system: record.sistema,
        source: source === "app_partenza" ? "app_partenza" : "app_arrivo",
      };

      if (!existing) {
        equipmentMasterByCode.set(equipmentCode, next);
        continue;
      }

      equipmentMasterByCode.set(equipmentCode, {
        equipmentCode,
        description: existing.description ?? next.description,
        locale: existing.locale ?? next.locale,
        area: existing.area ?? next.area,
        system: existing.system ?? next.system,
        source:
          existing.source === next.source
            ? existing.source
            : "both",
      });
    }

    equipmentEdges.push({
      cableCodeOriginal: record.cableCodeOriginal,
      cableCodeNormalized: record.cableCodeNormalized,
      fromEquipment: isRealEquipmentCode(record.appPartenza) ? record.appPartenza : null,
      toEquipment: isRealEquipmentCode(record.appArrivo) ? record.appArrivo : null,
      statoInca: record.statoInca,
      perimetro: record.perimetro,
      area: record.area,
    });
  }

  return {
    byNormalizedCode,
    byOriginalCode,
    equipmentMasterByCode,
    equipmentEdges,
  };
}

export function findSdcCableRecord(lookup: SdcCableLookup, value: string | null | undefined): SdcCableRecord | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const normalizedKey = compactCableKey(normalized);
  const exactNormalized = lookup.byNormalizedCode.get(normalizeCableCode(normalized))?.[0] ?? null;
  if (exactNormalized) return exactNormalized;

  const exactOriginal = lookup.byOriginalCode.get(getDisplayCableCode(normalized))?.[0] ?? null;
  if (exactOriginal) return exactOriginal;

  const fallback = Array.from(lookup.byNormalizedCode.entries()).find(([key]) => compactCableKey(key) === normalizedKey)?.[1]?.[0] ?? null;
  if (fallback) return fallback;

  return Array.from(lookup.byOriginalCode.entries()).find(([key]) => compactCableKey(key) === normalizedKey)?.[1]?.[0] ?? null;
}
