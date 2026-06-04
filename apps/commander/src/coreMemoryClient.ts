// apps/commander/src/coreMemoryClient.ts
// Persistence into CORE Memory. NEVER writes to inca_cavi (INCA stays read-only).
// Primary sink: Supabase table `incoming_messages` (service role).
// Fallback sink: local append-only JSONL audit file (always available).
import { appendFile } from "node:fs/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadConfig } from "./config";
import { logger } from "./logger";

// Hard guard: any attempt to target INCA tables from COMMANDER is a bug.
const FORBIDDEN_TABLES = new Set(["inca_cavi", "inca_files", "inca_percorsi"]);

export interface IncomingRecord {
  wamid: string;
  sender: string;
  sender_name: string | null;
  message_ts: string;
  message_type: string;
  text: string | null;
  media_type: string | null;
  cable_refs: unknown;
  classification: unknown;
  raw_payload: unknown;
}

export type PersistResult = { sink: "supabase" | "audit"; ok: boolean };

let client: SupabaseClient | null = null;
function getClient(): SupabaseClient | null {
  const cfg = loadConfig();
  if (!cfg.supabaseEnabled) return null;
  if (!client) {
    client = createClient(cfg.SUPABASE_URL as string, cfg.SUPABASE_SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

async function writeAudit(record: IncomingRecord): Promise<void> {
  const cfg = loadConfig();
  await appendFile(cfg.COMMANDER_AUDIT_FILE, JSON.stringify({ at: new Date().toISOString(), ...record }) + "\n");
}

export async function persistIncoming(record: IncomingRecord): Promise<PersistResult> {
  const cfg = loadConfig();

  // Defensive: COMMANDER must never address INCA tables.
  if (FORBIDDEN_TABLES.has(cfg.COMMANDER_INCOMING_TABLE)) {
    throw new Error(`Refusing to write to forbidden INCA table: ${cfg.COMMANDER_INCOMING_TABLE}`);
  }

  const sb = getClient();
  if (sb) {
    const { error } = await sb
      .from(cfg.COMMANDER_INCOMING_TABLE)
      .upsert(
        {
          source: "commander",
          wamid: record.wamid,
          sender: record.sender,
          sender_name: record.sender_name,
          message_ts: record.message_ts,
          message_type: record.message_type,
          text: record.text,
          cable_refs: record.cable_refs,
          classification: record.classification,
          raw_payload: record.raw_payload,
        },
        { onConflict: "wamid", ignoreDuplicates: true }
      );

    if (!error) return { sink: "supabase", ok: true };

    // Table missing (not migrated yet) → fall back to audit file, warn once.
    logger.warn("CORE Memory insert failed, falling back to audit file", {
      table: cfg.COMMANDER_INCOMING_TABLE,
      code: (error as { code?: string }).code ?? null,
      message: error.message,
    });
  }

  await writeAudit(record);
  return { sink: "audit", ok: true };
}
