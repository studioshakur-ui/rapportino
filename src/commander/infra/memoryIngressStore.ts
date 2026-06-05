import type {
  IncomingMessageRecord,
  IngressProcessingStatus,
  IngressStore,
  ParsedIncomingMessage,
} from "../types";

interface MemoryIngressStoreOptions {
  maxEntries?: number;
}

export function createMemoryIngressStore(
  options: MemoryIngressStoreOptions = {},
): IngressStore {
  const maxEntries = options.maxEntries ?? 5000;
  const records = new Map<string, IncomingMessageRecord>();

  function trimIfNeeded() {
    while (records.size > maxEntries) {
      const oldestKey = records.keys().next().value as string | undefined;
      if (!oldestKey) {
        break;
      }
      records.delete(oldestKey);
    }
  }

  function toRecord(
    message: ParsedIncomingMessage,
    status: IngressProcessingStatus,
  ): IncomingMessageRecord {
    return {
      provider_event_id: message.providerEventId,
      wamid: message.wamid,
      sender: message.sender,
      sender_name: message.senderName,
      group_id: message.groupId,
      group_name: message.groupName,
      message_type: message.messageType,
      message_text: message.text,
      received_at: message.receivedAt,
      raw_payload: message.rawPayload,
      processing_status: status,
      processing_attempts: 1,
      last_error: null,
    };
  }

  return {
    has(providerEventId: string): boolean {
      return records.has(providerEventId);
    },
    record(message: ParsedIncomingMessage, status: IngressProcessingStatus): void {
      const current = records.get(message.providerEventId);
      if (current) {
        current.processing_attempts += 1;
        current.processing_status = status;
        current.message_text = message.text;
        current.raw_payload = message.rawPayload;
        current.last_error = null;
      } else {
        records.set(message.providerEventId, toRecord(message, status));
        trimIfNeeded();
      }
    },
    mark(providerEventId: string, status: IngressProcessingStatus, lastError?: string | null): void {
      const current = records.get(providerEventId);
      if (!current) {
        return;
      }
      current.processing_status = status;
      current.last_error = lastError ?? null;
    },
    list(): IncomingMessageRecord[] {
      return [...records.values()].sort((a, b) => b.received_at.localeCompare(a.received_at));
    },
  };
}
