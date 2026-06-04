// apps/commander/src/index.ts
// COMMANDER entrypoint — WhatsApp field sensor for CORE COMMAND.
import { loadConfig } from "./config";
import { logger } from "./logger";
import { createServer } from "./server";

function main(): void {
  const cfg = loadConfig();
  const app = createServer();

  app.listen(cfg.COMMANDER_PORT, () => {
    logger.info("COMMANDER listening", {
      port: cfg.COMMANDER_PORT,
      env: cfg.NODE_ENV,
      sink: cfg.supabaseEnabled ? "supabase" : "audit-file",
      incomingTable: cfg.COMMANDER_INCOMING_TABLE,
    });
  });
}

try {
  main();
} catch (err) {
  logger.error("COMMANDER failed to start", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
}
