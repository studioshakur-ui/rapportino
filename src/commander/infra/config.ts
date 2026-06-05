import type { CommanderEnv } from "../types";

export type EnvSource = Record<string, string | undefined>;

function requireEnv(source: EnvSource, key: string): string {
  const value = source[key]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
}

function readCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadCommanderEnv(source: EnvSource): CommanderEnv {
  return {
    metaVerifyToken: requireEnv(source, "COMMANDER_META_VERIFY_TOKEN"),
    metaAppSecret: requireEnv(source, "COMMANDER_META_APP_SECRET"),
    metaApiVersion: source.COMMANDER_META_API_VERSION?.trim() || "v23.0",
    metaPhoneNumberId: requireEnv(source, "COMMANDER_META_PHONE_NUMBER_ID"),
    metaAccessToken: requireEnv(source, "COMMANDER_META_ACCESS_TOKEN"),
    internalApiBaseUrl: requireEnv(source, "COMMANDER_INTERNAL_API_BASE_URL"),
    internalApiToken: requireEnv(source, "COMMANDER_INTERNAL_API_TOKEN"),
    allowedGroupIds: readCsv(source.COMMANDER_ALLOWED_GROUP_IDS),
    allowedSenders: readCsv(source.COMMANDER_ALLOWED_SENDERS),
    commandPrefix: source.COMMANDER_COMMAND_PREFIX?.trim() || "#",
    requestTimeoutMs: readInt(source.COMMANDER_REQUEST_TIMEOUT_MS, 8000),
  };
}
