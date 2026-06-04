// apps/commander/src/commandRouter.ts
// Routes an extracted WhatsApp message into CORE Memory (PASSIVE ingestion).
//
// REUSE (no duplication): the pure CORE Memory Engine agents
//   - extractCableRefs  (normalizer.agent)
//   - classifyMessage   (classifier.agent)
// are imported directly. The DB-coupled agents (matcher, memoryEngine) are NOT
// run here: COMMANDER only ingests; the Memory Engine processes downstream.
import { extractCableRefs } from "../../../src/features/core-command/agents/normalizer.agent";
import { classifyMessage } from "../../../src/features/core-command/agents/classifier.agent";
import { persistIncoming, type PersistResult } from "./coreMemoryClient";
import { logger } from "./logger";
import type { MappedMessage } from "./whatsappMessageMapper";

export interface IngestionOutcome extends PersistResult {
  wamid: string;
  classification: string;
  cableRefs: number;
}

/**
 * Passive ingestion of a single mapped message. No WhatsApp reply (MVP).
 */
export async function ingestMessage(
  msg: MappedMessage,
  rawPayload: unknown
): Promise<IngestionOutcome> {
  const text = msg.text ?? "";
  const cableRefs = text ? extractCableRefs(text) : [];
  const classification = classifyMessage(text, msg.media_type);

  const res = await persistIncoming({
    wamid: msg.wamid,
    sender: msg.from,
    sender_name: msg.sender_name,
    message_ts: msg.timestamp,
    message_type: msg.message_type,
    text: msg.text,
    media_type: msg.media_type,
    cable_refs: cableRefs,
    classification,
    raw_payload: rawPayload,
  });

  logger.info("message ingested", {
    wamid: msg.wamid,
    sink: res.sink,
    kind: classification.kind,
    cableRefs: cableRefs.length,
  });

  return {
    ...res,
    wamid: msg.wamid,
    classification: classification.kind,
    cableRefs: cableRefs.length,
  };
}
