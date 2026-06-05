import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { EnvSource } from "./config";

function parseLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const index = trimmed.indexOf("=");
  if (index <= 0) {
    return null;
  }

  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

export function loadEnvFile(fileName = ".env"): EnvSource {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, "utf8");
  const pairs = content
    .split(/\r?\n/)
    .map(parseLine)
    .filter((entry: [string, string] | null): entry is [string, string] => entry !== null);

  return Object.fromEntries(pairs);
}
