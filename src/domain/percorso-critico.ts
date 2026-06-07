// src/domain/percorso-critico.ts — Percorso critico
// Un cavo è sul percorso critico se è bloccato,
// connesso a un'apparecchiatura critica (ESWBS valida, OPEN/BLOCKED),
// o impedisce la chiusura di un sistema.

import type { DailyListItemVM } from "../modules/daily-lists/dailyLists.types";
import type { EquipmentIntelligence } from "../modules/equipment/equipment.types";
import { ensureArray } from "../core/utils/array";

export interface CavoPercorsoCritico {
  codice_cavo: string;
  perimetro: string | null;
  motivo: string;
  apparecchiature_impattate: string[];
  blocca_sistema: boolean;
}

export function buildPercorsoCritico(
  items: DailyListItemVM[],
  equipments: EquipmentIntelligence[]
): CavoPercorsoCritico[] {
  // Only canonical ESWBS codes with non-CLOSED status are on the critical path
  const criticalCodes = new Set(
    equipments
      .filter((e) => e.closure_status !== "CLOSED")
      .map((e) => e.equipment_code)
  );

  // Build cable → equipment mapping from canonical source
  const cableToEquipments = new Map<string, string[]>();
  for (const eq of equipments) {
    const incomingCables = ensureArray(eq.incoming_cables, `percorsoCritico.${eq.equipment_code}.incoming_cables`);
    const outgoingCables = ensureArray(eq.outgoing_cables, `percorsoCritico.${eq.equipment_code}.outgoing_cables`);
    for (const cable of [...incomingCables, ...outgoingCables]) {
      const list = cableToEquipments.get(cable) ?? [];
      if (!list.includes(eq.equipment_code)) list.push(eq.equipment_code);
      cableToEquipments.set(cable, list);
    }
  }

  return items
    .filter((item) => {
      const isBlocked = item.computed_status === "blocked";
      const linkedEquipments = cableToEquipments.get(item.cable_code_normalized) ?? [];
      const touchesCritical = linkedEquipments.some((code) => criticalCodes.has(code));
      return isBlocked || touchesCritical;
    })
    .map((item) => {
      const linkedEquipments = cableToEquipments.get(item.cable_code_normalized) ?? [];
      const appsCritiche = linkedEquipments.filter((code) => criticalCodes.has(code));

      let motivo: string;
      if (item.computed_status === "blocked") motivo = "Cavo bloccato da anomalia aperta";
      else if (item.has_short_issue) motivo = "Cavo corto — richiede correzione";
      else if (item.has_missing_issue) motivo = "Cavo mancante — da localizzare";
      else if (appsCritiche.length > 0) motivo = `Apparecchiatura critica: ${appsCritiche[0]}`;
      else motivo = "Nessuna evidenza terreno su apparecchiatura critica";

      return {
        codice_cavo: item.cable_code_normalized,
        perimetro: item.perimetro,
        motivo,
        apparecchiature_impattate: linkedEquipments,
        blocca_sistema: item.computed_status === "blocked" || appsCritiche.length > 0,
      } satisfies CavoPercorsoCritico;
    })
    .sort((a, b) => Number(b.blocca_sistema) - Number(a.blocca_sistema));
}
