// src/features/core-command/agents/auditor.agent.ts
// V1 PLACEHOLDER — Auditor Agent.
// Deterministic anomaly detection on core_events.
// Produces agent_findings only. No writes to inca_cavi.

import type { CoreEvent, InsertAgentFinding } from "../types";

interface AuditRule {
  name: string;
  check: (event: CoreEvent) => InsertAgentFinding | null;
}

const RULES: AuditRule[] = [
  {
    name: "low_confidence",
    check: (ev) => {
      if (ev.confidence < 0.3) {
        return {
          agent_name: "auditor",
          finding_type: "low_confidence",
          severity: "warn",
          confidence: ev.confidence,
          core_event_id: ev.id,
          entity_type: "core_event",
          entity_id: ev.id,
          message: `Événement avec confiance faible (${(ev.confidence * 100).toFixed(0)}%). Vérification manuelle recommandée.`,
          recommendation: "Valider ou rejeter manuellement.",
          status: "open",
        };
      }
      return null;
    },
  },
  {
    name: "missing_cable_code",
    check: (ev) => {
      if (!ev.cable_code_raw && !ev.cable_code_normalized && ev.event_type !== "info") {
        return {
          agent_name: "auditor",
          finding_type: "missing_cable_code",
          severity: "warn",
          confidence: 0.8,
          core_event_id: ev.id,
          entity_type: "core_event",
          entity_id: ev.id,
          message: "Aucun code câble extrait. Message peut-être non opérationnel.",
          recommendation: "Associer manuellement un câble ou rejeter l'événement.",
          status: "open",
        };
      }
      return null;
    },
  },
  {
    name: "missing_operator",
    check: (ev) => {
      if (!ev.operator_id) {
        return {
          agent_name: "auditor",
          finding_type: "missing_operator",
          severity: "info",
          confidence: 0.7,
          core_event_id: ev.id,
          entity_type: "core_event",
          entity_id: ev.id,
          message: "Opérateur non identifié. Associer un opérateur pour la timeline.",
          recommendation: "Associer un core_operator à cet événement.",
          status: "open",
        };
      }
      return null;
    },
  },
];

export function auditEvents(events: CoreEvent[]): InsertAgentFinding[] {
  const findings: InsertAgentFinding[] = [];
  for (const ev of events) {
    for (const rule of RULES) {
      const finding = rule.check(ev);
      if (finding) findings.push(finding);
    }
  }
  return findings;
}
