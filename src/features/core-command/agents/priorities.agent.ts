// src/features/core-command/agents/priorities.agent.ts
// Génération automatique de priorities depuis agent_findings.
// Aucune écriture inca_cavi.

import { supabase } from "../../../lib/supabaseClient";
import { insertCablePriority } from "../api/cablePriorities.api";
import type { InsertCablePriority } from "../types";

export interface PrioritiesResult {
  created: number;
  skipped: number;
  errors: string[];
}

const FINDING_TO_PRIORITY: Record<string, { priority: "low" | "medium" | "high" | "critical"; reason: string }> = {
  cable_not_in_inca:    { priority: "medium", reason: "Câble non trouvé dans INCA" },
  low_confidence:       { priority: "low",    reason: "Événement à faible confiance" },
  missing_cable_code:   { priority: "low",    reason: "Code câble manquant" },
  CABLE_CORTO:          { priority: "medium", reason: "Câble trop court" },
  CABLE_MANCANTE:       { priority: "high",   reason: "Câble manquant sur chantier" },
  CABLE_DA_CONTROLLARE: { priority: "medium", reason: "Câble à vérifier" },
};

export async function generatePrioritiesFromFindings(): Promise<PrioritiesResult> {
  const result: PrioritiesResult = { created: 0, skipped: 0, errors: [] };

  // Charger findings ouverts avec entity_id (cable_code)
  const { data: findings, error } = await supabase
    .from("agent_findings")
    .select("id, finding_type, entity_id, entity_type, core_event_id, confidence")
    .eq("status", "open")
    .not("entity_id", "is", null);

  if (error || !findings) {
    result.errors.push(`Chargement findings: ${error?.message ?? "unknown"}`);
    return result;
  }

  // Charger priorités existantes pour éviter doublons
  const { data: existingPriorities } = await supabase
    .from("cable_priorities")
    .select("cable_code, status")
    .eq("status", "open");

  const existingCables = new Set(
    (existingPriorities ?? []).map((p) => p.cable_code)
  );

  for (const finding of findings) {
    if (finding.entity_type !== "cable_code" || !finding.entity_id) {
      result.skipped++;
      continue;
    }

    const cable = finding.entity_id;
    const rule = FINDING_TO_PRIORITY[finding.finding_type];

    if (!rule) { result.skipped++; continue; }
    if (existingCables.has(cable)) { result.skipped++; continue; }

    try {
      const payload: InsertCablePriority = {
        cable_code:      cable,
        priority:        rule.priority,
        reason:          rule.reason,
        status:          "open",
        source_event_id: finding.core_event_id ?? null,
      };
      await insertCablePriority(payload);
      existingCables.add(cable);
      result.created++;
    } catch (e) {
      result.errors.push(`Priority (${cable}): ${String(e)}`);
    }
  }

  return result;
}
