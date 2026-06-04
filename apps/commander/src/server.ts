// apps/commander/src/server.ts
// Express app: Meta webhook (GET verify + POST ingest) and health.
import express, { type Request, type Response } from "express";
import { loadConfig } from "./config";
import { logger } from "./logger";
import { verifySubscription, verifySignature } from "./metaWebhook";
import { mapWhatsAppPayload, type MetaWebhookBody } from "./whatsappMessageMapper";
import { ingestMessage } from "./commandRouter";

// Capture raw body bytes for HMAC signature verification.
type RawReq = Request & { rawBody?: Buffer };

export function createServer() {
  const cfg = loadConfig();
  const app = express();

  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        (req as RawReq).rawBody = buf;
      },
    })
  );

  // --- Health -------------------------------------------------------------
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      service: "commander",
      supabase: cfg.supabaseEnabled ? "enabled" : "audit-fallback",
      ts: new Date().toISOString(),
    });
  });

  // --- Meta subscription handshake ---------------------------------------
  app.get("/webhooks/meta/whatsapp", (req: Request, res: Response) => {
    const challenge = verifySubscription(req.query as Record<string, string>, cfg.META_VERIFY_TOKEN);
    if (challenge) {
      logger.info("webhook subscription verified");
      res.status(200).type("text/plain").send(challenge);
      return;
    }
    logger.warn("webhook subscription verification failed");
    res.sendStatus(403);
  });

  // --- Meta inbound messages ---------------------------------------------
  app.post("/webhooks/meta/whatsapp", (req: RawReq, res: Response) => {
    const signature = req.header("x-hub-signature-256");
    const raw = req.rawBody ?? Buffer.from("");

    if (!verifySignature(raw, signature, cfg.META_APP_SECRET)) {
      logger.warn("invalid webhook signature");
      res.sendStatus(401);
      return;
    }

    const body = req.body as MetaWebhookBody;
    const messages = mapWhatsAppPayload(body);

    // Respond fast (Meta requires a quick 200), process ingestion async.
    res.status(200).type("text/plain").send("EVENT_RECEIVED");

    if (messages.length === 0) {
      logger.debug("no ingestible messages in payload");
      return;
    }

    void Promise.allSettled(messages.map((m) => ingestMessage(m, body))).then((results) => {
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      if (failures.length > 0) {
        for (const f of failures) {
          const reason = f.reason instanceof Error ? f.reason.message + "\n" + (f.reason.stack ?? "") : String(f.reason);
          logger.error(`ingestion rejected: ${reason}`);
        }
        logger.error(`some messages failed ingestion: ${failures.length}/${results.length}`);
      }
    });
  });

  return app;
}
