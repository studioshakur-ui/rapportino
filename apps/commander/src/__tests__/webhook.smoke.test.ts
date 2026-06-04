// COMMANDER smoke tests — Meta webhook handshake + signed ingest.
// Runs with the Node built-in test runner via tsx. No external test deps.
//   npm test
//
// Covers task acceptance: "test GET verify" + "test POST payload Meta simulé".
// Forces the audit-file sink (no Supabase env) so it is fully self-contained.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const VERIFY_TOKEN = "test-verify-token";
const APP_SECRET = "test-app-secret";
const AUDIT_FILE = join(tmpdir(), `commander-smoke-${process.pid}.jsonl`);

// Configure env BEFORE importing the server (config is read+cached on first use).
process.env.META_VERIFY_TOKEN = VERIFY_TOKEN;
process.env.META_APP_SECRET = APP_SECRET;
process.env.COMMANDER_AUDIT_FILE = AUDIT_FILE;
process.env.NODE_ENV = "test";
delete process.env.SUPABASE_URL; // force the JSONL audit fallback
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const { createServer } = await import("../server");

let server: Server;
let base: string;

before(async () => {
  await rm(AUDIT_FILE, { force: true });
  const app = createServer();
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(AUDIT_FILE, { force: true });
});

function sign(rawBody: string): string {
  return "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
}

test("GET /health → 200 ok", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { status: string; service: string };
  assert.equal(body.status, "ok");
  assert.equal(body.service, "commander");
});

test("GET verify → echoes hub.challenge with correct token", async () => {
  const url = `${base}/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=1234567890`;
  const res = await fetch(url);
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "1234567890");
});

test("GET verify → 403 on wrong token", async () => {
  const url = `${base}/webhooks/meta/whatsapp?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=nope`;
  const res = await fetch(url);
  assert.equal(res.status, 403);
});

test("POST ingest → 401 on bad signature", async () => {
  const res = await fetch(`${base}/webhooks/meta/whatsapp`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-hub-signature-256": "sha256=deadbeef" },
    body: JSON.stringify({ object: "whatsapp_business_account", entry: [] }),
  });
  assert.equal(res.status, 401);
});

test("POST ingest → 200 + writes audit row for a simulated Meta text message", async () => {
  const wamid = `wamid.SMOKE-${Date.now()}`;
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              contacts: [{ wa_id: "393331234567", profile: { name: "Hamidou" } }],
              messages: [
                {
                  id: wamid,
                  from: "393331234567",
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: "Cavo W1234 posato zona 3" },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const raw = JSON.stringify(payload);
  const res = await fetch(`${base}/webhooks/meta/whatsapp`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-hub-signature-256": sign(raw) },
    body: raw,
  });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "EVENT_RECEIVED");

  // Ingestion is async (Meta needs a fast 200); poll the audit file briefly.
  let found = false;
  for (let i = 0; i < 50 && !found; i++) {
    await new Promise((r) => setTimeout(r, 20));
    try {
      const content = await readFile(AUDIT_FILE, "utf8");
      found = content.includes(wamid);
    } catch {
      /* file not written yet */
    }
  }
  assert.ok(found, "expected the simulated message to be persisted to the audit sink");
});
