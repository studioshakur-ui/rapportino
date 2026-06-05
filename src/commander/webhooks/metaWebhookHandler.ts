import { errorResponse, jsonResponse, textResponse } from "../infra/http";
import { verifyMetaSignature } from "../infra/metaSignature";
import { extractIncomingMessages } from "./metaPayload";
import { createMetaWhatsAppTransport } from "./metaOutbound";
import { createCommanderLogger } from "../infra/logger";
import { createNoopMetrics } from "../infra/metrics";
import { createInternalApiClient } from "../memory/internalApiClient";
import { processIncomingMessage } from "../router/messageProcessor";
import type {
  CommanderEnv,
  CommanderHttpResponse,
  IngressStore,
  ParsedIncomingMessage,
} from "../types";

async function handleVerifyRequest(
  request: Request,
  env: CommanderEnv,
): Promise<CommanderHttpResponse> {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const challenge = url.searchParams.get("hub.challenge");
  const token = url.searchParams.get("hub.verify_token");

  if (mode === "subscribe" && token === env.metaVerifyToken && challenge) {
    return textResponse(200, challenge);
  }

  return jsonResponse(403, {
    code: "verify_failed",
    message: "Meta webhook verification failed",
  });
}

async function parseBody(request: Request): Promise<{ rawBody: string; payload: unknown }> {
  const rawBody = await request.text();
  const payload = rawBody ? (JSON.parse(rawBody) as unknown) : {};
  return { rawBody, payload };
}

async function handleReceiveRequest(
  request: Request,
  env: CommanderEnv,
  ingressStore: IngressStore,
): Promise<CommanderHttpResponse> {
  const logger = createCommanderLogger();
  const metrics = createNoopMetrics();
  const signature = request.headers.get("x-hub-signature-256");
  const { rawBody, payload } = await parseBody(request);

  const valid = await verifyMetaSignature(rawBody, signature, env.metaAppSecret);
  if (!valid) {
    return jsonResponse(401, {
      code: "invalid_signature",
      message: "Invalid Meta signature",
    });
  }

  const api = createInternalApiClient(env);
  const outbound = createMetaWhatsAppTransport(env);
  const incomingMessages = extractIncomingMessages(payload as ParsedIncomingMessage["rawPayload"]);

  for (const message of incomingMessages) {
    if (ingressStore.has(message.providerEventId)) {
      logger.info("Skipping duplicate Meta event", {
        provider_event_id: message.providerEventId,
        wamid: message.wamid,
      });
      metrics.increment("commander_ingress_duplicate_total", 1);
      continue;
    }

    ingressStore.record(message, "received");
    try {
      await processIncomingMessage(message, env, api, outbound, logger, metrics);
      ingressStore.mark(message.providerEventId, "processed");
    } catch (error) {
      ingressStore.mark(
        message.providerEventId,
        "failed",
        error instanceof Error ? error.message : "Unknown processing error",
      );
      throw error;
    }
  }

  return jsonResponse(200, { ok: true, processed: incomingMessages.length });
}

export async function handleMetaWhatsAppWebhook(
  request: Request,
  env: CommanderEnv,
  ingressStore: IngressStore,
): Promise<CommanderHttpResponse> {
  try {
    if (request.method === "GET") {
      return await handleVerifyRequest(request, env);
    }

    if (request.method === "POST") {
      return await handleReceiveRequest(request, env, ingressStore);
    }

    return jsonResponse(405, {
      code: "method_not_allowed",
      message: "Method not allowed",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
