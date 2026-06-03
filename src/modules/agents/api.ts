// src/modules/agents/api.ts
import { supabase } from "../../core/supabase";
import type { AgentFinding, AgentName } from "../../core/db/types";
import type { DraftFinding } from "./runtime/types";

export async function listFindings(agent?: AgentName): Promise<AgentFinding[]> {
  let q = supabase
    .from("agent_findings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (agent) q = q.eq("agent", agent);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AgentFinding[];
}

export async function persistFindings(findings: DraftFinding[]): Promise<number> {
  if (findings.length === 0) return 0;
  const rows = findings.map((f) => ({
    agent: f.agent,
    severity: f.severity,
    title: f.title,
    detail: f.detail ?? {},
    related_event: f.related_event ?? null,
    status: "open",
  }));
  const { error } = await supabase.from("agent_findings").insert(rows);
  if (error) throw error;
  return rows.length;
}

export async function setFindingStatus(
  id: string,
  status: "open" | "acknowledged" | "resolved"
): Promise<void> {
  const { error } = await supabase.from("agent_findings").update({ status }).eq("id", id);
  if (error) throw error;
}
