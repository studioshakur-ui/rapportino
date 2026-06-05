import { loadCommanderEnv } from "./infra/config";
import { loadEnvFile } from "./infra/envFile";
import { createCommanderLogger } from "./infra/logger";
import { createMemoryIngressStore } from "./infra/memoryIngressStore";
import { createNodeServer } from "./infra/nodeHttp";
import { jsonResponse } from "./infra/http";
import { handleMetaWhatsAppWebhook } from "./webhooks/metaWebhookHandler";
import type { Json } from "../types/supabase.generated";

function loadRuntimeEnv() {
  return {
    ...loadEnvFile(".env"),
    ...(process.env as Record<string, string | undefined>),
  };
}

async function main() {
  const rawEnv = loadRuntimeEnv();
  const env = loadCommanderEnv(rawEnv);
  const port = Number.parseInt(rawEnv.COMMANDER_PORT ?? "8787", 10);
  const host = rawEnv.COMMANDER_HOST ?? "0.0.0.0";
  const logger = createCommanderLogger();
  const ingressStore = createMemoryIngressStore();
  const baseUrl = `http://${host}:${port}`;

  const server = createNodeServer(baseUrl, async (request) => {
    const { pathname } = new URL(request.url);

    if (pathname === "/health") {
      return jsonResponse(200, {
        ok: true,
        service: "commander",
        ingress_records: ingressStore.list().length,
      } as Json);
    }

    if (pathname === "/debug/ingress") {
      return jsonResponse(200, ingressStore.list());
    }

    if (pathname === "/webhooks/meta/whatsapp") {
      return handleMetaWhatsAppWebhook(request, env, ingressStore);
    }

    return jsonResponse(404, {
      code: "not_found",
      message: "Route not found",
    });
  });

  server.listen(port, host, () => {
    logger.info("Commander server listening", {
      host,
      port,
      webhook_path: "/webhooks/meta/whatsapp",
      health_path: "/health",
    });
  });
}

void main();
