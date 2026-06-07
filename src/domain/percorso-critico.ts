// src/domain/percorso-critico.ts — Percorso critico
// Un cavo è sul percorso critico se è bloccato,
// connesso a un'apparecchiatura critica, o impedisce la chiusura di un sistema.

import type { DailyListItemVM } from "../modules/daily-lists/dailyLists.types";
import type { EquipmentImpactSummary } from "../modules/equipment/equipment.types";

export interface CavoPercorsoCritico {
  codice_cavo: string;
  perimetro: string | null;
  motivo: string;
  apparecchiature_impattate: string[];
  blocca_sistema: boolean;
}

export function buildPercorsoCritico(
  items: DailyListItemVM[],
  equipmentImpacts: EquipmentImpactSummary[]
): CavoPercorsoCritico[] {
  const criticalCodes = new Set(
    equipmentImpacts
      .filter((e) => e.risk_level === "critical" || e.risk_level === "high")
      .map((e) => e.equipment_code)
  );

  return items
    .filter((item) => {
      const isBlocked = item.computed_status === "blocked";
      const touchesCritical =
        (item.app_partenza && criticalCodes.has(item.app_partenza)) ||
        (item.app_arrivo && criticalCodes.has(item.app_arrivo));
      return isBlocked || Boolean(touchesCritical);
    })
    .map((item) => {
      const appsCritiche = [item.app_partenza, item.app_arrivo].filter(
        (a): a is string => Boolean(a) && criticalCodes.has(a ?? "")
      );

      let motivo: string;
      if (item.computed_status === "blocked") motivo = "Cavo bloccato da anomalia aperta";
      else if (item.has_short_issue) motivo = "Cavo corto — richiede correzione";
      else if (item.has_missing_issue) motivo = "Cavo mancante — da localizzare";
      else if (appsCritiche.length > 0)
        motivo = `Apparecchiatura critica: ${appsCritiche[0]}`;
      else motivo = "Nessuna evidenza terreno su apparecchiatura critica";

      const apparecchiatureImpattate = [item.app_partenza, item.app_arrivo].filter(
        (a): a is string => Boolean(a)
      );

      return {
        codice_cavo: item.cable_code_normalized,
        perimetro: item.perimetro,
        motivo,
        apparecchiature_impattate: apparecchiatureImpattate,
        blocca_sistema: item.computed_status === "blocked" || appsCritiche.length > 0,
      } satisfies CavoPercorsoCritico;
    })
    .sort((a, b) => Number(b.blocca_sistema) - Number(a.blocca_sistema));
}
