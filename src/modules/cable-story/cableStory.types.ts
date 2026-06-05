import type { AgentFinding, CablePriority } from "../../features/core-command/types";

export type CableStoryConfidenceBand = "High" | "Medium" | "Low";

export type CableStoryIncaCard = {
  id: string | null;
  codice: string | null;
  situazione: string | null;
  metri_teo: number | null;
  impianto: string | null;
  zona_da: string | null;
  zona_a: string | null;
  commessa: string | null;
  created_at: string | null;
};

export type CableStoryTimelineItem = {
  id: string;
  event_at: string;
  event_type: string;
  status: string | null;
  actor_label: string | null;
  source_type: string;
  summary: string;
  detail: string | null;
  confidence: number;
  priority_level: string | null;
  message_id: string | null;
  core_event_id: string | null;
  is_contradictory: boolean;
};

export type CableStoryPriority = {
  id: string;
  cable_code: string;
  priority: string;
  reason: string | null;
  status: string;
  created_at: string;
  closed_at: string | null;
  source_event_id: string | null;
};

export type CableStoryFinding = {
  id: string;
  agent_name: string;
  finding_type: string;
  severity: string;
  status: string;
  confidence: number;
  message: string;
  recommendation: string | null;
  created_at: string;
  core_event_id: string | null;
};

export type CableStorySource = {
  id: string;
  source_type: "whatsapp";
  author: string | null;
  occurred_at: string;
  excerpt: string | null;
  media_type: string | null;
  media_filename: string | null;
};

export type CableStoryViewModel = {
  cable: {
    code: string;
    normalized_code: string;
  };
  inca: CableStoryIncaCard | null;
  memory_summary: {
    first_signal_at: string | null;
    last_signal_at: string | null;
    source_messages_count: number;
    events_count: number;
    findings_count: number;
    open_priorities_count: number;
    global_confidence: number;
    confidence_band: CableStoryConfidenceBand;
    computed_status: string;
    has_contradictions: boolean;
  };
  timeline: CableStoryTimelineItem[];
  priorities: CableStoryPriority[];
  findings: CableStoryFinding[];
  sources: CableStorySource[];
  short_story: string[];
};

export type CableStoryCandidate = {
  id: string;
  normalized_code: string;
  display_code: string;
  commessa: string | null;
  impianto: string | null;
  zona_da: string | null;
  zona_a: string | null;
  source: "inca";
};

export type CableStoryLoadResult =
  | {
      kind: "resolved";
      model: CableStoryViewModel;
      candidates: CableStoryCandidate[];
      selected_candidate_id: string | null;
    }
  | {
      kind: "ambiguous";
      normalized_code: string;
      candidates: CableStoryCandidate[];
      selected_candidate_id: null;
    };

export function toCableStoryPriority(priority: CablePriority): CableStoryPriority {
  return {
    id: priority.id,
    cable_code: priority.cable_code,
    priority: priority.priority,
    reason: priority.reason,
    status: priority.status,
    created_at: priority.created_at,
    closed_at: priority.closed_at,
    source_event_id: priority.source_event_id,
  };
}

export function toCableStoryFinding(finding: AgentFinding): CableStoryFinding {
  return {
    id: finding.id,
    agent_name: finding.agent_name,
    finding_type: finding.finding_type,
    severity: finding.severity,
    status: finding.status,
    confidence: Math.round((finding.confidence ?? 0) * 100),
    message: finding.message,
    recommendation: finding.recommendation,
    created_at: finding.created_at,
    core_event_id: finding.core_event_id,
  };
}
