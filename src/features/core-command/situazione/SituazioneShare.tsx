import { useState } from "react";
import { Btn, EmptyState } from "../../../components/command-ui";
import type { DailySituationView } from "../../../domain/core-engine/dailySituation";

export function SituazioneShare({ situation }: { situation: DailySituationView | null }): JSX.Element {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  async function copyText(): Promise<void> {
    if (!situation) return;
    try {
      await navigator.clipboard.writeText(situation.messageToSend);
      setCopyFeedback("Testo copiato");
    } catch {
      setCopyFeedback("Copia non riuscita");
    }
  }

  function openShare(target: "telegram" | "whatsapp"): void {
    if (!situation) return;
    const encoded = encodeURIComponent(situation.messageToSend);
    const url = target === "telegram" ? `https://t.me/share/url?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!situation) {
    return (
      <EmptyState
        title="Nessun testo disponibile"
        description="Il core-engine non ha ancora preparato il messaggio delle 16:30."
        icon="16:30"
      />
    );
  }

  return (
    <div className="theme-card-surface rounded-[28px] p-5">
      <pre className="whitespace-pre-wrap break-words text-sm leading-6 theme-token-text">{situation.messageToSend}</pre>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Btn onClick={() => void copyText()} className="w-full">
          Copia
        </Btn>
        <Btn onClick={() => openShare("telegram")} variant="secondary" className="w-full">
          Telegram
        </Btn>
        <Btn onClick={() => openShare("whatsapp")} variant="secondary" className="w-full">
          WhatsApp
        </Btn>
      </div>
      {copyFeedback ? <p className="mt-3 text-sm font-medium" style={{ color: "var(--stato-consegnato)" }}>{copyFeedback}</p> : null}
    </div>
  );
}
