// apps/commander/src/logger.ts
// Minimal dependency-free structured JSON logger.
type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN: Level = (process.env.COMMANDER_LOG_LEVEL as Level) || "info";

function emit(level: Level, msg: string, meta?: Record<string, unknown>): void {
  if (ORDER[level] < ORDER[MIN]) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    service: "commander",
    msg,
    ...(meta ?? {}),
  };
  const out = JSON.stringify(line);
  if (level === "error") process.stderr.write(out + "\n");
  else process.stdout.write(out + "\n");
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};
