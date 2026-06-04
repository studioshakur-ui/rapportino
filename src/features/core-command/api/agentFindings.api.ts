// src/features/core-command/api/agentFindings.api.ts
import { supabase } from "../../../lib/supabaseClient";
import type { AgentFinding, InsertAgentFinding, EventSeverity } from "../types";

export async function listOpenFindings(
  severity?: EventSeverity,
  limit = 100
): Promise<AgentFinding[]> {
  let q = supabase
    .from("agent_findings")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (severity) q = q.eq("severity", severity);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function listFindingsForEvent(eventId: string): Promise<AgentFinding[]> {
  const { data, error } = await supabase
    .from("agent_findings")
    .select("*")
    .eq("core_event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function bulkInsertFindings(
  findings: InsertAgentFinding[]
): Promise<AgentFinding[]> {
  if (findings.length === 0) return [];
  const { data, error } = await supabase
    .from("agent_findings")
    .insert(findings)
    .select("*");
  if (error) throw error;
  return (data ?? []) as AgentFinding[];
}

export async function resolveAllFindingsForEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from("agent_findings")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("core_event_id", eventId)
    .eq("status", "open");
  if (error) throw error;
}

export async function ignoreFinding(id: string): Promise<void> {
  const { error } = await supabase
    .from("agent_findings")
    .update({ status: "ignored" })
    .eq("id", id);
  if (error) throw error;
}
