import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { loadEquipmentStory } from "./equipment.repo";
import { buildEquipmentBriefingContext } from "./equipment.logic";
import { buildEquipmentIntelligence } from "./equipment.intelligence";
import { EquipmentCableList } from "./components/EquipmentCableList";
import type { EquipmentRiskLevel } from "./equipment.types";
import { AppBar, EmptyState, Pill, Screen, Section, StatCard } from "../../components/command-ui";
import { formatCableDisplay } from "../../core/cable/cableDisplay";
import { ensureArray } from "../../core/utils/array";

function riskTone(risk: EquipmentRiskLevel): "emerald" | "amber" | "red" {
  if (risk === "low") return "emerald";
  if (risk === "medium") return "amber";
  return "red";
}

export default function EquipmentStoryPage(): JSX.Element {
  const { code } = useParams<{ code: string }>();
  const equipmentCode = code ? decodeURIComponent(code) : "";
  const [showContext, setShowContext] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["equipment_story", equipmentCode],
    queryFn: () => loadEquipmentStory(equipmentCode),
    enabled: Boolean(equipmentCode),
    staleTime: 30_000,
  });

  const briefing = useMemo(() => data ? buildEquipmentBriefingContext(data) : null, [data]);
  const intelligence = useMemo(() => {
    if (!data) return null;
    return buildEquipmentIntelligence(
      ensureArray(data.linked_cables, `equipmentStory.${equipmentCode}.linked_cables`).map((item) => ({
        item,
        inca: null,
        priority: undefined,
      }))
    ).find((entry) => entry.equipment_code === equipmentCode) ?? null;
  }, [data, equipmentCode]);

  if (!equipmentCode) {
    return (
      <Screen>
        <EmptyState title="Codice apparato mancante" description="Apri un apparato da una lista o da una Cable Story." icon="!" />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 text-sm text-zinc-400">
          <svg className="h-4 w-4 animate-spin text-sky-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Caricamento Equipment Story…
        </div>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100">
          Errore di caricamento apparato.
        </div>
      </Screen>
    );
  }

  const summary = data.summary;
  const linkedCables = ensureArray(data.linked_cables, `equipmentStory.${equipmentCode}.linked_cables`);
  const openProblems = ensureArray(data.open_problems, `equipmentStory.${equipmentCode}.open_problems`);
  const incoming = ensureArray(data.incoming, `equipmentStory.${equipmentCode}.incoming`);
  const outgoing = ensureArray(data.outgoing, `equipmentStory.${equipmentCode}.outgoing`);
  const recommendedActions = ensureArray(summary.recommended_actions, `equipmentStory.${equipmentCode}.recommended_actions`);
  const posati = linkedCables.filter((cable) => cable.inca_status_code === "P").length;
  const blocked = intelligence?.blocked_cables ?? linkedCables.filter((cable) => cable.inca_status_code === "B" || cable.open_blocker_count > 0).length;

  return (
    <Screen className="max-w-6xl space-y-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5">
        <AppBar
          title={equipmentCode}
          subtitle={`${intelligence?.closure_status ?? "OPEN"} · ${summary.confirmed_by_field}/${summary.total_cables} cavi confermati`}
          action={
            <div className="flex flex-wrap gap-2">
              <Pill tone={riskTone(summary.risk_level)}>Rischio {summary.risk_level}</Pill>
              {intelligence ? <Pill tone={intelligence.closure_status === "CLOSED" ? "emerald" : intelligence.closure_status === "PARTIAL" ? "amber" : "red"}>{intelligence.closure_status}</Pill> : null}
              <button
                onClick={() => setShowContext((value) => !value)}
                className="min-h-10 rounded-xl border border-zinc-800 px-3 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-white"
              >
                {showContext ? "Nascondi contesto" : "Contesto AI-ready"}
              </button>
            </div>
          }
        />
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Entranti" value={summary.incoming_cables} />
        <StatCard label="Uscenti" value={summary.outgoing_cables} />
        <StatCard label="Chiusura" value={intelligence?.closure_status ?? "OPEN"} tone={intelligence?.closure_status === "CLOSED" ? "emerald" : intelligence?.closure_status === "PARTIAL" ? "amber" : blocked > 0 ? "red" : "neutral"} />
        <StatCard label="Restanti" value={intelligence?.open_cables ?? Math.max(summary.total_cables - summary.confirmed_by_field, 0)} tone={(intelligence?.open_cables ?? 0) > 0 ? "amber" : "neutral"} />
        <StatCard label="Bloccati" value={blocked} tone={blocked > 0 ? "red" : "neutral"} />
        <StatCard label="Cavi collegati" value={summary.total_cables} />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Section title="Avanzamento INCA" eyebrow="Stati" className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
          <div className="space-y-2">
            {Object.entries(summary.status_distribution).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm">
                <span className="font-mono text-zinc-200">{status}</span>
                <span className="font-semibold text-white">{count}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Chiusura apparato" eyebrow="Closure Engine" className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
          <div className="space-y-2 text-sm">
            <Line label="Stato" value={intelligence?.closure_status ?? "OPEN"} />
            <Line label="Confermati terreno" value={summary.confirmed_by_field} />
            <Line label="Restanti" value={intelligence?.open_cables ?? Math.max(summary.total_cables - summary.confirmed_by_field, 0)} />
            <Line label="Posati INCA" value={posati} />
            <Line label="Tasso indicativo" value={`${summary.completion_rate}%`} />
          </div>
        </Section>
      </section>

      {intelligence?.critical_path.length ? (
        <Section title="Percorso critico" eyebrow="Cavi bloccanti" count={intelligence.critical_path.length} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
          <div className="space-y-2">
            {intelligence.critical_path.slice(0, 8).map((blocker) => (
              <div key={blocker.cable_code} className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm">
                <span className="font-mono font-semibold text-white">{formatCableDisplay(blocker.cable_code)}</span>
                <span className="ml-2 text-red-200">{blocker.reason}</span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <EquipmentCableList title="Cavi entranti" cables={incoming} />
        <EquipmentCableList title="Cavi uscenti" cables={outgoing} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Section title="Problemi aperti" eyebrow="Rischi" count={openProblems.length} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
          {openProblems.length === 0 ? (
            <p className="text-sm text-zinc-400">Nessun problema aperto rilevato.</p>
          ) : (
            <div className="space-y-2">
              {openProblems.slice(0, 12).map((cable) => (
                <Link key={cable.id} to={cable.cable_story_path} className="block rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm transition hover:border-red-400/40">
                  <span className="font-mono font-semibold text-white">{formatCableDisplay(cable.cable_code_normalized)}</span>
                  <span className="ml-2 text-red-200">{cable.risk_reasons.join(", ")}</span>
                </Link>
              ))}
            </div>
          )}
        </Section>

        <Section title="Azioni raccomandate" eyebrow="Campo" count={recommendedActions.length} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
          {recommendedActions.length === 0 ? (
            <p className="text-sm text-zinc-400">Nessuna azione raccomandata.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recommendedActions.map((action) => (
                <li key={action} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-amber-200">
                  {action}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </section>

      {showContext && briefing ? (
        <Section title="Contesto AI-ready" eyebrow="Debug" className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
          <pre className="max-h-96 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-[11px] text-zinc-300">
            {JSON.stringify(briefing, null, 2)}
          </pre>
        </Section>
      ) : null}
    </Screen>
  );
}

function Line({ label, value }: { label: string; value: number | string }): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
      <span className="text-zinc-500">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
