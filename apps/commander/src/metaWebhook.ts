// apps/commander/src/metaWebhook.ts
// Meta (WhatsApp Cloud API) webhook security helpers.
import crypto from "node:crypto";

// --- GET verification (subscription handshake) ---------------------------
export interface SubscriptionQuery {
  "hub.mode"?: string;
  "hub.verify_token"?: string;
  "hub.challenge"?: string;
}

/**
 * Returns the challenge string to echo back when the subscription request is
 * valid, otherwise null. Meta sends ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 */
export function verifySubscription(
  query: SubscriptionQuery,
  expectedVerifyToken: string
): string | null {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];
  if (mode === "subscribe" && token && token === expectedVerifyToken && challenge) {
    return challenge;
  }
  return null;
}

// --- POST signature verification (X-Hub-Signature-256) -------------------
/**
 * Verifies the 'X-Hub-Signature-256: sha256=<hex>' header against the RAW body
 * using HMAC-SHA256 keyed by the Meta app secret. Constant-time comparison.
 */
export function verifySignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
