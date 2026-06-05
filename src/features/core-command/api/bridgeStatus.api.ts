// src/features/core-command/api/bridgeStatus.api.ts
// Polling du statut du WhatsApp bridge local.
// Le bridge expose http://localhost:3099/ — CORE COMMAND le surveille.

// Port 3098 = Telegram bridge (défaut), 3099 = WhatsApp bridge
const BRIDGE_URL = import.meta.env.VITE_BRIDGE_STATUS_URL ?? "http://localhost:3098/";

export type BridgeStatus = "starting" | "qr_pending" | "connected" | "disconnected" | "error" | "unreachable";

export interface BridgeState {
  status:           BridgeStatus;
  phone:            string | null;
  connected_at:     string | null;
  messages_today:   number;
  last_message_at:  string | null;
  watched_groups:   string[];
  error_message:    string | null;
  uptime_s:         number;
}

export async function fetchBridgeStatus(): Promise<BridgeState> {
  try {
    const res = await fetch(BRIDGE_URL, { signal: AbortSignal.timeout(3_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as BridgeState;
  } catch {
    return {
      status:          "unreachable",
      phone:           null,
      connected_at:    null,
      messages_today:  0,
      last_message_at: null,
      watched_groups:  [],
      error_message:   "Bridge non joignable",
      uptime_s:        0,
    };
  }
}
