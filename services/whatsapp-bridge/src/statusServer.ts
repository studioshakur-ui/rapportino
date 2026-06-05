// src/statusServer.ts — mini serveur HTTP de monitoring
// Accessible sur http://localhost:3099/status
// Permet à CORE COMMAND de vérifier si le bridge est vivant.

import http from "http";
import { CONFIG } from "./config.js";

export interface BridgeState {
  status:           "starting" | "qr_pending" | "connected" | "disconnected" | "error";
  phone:            string | null;
  connected_at:     string | null;
  messages_today:   number;
  last_message_at:  string | null;
  watched_groups:   string[];
  error_message:    string | null;
}

let state: BridgeState = {
  status:          "starting",
  phone:           null,
  connected_at:    null,
  messages_today:  0,
  last_message_at: null,
  watched_groups:  CONFIG.WATCH_GROUPS,
  error_message:   null,
};

export function updateState(patch: Partial<BridgeState>): void {
  state = { ...state, ...patch };
}

export function incrementMessages(): void {
  state.messages_today++;
  state.last_message_at = new Date().toISOString();
}

export function startStatusServer(): void {
  const server = http.createServer((_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.statusCode = 200;
    res.end(JSON.stringify({ ...state, uptime_s: Math.round(process.uptime()) }, null, 2));
  });

  server.listen(CONFIG.STATUS_PORT, () => {
    console.log(`📡 Status server: http://localhost:${CONFIG.STATUS_PORT}/`);
  });
}
