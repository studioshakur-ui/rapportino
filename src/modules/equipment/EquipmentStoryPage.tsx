import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { loadEquipmentStory } from "./equipment.repo";
import { buildEquipmentBriefingContext } from "./equipment.logic";
import { EquipmentCableList } from "./components/EquipmentCableList";
import type { EquipmentRiskLevel } from "./equipment.types";
import { AppBar, EmptyState, Pill, Screen, Section, StatCard } from "../../components/command-ui";
import { formatCableDisplay } from "../../core/cable/cableDisplay";

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

  if (!equipmentCode) {
    return (
      <Screen>
        <EmptyState title="Code équipement manquant" description="Ouvrir un équipement depuis une liste ou une Cable Story." icon="!" />
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
          Chargement Equipment Story…
        </div>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100">
          Erreur de chargement équipement.
        </div>
      </Screen>
    );
  }

  const summary = data.summary;
  const connectedComplete = data.linked_cables.filter((cable) => cable.inca_status_code === "C").length;
  const posati = data.linked_cables.filter((cable) => cable.inca_status_code === "P").length;
  const blocked = data.linked_cables.filter((cable) => cable.inca_status_code === "B" || cable.open_blocker_count > 0).length;

  return (
    <Screen className="max-w-6xl space-y-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5">
        <AppBar
          title={equipmentCode}
          subtitle={`${summary.completion_rate}% complétion terrain · ${summary.confirmed_by_field} preuves terrain`}
          action={
            <div className="flex flex-wrap gap-2">
              <Pill tone={riskTone(summary.risk_level)}>Risque {summary.risk_level}</Pill>
              <button
                onClick={() => setShowContext((value) => !value)}
                className="min-h-10 rounded-xl border border-zinc-800 px-3 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-white"
              >
                {showContext ? "Masquer contexte" : "Contexte AI-ready"}
              </button>
            </div>
          }
        />
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Entrants" value={summary.incoming_cables} />
        <StatCard label="Sortants" value={summary.outgoing_cables} />
        <StatCard label="Confirmés" value={summary.confirmed_by_field} tone="emerald" />
        <StatCard label="Sans preuve" value={summary.without_field_evidence} tone={summary.without_field_evidence > 0 ? "amber" : "neutral"} />
        <StatCard label="Bloqués" value={blocked} tone={blocked > 0 ? "red" : "neutral"} />
        <StatCard label="Câbles liés" value={summary.total_cables} />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Section title="Avancement INCA" eyebrow="Statuts" className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
          <div className="space-y-2">
            {Object.entries(summary.status_distribution).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm">
                <span className="font-mono text-zinc-200">{status}</span>
                <span className="font-semibold text-white">{count}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Preuves terrain" eyebrow="Complétion" className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
          <div className="space-y-2 text-sm">
            <Line label="Confirmés terrain" value={summary.confirmed_by_field} />
            <Line label="Sans preuve terrain" value={summary.without_field_evidence} />
            <Line label="Taux de complétion" value={`${summary.completion_rate}%`} />
            <Line label="Posati INCA" value={posati} />
            <Line label="Collegati C" value={connectedComplete} />
          </div>
        </Section>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <EquipmentCableList title="Câbles entrants" cables={data.incoming} />
        <EquipmentCableList title="Câbles sortants" cables={data.outgoing} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Section title="Problèmes ouverts" eyebrow="Risques" count={data.open_problems.length} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
          {data.open_problems.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucun problème ouvert détecté.</p>
          ) : (
            <div className="space-y-2">
              {data.open_problems.slice(0, 12).map((cable) => (
                <Link key={cable.id} to={cable.cable_story_path} className="block rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm transition hover:border-red-400/40">
                  <span className="font-mono font-semibold text-white">{formatCableDisplay(cable.cable_code_normalized)}</span>
                  <span className="ml-2 text-red-200">{cable.risk_reasons.join(", ")}</span>
                </Link>
              ))}
            </div>
          )}
        </Section>

        <Section title="Actions recommandées" eyebrow="Terrain" count={summary.recommended_actions.length} className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
          {summary.recommended_actions.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucune action recommandée.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {summary.recommended_actions.map((action) => (
                <li key={action} className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-amber-200">
                  {action}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </section>

      {showContext && briefing ? (
        <Section title="Contexte AI-ready" eyebrow="Debug" className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
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
