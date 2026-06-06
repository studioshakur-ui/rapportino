// src/features/core-command/api/stats.api.ts
// Requêtes d'audit et de stats CORE COMMAND — read-only.
// Aucune écriture inca_cavi.

import { supabase } from "../../../lib/supabaseClient";

export interface CommandStats {
  msg_count: number;
  events_count: number;
  cable_events_count: number;
  findings_count: number;
  priorities_count: number;
  unique_cables: number;
  pending_events: number;
}

export interface CableRank {
  cable_code: string;
  mentions: number;
}

export interface AuthorRank {
  author: string;
  msg_count: number;
}

export async function fetchCommandStats(): Promise<CommandStats> {
  const [msgs, evts, cevts, findings, prios, cables, pending] = await Promise.all([
    supabase.from("whatsapp_messages").select("id", { count: "exact", head: true }),
    supabase.from("core_events").select("id", { count: "exact", head: true }),
    supabase.from("cable_events").select("id", { count: "exact", head: true }),
    supabase.from("agent_findings").select("id", { count: "exact", head: true }),
    supabase.from("cable_priorities").select("id", { count: "exact", head: true }),
    supabase
      .from("cable_events")
      .select("cable_code")
      .then(({ data }) => ({ count: new Set((data ?? []).map((r) => r.cable_code)).size })),
    supabase
      .from("core_events")
      .select("id", { count: "exact", head: true })
      .eq("validation_status", "pending"),
  ]);

  return {
    msg_count:         msgs.count          ?? 0,
    events_count:      evts.count          ?? 0,
    cable_events_count: cevts.count        ?? 0,
    findings_count:    findings.count      ?? 0,
    priorities_count:  prios.count         ?? 0,
    unique_cables:     cables.count        ?? 0,
    pending_events:    pending.count       ?? 0,
  };
}

export async function fetchTopCables(limit = 20): Promise<CableRank[]> {
  const { data, error } = await supabase
    .from("cable_events")
    .select("cable_code");
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.cable_code, (counts.get(row.cable_code) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([cable_code, mentions]) => ({ cable_code, mentions }));
}

export async function fetchTopAuthors(limit = 20): Promise<AuthorRank[]> {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("author");
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.author) counts.set(row.author, (counts.get(row.author) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([author, msg_count]) => ({ author, msg_count }));
}

export async function fetchMessagesWithoutCable(limit = 100): Promise<number> {
  // incoming_messages rows where cable_refs is an empty JSON array = no cable extracted
  const { count, error } = await supabase
    .from("incoming_messages")
    .select("id", { count: "exact", head: true })
    .filter("cable_refs", "eq", "[]");
  if (error) throw error;
  void limit;
  return count ?? 0;
}
