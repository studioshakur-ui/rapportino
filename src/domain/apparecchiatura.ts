// src/domain/apparecchiatura.ts — Intelligenza apparecchiature
// Arricchisce EquipmentImpactSummary con contesto di dominio italiano.
// UI consuma solo ApparecchiaturaVM — nessun calcolo nel componente React.

import type { EquipmentImpactSummary } from "../modules/equipment/equipment.types";
import type { DailyListItemVM } from "../modules/daily-lists/dailyLists.types";
import { LIVELLO_RISCHIO } from "./dizionario";

export interface ApparecchiaturaVM {
  codice: string;
  livello_rischio: string;
  livello_rischio_raw: string;
  cavi_totali: number;
  cavi_confermati: number;
  cavi_senza_evidenza: number;
  cavi_bloccanti: string[];
  anomalie: string[];
  avanzamento_label: string;
  cosa_manca: string;
  cosa_blocca: string | null;
  impatto_sistema: string | null;
  azioni_raccomandate: string[];
}

export function buildApparecchiaturaVM(
  impact: EquipmentImpactSummary,
  items: DailyListItemVM[]
): ApparecchiaturaVM {
  const linked = items.filter(
    (i) =>
      (i.app_partenza ?? "").toUpperCase() === impact.equipment_code.toUpperCase() ||
      (i.app_arrivo ?? "").toUpperCase() === impact.equipment_code.toUpperCase()
  );

  const bloccanti = linked
    .filter(
      (i) =>
        i.computed_status === "blocked" ||
        i.has_short_issue ||
        i.has_missing_issue
    )
    .map((i) => i.cable_code_normalized);

  const rimanenti = impact.total_cables - impact.confirmed_by_field;
  const avanzamentoLabel = `${impact.confirmed_by_field}/${impact.total_cables} cavi confermati`;

  const cosaManca =
    rimanenti > 0
      ? `${rimanenti} cav${rimanenti === 1 ? "o" : "i"} non ancora confermati`
      : "Tutti i cavi confermati";

  const cosaBlocca =
    bloccanti.length > 0
      ? `cav${bloccanti.length === 1 ? "o" : "i"} bloccant${bloccanti.length === 1 ? "e" : "i"}: ${bloccanti.slice(0, 3).join(", ")}`
      : null;

  const impattoSistema =
    impact.risk_level === "critical" || impact.risk_level === "high"
      ? `apparecchiatura ${impact.equipment_code} impedisce chiusura sistema`
      : null;

  const azioni: string[] = [];
  if (bloccanti.length > 0)
    azioni.push(
      `Sbloccare ${bloccanti.length} cav${bloccanti.length === 1 ? "o" : "i"} bloccant${bloccanti.length === 1 ? "e" : "i"}`
    );
  if (impact.without_field_evidence > 0)
    azioni.push(
      `Richiedere evidenza terreno per ${impact.without_field_evidence} cav${impact.without_field_evidence === 1 ? "o" : "i"}`
    );
  if (azioni.length === 0) azioni.push("Monitorare — nessun rischio aperto rilevato");

  return {
    codice: impact.equipment_code,
    livello_rischio: LIVELLO_RISCHIO[impact.risk_level] ?? impact.risk_level,
    livello_rischio_raw: impact.risk_level,
    cavi_totali: impact.total_cables,
    cavi_confermati: impact.confirmed_by_field,
    cavi_senza_evidenza: impact.without_field_evidence,
    cavi_bloccanti: bloccanti,
    anomalie: impact.risk_reasons,
    avanzamento_label: avanzamentoLabel,
    cosa_manca: cosaManca,
    cosa_blocca: cosaBlocca,
    impatto_sistema: impattoSistema,
    azioni_raccomandate: azioni,
  };
}

export function buildApparecchiaturaVMs(
  impacts: EquipmentImpactSummary[],
  items: DailyListItemVM[]
): ApparecchiaturaVM[] {
  return impacts.map((impact) => buildApparecchiaturaVM(impact, items));
}
