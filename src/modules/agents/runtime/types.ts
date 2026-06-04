// src/modules/agents/runtime/types.ts
import type { AgentName, AgentSeverity } from "../../../core/db/types";

export type DraftFinding = {
  agent: AgentName;
  severity: AgentSeverity;
  title: string;
  detail?: Record<string, unknown>;
  related_event?: string | null;
};

export type AgentDef = {
  name: AgentName;
  label: string;
  description: string;
  run: () => Promise<DraftFinding[]>;
};
