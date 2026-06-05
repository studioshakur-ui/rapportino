import type {
  CableStoryResponse,
  CableSummaryResponse,
  CommanderEnv,
  InternalApiClient,
  ParsedIncomingMessage,
  PrioritiesResponse,
  RiskSummaryResponse,
  TodaySummaryResponse,
  TomorrowSummaryResponse,
} from "../types";
import { CommanderHttpError } from "../infra/http";

async function readJson<T>(response: Response): Promise<T> {
  const bodyText = await response.text();
  const body = bodyText ? (JSON.parse(bodyText) as unknown) : null;
  if (!response.ok) {
    throw new CommanderHttpError(
      response.status,
      "internal_api_error",
      `Internal API call failed: ${response.status}`,
      body,
    );
  }
  return body as T;
}

function createHeaders(env: CommanderEnv): HeadersInit {
  return {
    "content-type": "application/json; charset=utf-8",
    authorization: `Bearer ${env.internalApiToken}`,
  };
}

async function callJson<T>(
  env: CommanderEnv,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.requestTimeoutMs);
  try {
    const response = await fetch(`${env.internalApiBaseUrl}${path}`, {
      ...init,
      headers: {
        ...createHeaders(env),
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });
    return await readJson<T>(response);
  } finally {
    clearTimeout(timeout);
  }
}

export function createInternalApiClient(env: CommanderEnv): InternalApiClient {
  return {
    async ingestWhatsAppMessage(message: ParsedIncomingMessage): Promise<void> {
      await callJson(env, "/internal/whatsapp/intake", {
        method: "POST",
        body: JSON.stringify({
          provider_event_id: message.providerEventId,
          wamid: message.wamid,
          sender: message.sender,
          sender_name: message.senderName,
          group_id: message.groupId,
          group_name: message.groupName,
          occurred_at: message.receivedAt,
          text: message.text,
          message_type: message.messageType,
          raw_payload: message.rawPayload,
        }),
      });
    },
    getCableSummary(code: string): Promise<CableSummaryResponse> {
      return callJson(env, `/internal/cable/${encodeURIComponent(code)}`);
    },
    getCableStory(code: string): Promise<CableStoryResponse> {
      return callJson(env, `/internal/cable/${encodeURIComponent(code)}/story`);
    },
    getPriorities(): Promise<PrioritiesResponse> {
      return callJson(env, "/internal/priorities");
    },
    getRiskSummary(): Promise<RiskSummaryResponse> {
      return callJson(env, "/internal/risk");
    },
    getTodaySummary(): Promise<TodaySummaryResponse> {
      return callJson(env, "/internal/today");
    },
    getTomorrowSummary(): Promise<TomorrowSummaryResponse> {
      return callJson(env, "/internal/tomorrow");
    },
  };
}
