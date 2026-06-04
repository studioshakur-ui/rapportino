// apps/commander/src/index.ts
// COMMANDER entrypoint — WhatsApp field sensor for CORE COMMAND.
import { loadConfig } from "./config";
import { logger } from "./logger";
import { createServer } from "./server";

function main(): void {
  const cfg = loadConfig();
  const app = createServer();

  app.listen(cfg.port, () => {
    logger.info("COMMANDER listening", {
      port: cfg.port,
      env: cfg.NODE_ENV,
      sink: cfg.supabaseEnabled ? "supabase" : "audit-file",
      incomingTable: cfg.COMMANDER_INCOMING_TABLE,
    });
  });
}

process.on("uncaughtException", (err) => {
  process.stderr.write("COMMANDER uncaughtException: " + String(err) + "\n" + (err.stack ?? "") + "\n");
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  process.stderr.write("COMMANDER unhandledRejection: " + String(reason) + "\n");
  process.exit(1);
});

try {
  main();
} catch (err) {
  const msg = err instanceof Error ? err.message + "\n" + (err.stack ?? "") : String(err);
  process.stderr.write("COMMANDER failed to start: " + msg + "\n");
  logger.error("COMMANDER failed to start", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
}
