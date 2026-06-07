import { useState } from "react";
import { AppBar, EmptyState, Pill, Screen, Section, StatCard, Btn } from "../../../components/command-ui";
import type { DailySituationView } from "../../../domain/core-engine/dailySituation";

export function SituazioneView({ situation }: { situation: DailySituationView | null }): JSX.Element {
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

  if (!situation) {
    return (
      <Screen className="max-w-5xl space-y-6">
        <AppBar title="Situazione 16:30" subtitle="Preparazione del messaggio operativo di fine giornata." />
        <EmptyState
          title="Nessun dato disponibile"
          description="Il core-engine non ha ancora uno snapshot situazione da mostrare."
          icon="📝"
        />
      </Screen>
    );
  }

  return (
    <Screen className="max-w-5xl space-y-6">
      <AppBar
        title="Situazione 16:30"
        subtitle="Vista minimale per preparare il messaggio operativo da inviare a fine giornata."
        action={<Pill tone="emerald">{situation.listName ?? "Lista non disponibile"}</Pill>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Lista" value={situation.listName ?? "N/D"} tone="neutral" />
        <StatCard label="Totale cavi" value={situation.totals.totalCables} tone="neutral" />
        <StatCard label="Verificati campo" value={situation.totals.verifiedCables} tone="emerald" />
        <StatCard label="Da verificare" value={situation.totals.toVerifyCables} tone={situation.totals.toVerifyCables > 0 ? "amber" : "emerald"} />
        <StatCard label="Restanti" value={situation.totals.remainingCables} tone={situation.totals.remainingCables > 0 ? "amber" : "emerald"} />
        <StatCard label="Bloccati INCA" value={situation.totals.blockedCables} tone={situation.totals.blockedCables > 0 ? "red" : "neutral"} />
        <StatCard label="Prove mancanti" value={situation.totals.withoutFieldEvidence} tone={situation.totals.withoutFieldEvidence > 0 ? "amber" : "emerald"} />
      </div>

      <Section title="Cavi da verificare" eyebrow="Situazione" count={situation.toVerifyCables.length}>
        {situation.toVerifyCables.length === 0 ? (
          <EmptyState title="Nessun cavo da verificare" icon="✓" />
        ) : (
          <div className="space-y-3">
            {situation.toVerifyCables.map((item) => (
              <article key={`${item.cableCode}-${item.reason}-${item.system ?? "sys"}`} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-stone-950">{item.displayCableCode}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {[item.apparatusCode, item.system].filter(Boolean).join(" · ") || "Contesto non disponibile"}
                    </p>
                  </div>
                  <Pill tone="amber">Verifica</Pill>
                </div>
                <p className="mt-2 text-sm text-stone-700">{item.reason}</p>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title="Apparati non chiusi" eyebrow="Apparati" count={situation.impactedApparatus.length}>
        {situation.impactedApparatus.length === 0 ? (
          <EmptyState title="Nessun apparato non chiuso" icon="✓" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {situation.impactedApparatus.map((apparatus) => (
              <article key={apparatus.equipmentCode} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">{apparatus.equipmentCode}</p>
                    {apparatus.system ? <p className="mt-1 text-sm text-stone-600">{apparatus.system}</p> : null}
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">{apparatus.closureStatus}</p>
                  </div>
                  {apparatus.riskLevel ? <Pill tone={apparatus.riskLevel === "critical" ? "red" : apparatus.riskLevel === "high" ? "amber" : "neutral"}>{apparatus.riskLevel}</Pill> : null}
                </div>
                <p className="mt-3 text-sm text-stone-700">
                  {apparatus.openCables} aperti · {apparatus.blockedCables} bloccati
                </p>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title="Sistemi impattati" eyebrow="Sistema" count={situation.impactedSystems.length}>
        {situation.impactedSystems.length === 0 ? (
          <EmptyState title="Nessun sistema impattato" icon="✓" />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {situation.impactedSystems.map((system) => (
              <article key={system.systemName} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">{system.systemName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">{system.status}</p>
                  </div>
                  <Pill tone={system.status === "BLOCKED" ? "red" : "amber"}>{system.status}</Pill>
                </div>
                <p className="mt-3 text-sm text-stone-700">
                  {system.openEquipments} aperti · {system.blockedEquipments} bloccati
                </p>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title="Blocchi reali" eyebrow="Situazione" count={situation.realBlockers.length}>
        {situation.realBlockers.length === 0 ? (
          <EmptyState title="Nessun blocco reale dichiarato" icon="✓" />
        ) : (
          <div className="space-y-3">
            {situation.realBlockers.map((blocker) => (
              <article key={`${blocker.cableCode}-${blocker.reason}`} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-stone-950">{blocker.displayCableCode}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {[blocker.apparatusCode, blocker.system].filter(Boolean).join(" · ") || "Contesto non disponibile"}
                    </p>
                  </div>
                  <Pill tone="red">Blocco reale</Pill>
                </div>
                <p className="mt-2 text-sm text-stone-700">{blocker.reason}</p>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title="Prove campo" eyebrow="Campo" count={situation.fieldEvidenceGroups.length}>
        {situation.fieldEvidenceGroups.length === 0 ? (
          <EmptyState title="Nessuna prova campo disponibile" icon="📋" />
        ) : (
          <div className="space-y-3">
            {situation.fieldEvidenceGroups.map((group) => (
              <article key={`${group.source}-${group.timestamp ?? "no-ts"}-${group.cableCodes.join(",")}`} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">{group.timestamp ? `${new Date(group.timestamp).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Rome" })}` : "--:--"}</p>
                    <p className="mt-1 text-sm text-stone-600">{group.source}</p>
                  </div>
                  <Pill tone="sky">{group.count}</Pill>
                </div>
                <p className="mt-2 text-sm text-stone-700">{group.summary}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">{group.cableCodes.join(", ")}</p>
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title="Azioni proposte" eyebrow="Operativo" count={situation.recommendedActions.length}>
        {situation.recommendedActions.length === 0 ? (
          <EmptyState title="Nessuna azione proposta" icon="✓" />
        ) : (
          <div className="space-y-3">
            {situation.recommendedActions.map((action) => (
              <article key={action} className="rounded-[20px] border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-700 shadow-sm">
                {action}
              </article>
            ))}
          </div>
        )}
      </Section>

      <Section title="Testo pronto da inviare" eyebrow="Messaggio" className="space-y-3">
        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-stone-800">{situation.messageToSend}</pre>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Btn onClick={() => void copyText()} variant="secondary" className="w-full sm:w-auto">
              Copia testo
            </Btn>
            {copyFeedback ? <p className="text-sm font-medium text-emerald-700">{copyFeedback}</p> : null}
          </div>
        </div>
      </Section>
    </Screen>
  );
}
