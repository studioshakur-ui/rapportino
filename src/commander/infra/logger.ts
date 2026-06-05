import type { CommanderLogger } from "../types";

function write(level: string, message: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    message,
    ...(meta ? { meta } : {}),
    ts: new Date().toISOString(),
  });
  console.log(line);
}

export function createCommanderLogger(): CommanderLogger {
  return {
    debug(message, meta) {
      write("debug", message, meta);
    },
    info(message, meta) {
      write("info", message, meta);
    },
    warn(message, meta) {
      write("warn", message, meta);
    },
    error(message, meta) {
      write("error", message, meta);
    },
  };
}
