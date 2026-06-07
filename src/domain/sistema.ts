// src/domain/sistema.ts — Chiusura sistema
// Un sistema è un perimetro/zona con i suoi cavi.
// Calcola stato chiusura, cosa manca, cosa blocca, impatto apparecchiature.

import type { DailyListItemVM } from "../modules/daily-lists/dailyLists.types";
import type { EquipmentIntelligence } from "../modules/equipment/equipment.types";
import { STATO_CHIUSURA, type StatoChiusura } from "./dizionario";
import { ensureArray } from "../core/utils/array";

export interface SistemaChiusura {
  nome: string;
  stato: StatoChiusura;
  cavi_totali: number;
  cavi_confermati: number;
  cavi_mancanti: string[];
  cavi_bloccanti: string[];
  apparecchiature_impattate: string[];
  avanzamento_label: string;
  cosa_manca: string;
  cosa_blocca: string | null;
  impatto: string | null;
}

const ORDER_STATO: Record<StatoChiusura, number> = {
  BLOCCATO:     0,
  "NON CHIUSO": 1,
  "IN CORSO":   2,
  CHIUSO:       3,
};

export function buildSistemiChiusura(
  items: DailyListItemVM[],
  equipments: EquipmentIntelligence[]
): SistemaChiusura[] {
  const perimetroMap = new Map<string, DailyListItemVM[]>();
  for (const item of items) {
    const key = item.perimetro ?? "—";
    const list = perimetroMap.get(key) ?? [];
    list.push(item);
    perimetroMap.set(key, list);
  }

  // Only canonical ESWBS equipment codes matter for impatto
  const criticalEquipmentCodes = new Set(
    equipments
      .filter((e) => e.closure_status === "BLOCKED" || e.closure_status === "OPEN")
      .map((e) => e.equipment_code)
  );

  return Array.from(perimetroMap.entries())
    .map(([nome, cavi]) => {
      const totale = cavi.length;
      const confermati = cavi.filter(
        (c) => c.computed_status === "confirmed_field" || c.computed_status === "likely_laid"
      ).length;
      const bloccati = cavi.filter((c) => c.computed_status === "blocked");
      const mancanti = cavi.filter(
        (c) =>
          c.computed_status === "no_evidence" ||
          c.computed_status === "outside_inca" ||
          c.computed_status === "to_verify"
      );

      // Only include ESWBS-valid equipment codes in apparecchiature_impattate
      const appCodes = new Set<string>();
      for (const eq of equipments) {
        const incomingCables = ensureArray(eq.incoming_cables, `sistema.${eq.equipment_code}.incoming_cables`);
        const outgoingCables = ensureArray(eq.outgoing_cables, `sistema.${eq.equipment_code}.outgoing_cables`);
        const touchesZone = incomingCables.some((code) =>
          cavi.some((c) => c.cable_code_normalized === code)
        ) || outgoingCables.some((code) =>
          cavi.some((c) => c.cable_code_normalized === code)
        );
        if (touchesZone) appCodes.add(eq.equipment_code);
      }

      let stato: StatoChiusura;
      if (bloccati.length > 0) stato = STATO_CHIUSURA.BLOCCATO;
      else if (confermati === totale && totale > 0) stato = STATO_CHIUSURA.CHIUSO;
      else if (confermati === 0) stato = STATO_CHIUSURA.NON_CHIUSO;
      else stato = STATO_CHIUSURA.IN_CORSO;

      const rimanenti = totale - confermati;
      const avanzamentoLabel = `${confermati}/${totale} cavi confermati`;

      const cosaManca =
        rimanenti > 0
          ? `${rimanenti} cav${rimanenti === 1 ? "o" : "i"} non confermati`
          : "Tutti i cavi confermati";

      const cosaBlocca =
        bloccati.length > 0
          ? bloccati
              .slice(0, 3)
              .map((c) => c.cable_code_normalized)
              .join(", ")
          : null;

      const apparecchiatureCritiche = [...appCodes].filter((code) =>
        criticalEquipmentCodes.has(code)
      );
      const impatto =
        apparecchiatureCritiche.length > 0
          ? `apparecchiatura ${apparecchiatureCritiche[0]} non chiudibile`
          : null;

      return {
        nome,
        stato,
        cavi_totali: totale,
        cavi_confermati: confermati,
        cavi_mancanti: mancanti.slice(0, 10).map((c) => c.cable_code_normalized),
        cavi_bloccanti: bloccati.map((c) => c.cable_code_normalized),
        apparecchiature_impattate: [...appCodes],
        avanzamento_label: avanzamentoLabel,
        cosa_manca: cosaManca,
        cosa_blocca: cosaBlocca,
        impatto,
      } satisfies SistemaChiusura;
    })
    .sort((a, b) => (ORDER_STATO[a.stato] ?? 9) - (ORDER_STATO[b.stato] ?? 9));
}

export function sistemiNonChiusi(sistemi: SistemaChiusura[]): SistemaChiusura[] {
  return sistemi.filter((s) => s.stato !== STATO_CHIUSURA.CHIUSO);
}

export function chiusureRecenti(sistemi: SistemaChiusura[]): SistemaChiusura[] {
  return sistemi.filter((s) => s.stato === STATO_CHIUSURA.CHIUSO);
}
