import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { loadEquipmentStory } from "./equipment.repo";
import { buildEquipmentBriefingContext } from "./equipment.logic";
import { EquipmentCableList } from "./components/EquipmentCableList";
import type { EquipmentRiskLevel } from "./equipment.types";

const RISK_TONE: Record<EquipmentRiskLevel, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  medium: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  high: "border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
  critical: "border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
};

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
    return <div className="p-6 text-red-500">Code équipement manquant.</div>;
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-zinc-400">Chargement Equipment Story…</div>;
  }

  if (isError || !data) {
    return <div className="p-6 text-sm text-red-500">Erreur de chargement équipement.</div>;
  }

  const summary = data.summary;
  const connectedComplete = data.linked_cables.filter((cable) => cable.inca_status_code === "C").length;
  const posati = data.linked_cables.filter((cable) => cable.inca_status_code === "P").length;
  const blocked = data.linked_cables.filter((cable) => cable.inca_status_code === "B" || cable.open_blocker_count > 0).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-400">Equipment Story</div>
            <h1 className="mt-1 font-mono text-3xl font-bold">{equipmentCode}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${RISK_TONE[summary.risk_level]}`}>
                Risque {summary.risk_level}
              </span>
              <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                {summary.completion_rate}% complétion terrain
              </span>
              <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                {summary.confirmed_by_field} preuves terrain
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowContext((value) => !value)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {showContext ? "Masquer contexte" : "Contexte AI-ready"}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
        <Metric label="Câbles liés" value={summary.total_cables} />
        <Metric label="Entrants" value={summary.incoming_cables} />
        <Metric label="Sortants" value={summary.outgoing_cables} />
        <Metric label="Posati" value={posati} />
        <Metric label="Collegati C" value={connectedComplete} />
        <Metric label="Bloqués" value={blocked} accent={blocked > 0 ? "red" : undefined} />
        <Metric label="Sans preuve" value={summary.without_field_evidence} accent={summary.without_field_evidence > 0 ? "amber" : undefined} />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Avancement INCA">
          <div className="space-y-2">
            {Object.entries(summary.status_distribution).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/50">
                <span className="font-mono">{status}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Preuves terrain">
          <div className="space-y-2 text-sm">
            <Line label="Confirmés terrain" value={summary.confirmed_by_field} />
            <Line label="Sans preuve terrain" value={summary.without_field_evidence} />
            <Line label="Taux de complétion" value={`${summary.completion_rate}%`} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <EquipmentCableList title="Câbles entrants" cables={data.incoming} />
        <EquipmentCableList title="Câbles sortants" cables={data.outgoing} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Problèmes ouverts">
          {data.open_problems.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucun problème ouvert détecté.</p>
          ) : (
            <div className="space-y-2">
              {data.open_problems.slice(0, 12).map((cable) => (
                <Link key={cable.id} to={cable.cable_story_path} className="block rounded-lg bg-red-50 px-3 py-2 text-sm hover:underline dark:bg-red-900/10">
                  <span className="font-mono font-semibold">{cable.cable_code_normalized}</span>
                  <span className="ml-2 text-red-700 dark:text-red-300">{cable.risk_reasons.join(", ")}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Actions recommandées">
          <ul className="space-y-2 text-sm">
            {summary.recommended_actions.map((action) => (
              <li key={action} className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800 dark:bg-amber-900/10 dark:text-amber-300">
                {action}
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      {showContext && briefing && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-semibold text-zinc-500">Contexte AI-ready</h2>
          <pre className="max-h-96 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-[11px] dark:border-zinc-700 dark:bg-zinc-950">
            {JSON.stringify(briefing, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber" | "red";
}): JSX.Element {
  const tone = accent === "red"
    ? "border-red-200 bg-red-50 text-red-700 dark:bg-red-900/10 dark:text-red-300"
    : accent === "amber"
    ? "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/10 dark:text-amber-300"
    : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900";
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400">{title}</h2>
      {children}
    </section>
  );
}

function Line({ label, value }: { label: string; value: number | string }): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
