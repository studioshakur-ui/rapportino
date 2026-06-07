// src/domain/telegram-impact.ts — Impatto Telegram
// Arricchisce i messaggi Telegram con lo stato dominio dei cavi referenziati.

import type { TelegramLiveMessage } from "../features/core-command/api/telegramMessages.api";
import type { DailyListItemVM } from "../modules/daily-lists/dailyLists.types";
import { STATO_CAVO } from "./dizionario";

export interface ImpattoCavo {
  codice_cavo: string;
  stato: string;
  stato_label: string;
  perimetro: string | null;
  bloccante: boolean;
}

export interface ImpattoTelegram {
  messaggio_id: string;
  mittente: string;
  testo: string;
  data: string | null;
  cavi_impattati: ImpattoCavo[];
  ha_cavi_bloccanti: boolean;
  ha_riferimenti_cavi: boolean;
}

export function buildImpattiTelegram(
  messages: TelegramLiveMessage[],
  items: DailyListItemVM[]
): ImpattoTelegram[] {
  const itemByCode = new Map<string, DailyListItemVM>();
  for (const item of items) {
    itemByCode.set(item.cable_code_normalized.toUpperCase(), item);
  }

  return messages.map((msg) => {
    const caviImpattati: ImpattoCavo[] = msg.cable_refs.map((code) => {
      const item = itemByCode.get(code.toUpperCase());
      const stato = item?.computed_status ?? "unknown";
      return {
        codice_cavo: code,
        stato,
        stato_label: STATO_CAVO[stato] ?? stato,
        perimetro: item?.perimetro ?? null,
        bloccante:
          stato === "blocked" ||
          Boolean(item?.has_short_issue) ||
          Boolean(item?.has_missing_issue),
      };
    });

    return {
      messaggio_id: msg.id,
      mittente: msg.sender_name ?? "Telegram",
      testo: msg.text ?? "",
      data: msg.message_ts ?? msg.created_at,
      cavi_impattati: caviImpattati,
      ha_cavi_bloccanti: caviImpattati.some((c) => c.bloccante),
      ha_riferimenti_cavi: caviImpattati.length > 0,
    } satisfies ImpattoTelegram;
  });
}
