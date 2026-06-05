import type { Json } from "../types/supabase.generated";

export type CommanderCommandName =
  | "cable"
  | "story"
  | "priority"
  | "risk"
  | "today"
  | "tomorrow";

export type CommanderMessageKind = "free_text" | "command" | "unsupported";

export type IngressProcessingStatus =
  | "received"
  | "queued"
  | "processed"
  | "ignored"
  | "failed"
  | "dead_letter";

export interface CommanderEnv {
  metaVerifyToken: string;
  metaAppSecret: string;
  metaApiVersion: string;
  metaPhoneNumberId: string;
  metaAccessToken: string;
  internalApiBaseUrl: string;
  internalApiToken: string;
  allowedGroupIds: string[];
  allowedSenders: string[];
  commandPrefix: string;
  requestTimeoutMs: number;
}

export interface IncomingMessageRecord {
  provider_event_id: string;
  wamid: string | null;
  sender: string;
  sender_name: string | null;
  group_id: string | null;
  group_name: string | null;
  message_type: string;
  message_text: string | null;
  received_at: string;
  raw_payload: Json;
  processing_status: IngressProcessingStatus;
  processing_attempts: number;
  last_error: string | null;
}

export interface ParsedIncomingMessage {
  providerEventId: string;
  wamid: string | null;
  sender: string;
  senderName: string | null;
  groupId: string | null;
  groupName: string | null;
  messageType: string;
  text: string | null;
  receivedAt: string;
  rawPayload: Json;
}

export interface RoutedMessage {
  kind: CommanderMessageKind;
  command: CommanderCommandName | null;
  argument: string | null;
  normalizedText: string;
}

export interface CommanderHttpResponse {
  status: number;
  headers?: Record<string, string>;
  body?: string;
}

export interface CommanderLogger {
  debug(message: string, meta?: Record<string, Json>): void;
  info(message: string, meta?: Record<string, Json>): void;
  warn(message: string, meta?: Record<string, Json>): void;
  error(message: string, meta?: Record<string, Json>): void;
}

export interface InternalApiErrorShape {
  code: string;
  message: string;
  details?: Json;
}

export interface CableSummaryResponse {
  code: string;
  status: string | null;
  confidence: number | null;
  last_signal_at: string | null;
  last_signal_text: string | null;
  inca_found: boolean;
  open_priorities_count: number;
}

export interface CableStoryResponse {
  code: string;
  headline: string;
  first_signal: string | null;
  major_events: string[];
  last_signal: string | null;
}

export interface PriorityItem {
  cable_code: string;
  priority: "low" | "medium" | "high" | "critical";
  reason: string | null;
}

export interface PrioritiesResponse {
  top: PriorityItem[];
  critical: PriorityItem[];
  counts: {
    open: number;
    critical: number;
  };
}

export interface RiskItem {
  cable_code: string;
  reason: string;
}

export interface RiskSummaryResponse {
  short_cables: RiskItem[];
  missing_cables: RiskItem[];
  contradictions: RiskItem[];
  unconfirmed: RiskItem[];
  zones: string[];
}

export interface TodaySummaryResponse {
  messages_today: number;
  active_cables: number;
  problems: string[];
  priorities: string[];
  plain_language_summary: string;
}

export interface TomorrowSummaryResponse {
  recommended_actions: string[];
  priority_zones: string[];
  people_to_contact: string[];
  blocking_risks: string[];
}

export interface InternalApiClient {
  ingestWhatsAppMessage(message: ParsedIncomingMessage): Promise<void>;
  getCableSummary(code: string): Promise<CableSummaryResponse>;
  getCableStory(code: string): Promise<CableStoryResponse>;
  getPriorities(): Promise<PrioritiesResponse>;
  getRiskSummary(): Promise<RiskSummaryResponse>;
  getTodaySummary(): Promise<TodaySummaryResponse>;
  getTomorrowSummary(): Promise<TomorrowSummaryResponse>;
}

export interface OutboundMessageRequest {
  to: string;
  text: string;
}

export interface CommanderMetrics {
  increment(
    metric: string,
    value?: number,
    tags?: Record<string, string | number | boolean>,
  ): void;
  observe(
    metric: string,
    value: number,
    tags?: Record<string, string | number | boolean>,
  ): void;
}

export interface IngressStore {
  has(providerEventId: string): boolean;
  record(message: ParsedIncomingMessage, status: IngressProcessingStatus): void;
  mark(providerEventId: string, status: IngressProcessingStatus, lastError?: string | null): void;
  list(): IncomingMessageRecord[];
}
