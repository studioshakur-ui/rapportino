// src/features/core-command/command-center/CommandCenterPage.tsx — V2
import { useQuery } from "@tanstack/react-query";
import { usePendingEvents, useValidateEvent, useRejectEvent, usePromoteEvent } from "../hooks/useCoreEvents";
import { useAgentFindings } from "../hooks/useAgentFindings";
import { listProductionKpis } from "../api/productionKpis.api";
import { listOpenPriorities } from "../api/cablePriorities.api";
import { fetchCommandStats, fetchTopCables } from "../api/stats.api";
import { useAuth } from "../../../auth/AuthProvider";
import type { ValidationStatus } from "../types";

const STATUS_COLORS: Record<ValidationStatus, string> = {
  pending:   "border-amber-200 bg-amber-50 dark:bg-amber-900/10",
  validated: "border-blue-200 bg-blue-50 dark:bg-blue-900/10",
  rejected:  "border-red-200 bg-red-50 dark:bg-red-900/10",
  promoted:  "border-green-200 bg-green-50 dark:bg-green-900/10",
};

function KpiCard({ label, value, sub, accent = false }: {
  label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 border ${accent
      ? "border-blue-200 bg-blue-50 dark:bg-blue-900/20"
      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"}`}>
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function CommandCenterPage() {
  const { session } = useAuth() as { session: { user?: { id?: string } } | null };
  const uid = session?.user?.id ?? "";

  const { data: stats } = useQuery({
    queryKey: ["command_stats"],
    queryFn: fetchCommandStats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const { data: topCables } = useQuery({
    queryKey: ["top_cables"],
    queryFn: () => fetchTopCables(5),
    staleTime: 60_000,
  });
  const { data: pending, isLoading: loadPending } = usePendingEvents(30);
  const { data: findings } = useAgentFindings("block", 5);
  const { data: kpis } = useQuery({
    queryKey: ["production_daily_kpis", "recent"],
    queryFn: () => listProductionKpis(undefined, 7),
    staleTime: 60_000,
  });
  const { data: openPriorities } = useQuery({
    queryKey: ["cable_priorities", "open_top"],
    queryFn: () => listOpenPriorities(5),
    staleTime: 30_000,
  });

  const validate = useValidateEvent();
  const reject   = useRejectEvent();
  const promote  = usePromoteEvent();

  const todayStr  = new Date().toISOString().slice(0, 10);
  const todayKpi  = kpis?.find((k) => k.day === todayStr);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-xl font-bold">Command Center</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Messages importés"   value={stats?.msg_count          ?? "—"} />
        <KpiCard label="Câbles uniques"       value={stats?.unique_cables      ?? "—"} sub="dans CORE Memory" accent />
        <KpiCard label="Cable events"         value={stats?.cable_events_count ?? "—"} sub="promus" />
        <KpiCard label="En attente"           value={stats?.pending_events     ?? "—"} sub="à valider" />
        <KpiCard label="Core events total"    value={stats?.events_count       ?? "—"} />
        <KpiCard label="Findings ouverts"     value={stats?.findings_count     ?? "—"} />
        <KpiCard label="Priorités ouvertes"   value={stats?.priorities_count   ?? "—"} />
        <KpiCard label="Câbles posés (J)"     value={todayKpi?.cables_count    ?? "—"} sub="aujourd'hui" />
      </div>

      {/* Top 5 câbles + Top 5 priorités */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Top câbles */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 mb-2">Top câbles CORE Memory</h2>
          {(topCables?.length ?? 0) === 0 ? (
            <p className="text-sm text-zinc-400">Aucun câble. Lancer le Memory Engine.</p>
          ) : (
            <ul className="space-y-1">
              {topCables?.map((c, i) => (
                <li key={c.cable_code} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 w-4">{i + 1}.</span>
                    <span className="font-mono font-semibold">{c.cable_code}</span>
                  </span>
                  <span className="text-xs text-zinc-500">{c.mentions} event{c.mentions > 1 ? "s" : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top priorités */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 mb-2">Priorités critiques</h2>
          {(openPriorities?.length ?? 0) === 0 ? (
            <p className="text-sm text-zinc-400">Aucune priorité ouverte.</p>
          ) : (
            <ul className="space-y-1">
              {openPriorities?.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono font-semibold">{p.cable_code}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    p.priority === "critical" ? "bg-red-100 text-red-700"
                    : p.priority === "high"   ? "bg-orange-100 text-orange-700"
                    : "bg-amber-100 text-amber-700"}`}>
                    {p.priority.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Findings bloquants */}
      {(findings?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-500 mb-2">⚠ Anomalies bloquantes ({findings?.length})</h2>
          <ul className="space-y-2">
            {findings?.map((f) => (
              <li key={f.id} className="border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-lg px-4 py-2 text-sm">
                <p className="font-semibold">{f.agent_name} — {f.finding_type}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">{f.message}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Pending events */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-500 mb-3">
          Événements en attente ({pending?.length ?? 0}{(stats?.pending_events ?? 0) > 30 ? ` / ${stats?.pending_events} total` : ""})
        </h2>
        {loadPending ? (
          <p className="text-sm text-zinc-400">Chargement…</p>
        ) : (pending?.length ?? 0) === 0 ? (
          <p className="text-sm text-zinc-400">Aucun événement en attente. ✓</p>
        ) : (
          <ul className="space-y-2">
            {pending?.map((ev) => (
              <li key={ev.id} className={`border rounded-xl px-4 py-3 flex items-start justify-between gap-3 ${STATUS_COLORS[ev.validation_status as ValidationStatus]}`}>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm">
                      {ev.cable_code_normalized ?? ev.cable_code_raw ?? ev.event_type}
                    </span>
                    <span className="text-xs bg-white/60 dark:bg-black/20 px-1.5 py-0.5 rounded">
                      {ev.event_type.replace(/_/g, " ")}
                    </span>
                    {ev.commessa && <span className="text-xs opacity-60">{ev.commessa}</span>}
                    <span className="text-xs opacity-50">conf. {(ev.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-xs opacity-75 line-clamp-2">{ev.raw_text ?? "—"}</p>
                  <p className="text-[11px] opacity-50">
                    {new Date(ev.occurred_at).toLocaleString("fr-FR", {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col gap-1.5">
                  <button onClick={() => validate.mutate({ id: ev.id, uid })}
                    disabled={validate.isPending}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50">
                    Valider
                  </button>
                  <button onClick={() => promote.mutate({ id: ev.id, uid })}
                    disabled={promote.isPending}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50">
                    Promouvoir
                  </button>
                  <button onClick={() => reject.mutate({ id: ev.id, uid })}
                    disabled={reject.isPending}
                    className="text-xs text-red-600 underline hover:no-underline disabled:opacity-50">
                    Rejeter
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* KPI 7j */}
      {(kpis?.length ?? 0) > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 mb-3">Production 7 derniers jours</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-200 dark:border-zinc-700">
                  <th className="pb-2 pr-4">Jour</th>
                  <th className="pb-2 pr-4">Câbles</th>
                  <th className="pb-2 pr-4">Mètres</th>
                  <th className="pb-2 pr-4">Opérateurs</th>
                  <th className="pb-2">Priorités</th>
                </tr>
              </thead>
              <tbody>
                {kpis?.map((k) => (
                  <tr key={k.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-1.5 pr-4 font-medium">{k.day}</td>
                    <td className="py-1.5 pr-4">{k.cables_count}</td>
                    <td className="py-1.5 pr-4">{k.meters_done}</td>
                    <td className="py-1.5 pr-4">{k.active_operators_count}</td>
                    <td className="py-1.5">{k.open_priorities_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
