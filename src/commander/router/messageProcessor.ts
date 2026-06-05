import { isAllowedIngress } from "../infra/allowlist";
import { CommanderHttpError } from "../infra/http";
import { routeIncomingText } from "./commandRouter";
import { handleCommanderCommand } from "../commands/commandHandlers";
import type {
  CommanderEnv,
  CommanderLogger,
  CommanderMetrics,
  InternalApiClient,
  OutboundMessageRequest,
  ParsedIncomingMessage,
} from "../types";

export interface OutboundTransport {
  sendMessage(request: OutboundMessageRequest): Promise<void>;
}

export async function processIncomingMessage(
  message: ParsedIncomingMessage,
  env: CommanderEnv,
  api: InternalApiClient,
  outbound: OutboundTransport,
  logger: CommanderLogger,
  metrics: CommanderMetrics,
): Promise<"processed" | "ignored"> {
  if (!isAllowedIngress(message, env)) {
    logger.warn("Ingress ignored by allowlist", {
      sender: message.sender,
      group_id: message.groupId,
    });
    metrics.increment("commander_ingress_ignored_total", 1, { reason: "allowlist" });
    return "ignored";
  }

  const routed = routeIncomingText(message.text, env);
  metrics.increment("commander_ingress_total", 1, {
    kind: routed.kind,
    command: routed.command ?? "none",
  });

  if (routed.kind === "free_text") {
    await api.ingestWhatsAppMessage(message);
    return "processed";
  }

  if (routed.kind === "unsupported") {
    return "ignored";
  }

  if (!routed.command) {
    throw new CommanderHttpError(500, "router_error", "Command route missing command");
  }

  const reply = await handleCommanderCommand(routed.command, routed.argument, api);
  await outbound.sendMessage({
    to: message.sender,
    text: reply,
  });
  return "processed";
}
