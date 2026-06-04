// apps/commander/src/config.ts
// Centralised, validated configuration for COMMANDER.
import "dotenv/config";
import { z } from "zod";

const Schema = z.object({
  // Railway (and most PaaS) inject PORT; it takes precedence over COMMANDER_PORT.
  PORT: z.coerce.number().int().positive().optional(),
  COMMANDER_PORT: z.coerce.number().int().positive().default(8787),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Meta WhatsApp Cloud API
  META_VERIFY_TOKEN: z.string().min(1, "META_VERIFY_TOKEN is required"),
  META_APP_SECRET: z.string().min(1, "META_APP_SECRET is required"),

  // CORE Memory (Supabase). Optional → COMMANDER falls back to local audit file.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Audit sink (always written; also primary store when Supabase is absent)
  COMMANDER_AUDIT_FILE: z.string().default("commander-audit.jsonl"),

  // Logical table name in CORE Memory for live webhook ingestion.
  COMMANDER_INCOMING_TABLE: z.string().default("incoming_messages"),
});

export type CommanderConfig = z.infer<typeof Schema> & {
  supabaseEnabled: boolean;
  // Effective bind port: PORT (Railway) wins, else COMMANDER_PORT.
  port: number;
};

let cached: CommanderConfig | null = null;

export function loadConfig(): CommanderConfig {
  if (cached) return cached;

  const parsed = Schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`COMMANDER config invalid:\n${issues}`);
  }

  const supabaseEnabled = Boolean(parsed.data.SUPABASE_URL && parsed.data.SUPABASE_SERVICE_ROLE_KEY);
  const port = parsed.data.PORT ?? parsed.data.COMMANDER_PORT;

  cached = { ...parsed.data, supabaseEnabled, port };
  return cached;
}
