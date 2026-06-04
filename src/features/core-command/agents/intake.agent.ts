// src/features/core-command/agents/intake.agent.ts
// Intake Agent V1 — deterministic pipeline.
// Steps: parse → import → insert messages → extract events → normalize → match → audit
// No AI. No writes to inca_cavi.

import { createWhatsAppImport, updateWhatsAppImportStatus } from "../api/whatsappImports.api";
import { bulkInsertMessages } from "../api/whatsappMessages.api";
import { bulkInsertCoreEvents } from "../api/coreEvents.api";
import { bulkInsertFindings } from "../api/agentFindings.api";
import { parseWhatsAppExport, messageHash } from "../intake/parseWhatsApp";
import { extractCableRefs } from "./normalizer.agent";
import { batchMatchCableCodes } from "./matcher.agent";
import { auditEvents } from "./auditor.agent";
import type { AgentResult, InsertCoreEvent, InsertWhatsAppMessage } from "../types";

// Re-export so callers import from one place
export { parseWhatsAppExport } from "../intake/parseWhatsApp";

export interface IntakeOptions {
  commessa?: string | null;
  group_name?: string | null;
}

export async function runIntakePipeline(
  file: File,
  opts: IntakeOptions = {}
): Promise<AgentResult> {
  const result: AgentResult = {
    agent: "intake",
    findings: [],
    events_created: 0,
    events_updated: 0,
    errors: [],
  };

  // 1. Read file
  let text: string;
  try {
    text = await file.text();
  } catch (e) {
    result.errors.push(`Lecture fichier échouée: ${String(e)}`);
    return result;
  }

  // 2. Parse
  const parsed = parseWhatsAppExport(text, file.name);
  result.errors.push(...parsed.errors);
  if (parsed.messages.length === 0) return result;

  // 3. Create whatsapp_import record
  let importRecord;
  try {
    importRecord = await createWhatsAppImport({
      file_name: file.name,
      group_name: opts.group_name ?? parsed.group_name,
      status: "draft",
      message_count: 0,
      raw_metadata: { commessa: opts.commessa ?? null },
    });
  } catch (e) {
    result.errors.push(`Création import échouée: ${String(e)}`);
    return result;
  }

  // 4. Insert messages
  const msgPayloads: InsertWhatsAppMessage[] = parsed.messages.map((m) => ({
    import_id: importRecord.id,
    message_ts: m.message_ts.toISOString(),
    author: m.author,
    raw_message: m.raw_message,
    media_type: m.media_type,
    media_filename: m.media_filename,
    message_hash: messageHash(m.message_ts, m.author, m.raw_message),
  }));

  let insertedMessages;
  try {
    insertedMessages = await bulkInsertMessages(msgPayloads);
  } catch (e) {
    await updateWhatsAppImportStatus(importRecord.id, "failed");
    result.errors.push(`Insert messages échoué: ${String(e)}`);
    return result;
  }

  await updateWhatsAppImportStatus(importRecord.id, "imported", insertedMessages.length);

  // 5. Extract cable refs + build core_events pending
  const cableCodesSet = new Set<string>();
  const eventPayloads: InsertCoreEvent[] = [];

  for (let i = 0; i < parsed.messages.length; i++) {
    const msg = parsed.messages[i];
    const dbMsg = insertedMessages[i];
    if (!dbMsg) continue;

    const refs = extractCableRefs(msg.raw_message);

    if (refs.length > 0) {
      for (const ref of refs) {
        cableCodesSet.add(ref.normalized);
        eventPayloads.push({
          event_type: "cable_mention",
          occurred_at: msg.message_ts.toISOString(),
          source: "whatsapp",
          source_message_id: dbMsg.id,
          cable_code_raw: ref.raw,
          cable_code_normalized: ref.normalized,
          commessa: opts.commessa ?? null,
          confidence: 0.6,
          validation_status: "pending",
          raw_text: msg.raw_message,
          payload: { author: msg.author },
        });
      }
    } else {
      // Generic info event — low confidence
      eventPayloads.push({
        event_type: "info",
        occurred_at: msg.message_ts.toISOString(),
        source: "whatsapp",
        source_message_id: dbMsg.id,
        commessa: opts.commessa ?? null,
        confidence: 0.2,
        validation_status: "pending",
        raw_text: msg.raw_message,
        payload: { author: msg.author },
      });
    }
  }

  // 6. Batch match cable codes → inca_cavi.id (read-only INCA)
  const matchMap = await batchMatchCableCodes([...cableCodesSet]);

  // Enrich events with inca_cavo_id where matched
  const enriched: InsertCoreEvent[] = eventPayloads.map((ev) => {
    if (ev.cable_code_normalized) {
      const match = matchMap.get(ev.cable_code_normalized);
      if (match?.matched) {
        return {
          ...ev,
          inca_cavo_id: match.inca_cavo_id,
          confidence: Math.max(ev.confidence ?? 0, match.confidence),
        };
      }
    }
    return ev;
  });

  // 7. Insert core_events
  let insertedEvents;
  try {
    insertedEvents = await bulkInsertCoreEvents(enriched);
    result.events_created = insertedEvents.length;
  } catch (e) {
    result.errors.push(`Insert events échoué: ${String(e)}`);
    return result;
  }

  // 8. Audit — generate agent_findings
  const findings = auditEvents(insertedEvents);
  if (findings.length > 0) {
    try {
      const inserted = await bulkInsertFindings(findings);
      result.findings = findings;
      void inserted;
    } catch (e) {
      result.errors.push(`Insert findings échoué (non bloquant): ${String(e)}`);
    }
  }

  return result;
}
