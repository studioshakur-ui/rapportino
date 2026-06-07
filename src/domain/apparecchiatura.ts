// src/domain/apparecchiatura.ts — Intelligenza apparecchiature
// Arricchisce EquipmentIntelligence (motore canonico ESWBS) con contesto dominio italiano.
// UI consuma solo ApparecchiaturaVM — nessun calcolo nel componente React.
// Solo codici ESWBS validi (^\d{12}$) — filtro già applicato dall'engine canonico.

import type { EquipmentIntelligence } from "../modules/equipment/equipment.types";
import { LIVELLO_RISCHIO } from "./dizionario";
import { ensureArray } from "../core/utils/array";

export interface ApparecchiaturaVM {
  codice: string;
  nome: string | null;
  sistema: string | null;
  zona: string | null;
  livello_rischio: string;
  livello_rischio_raw: string;
  cavi_totali: number;
  cavi_confermati: number;
  cavi_senza_evidenza: number;
  cavi_bloccanti: string[];
  anomalie: string[];
  stato_chiusura: string;
  avanzamento_label: string;
  cosa_manca: string;
  cosa_blocca: string | null;
  impatto_sistema: string | null;
  azioni_raccomandate: string[];
}

export function buildApparecchiaturaVM(eq: EquipmentIntelligence): ApparecchiaturaVM {
  const criticalPath = ensureArray(eq.critical_path, `apparecchiatura.${eq.equipment_code}.critical_path`);
  const riskReasons = ensureArray(eq.risk_reasons, `apparecchiatura.${eq.equipment_code}.risk_reasons`);
  const bloccanti = criticalPath
    .filter((c) => c.status === "blocked" || eq.closure_status === "BLOCKED")
    .map((c) => c.cable_code);

  const rimanenti = eq.total_cables - eq.confirmed_cables;
  const avanzamentoLabel = `${eq.confirmed_cables}/${eq.total_cables} cavi confermati`;

  const cosaManca =
    rimanenti > 0
      ? `${rimanenti} cav${rimanenti === 1 ? "o" : "i"} non ancora confermati`
      : "Tutti i cavi confermati";

  const cosaBlocca =
    bloccanti.length > 0
      ? `cav${bloccanti.length === 1 ? "o" : "i"} bloccant${bloccanti.length === 1 ? "e" : "i"}: ${bloccanti.slice(0, 3).join(", ")}`
      : null;

  const impattoSistema =
    eq.closure_status === "BLOCKED" || eq.closure_status === "OPEN"
      ? `apparecchiatura ${eq.equipment_code} impedisce chiusura sistema`
      : null;

  const azioni: string[] = [];
  if (eq.blocked_cables > 0)
    azioni.push(`Sbloccare ${eq.blocked_cables} cav${eq.blocked_cables === 1 ? "o" : "i"} bloccati`);
  if (eq.open_cables > 0 && eq.blocked_cables === 0)
    azioni.push(`Confermare ${eq.open_cables} cav${eq.open_cables === 1 ? "o" : "i"} non chiusi`);
  if (azioni.length === 0) azioni.push("Solo monitoraggio — nessun rischio aperto rilevato");

  return {
    codice: eq.equipment_code,
    nome: eq.equipment_name,
    sistema: eq.system,
    zona: eq.zone,
    livello_rischio: LIVELLO_RISCHIO[eq.risk_level] ?? eq.risk_level,
    livello_rischio_raw: eq.risk_level,
    cavi_totali: eq.total_cables,
    cavi_confermati: eq.confirmed_cables,
    cavi_senza_evidenza: eq.open_cables,
    cavi_bloccanti: bloccanti,
    anomalie: riskReasons,
    stato_chiusura: eq.closure_status,
    avanzamento_label: avanzamentoLabel,
    cosa_manca: cosaManca,
    cosa_blocca: cosaBlocca,
    impatto_sistema: impattoSistema,
    azioni_raccomandate: azioni,
  };
}

export function buildApparecchiaturaVMs(
  equipments: EquipmentIntelligence[]
): ApparecchiaturaVM[] {
  return equipments.map(buildApparecchiaturaVM);
}
