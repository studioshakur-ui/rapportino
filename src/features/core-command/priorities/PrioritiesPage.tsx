// src/features/core-command/priorities/PrioritiesPage.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listOpenPriorities, closePriority } from "../api/cablePriorities.api";
import { useAgentFindings } from "../hooks/useAgentFindings";
import type { Priority } from "../types";

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  medium:   "bg-amber-100 text-amber-700 border-amber-200",
  low:      "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const SEVERITY_COLORS: Record<string, string> = {
  block: "bg-red-100 text-red-700",
  warn:  "bg-amber-100 text-amber-700",
  info:  "bg-blue-100 text-blue-700",
};

export default function PrioritiesPage() {
  const qc = useQueryClient();

  const { data: priorities, isLoading: loadPri } = useQuery({
    queryKey: ["cable_priorities", "open"],
    queryFn: () => listOpenPriorities(100),
    staleTime: 20_000,
  });

  const { data: findings, isLoading: loadFind } = useAgentFindings(undefined, 100);

  const closeMut = useMutation({
    mutationFn: (id: string) => closePriority(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cable_priorities"] }),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-xl font-bold">Priorités &amp; Findings</h1>

      {/* Cable Priorities */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-500 mb-3">
          Priorités ouvertes ({priorities?.length ?? 0})
        </h2>
        {loadPri ? (
          <p className="text-sm text-zinc-400">Chargement…</p>
        ) : priorities?.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucune priorité ouverte.</p>
        ) : (
          <ul className="space-y-2">
            {priorities?.map((p) => (
              <li
                key={p.id}
                className={`flex items-start justify-between border rounded-lg px-4 py-3 ${PRIORITY_COLORS[p.priority as Priority]}`}
              >
                <div>
                  <Link
                    to={`/command/cable/${encodeURIComponent(p.cable_code)}?source=priority`}
                    className="text-sm font-semibold text-sky-300 hover:text-sky-200"
                  >
                    {p.cable_code}
                  </Link>
                  <p className="text-xs mt-0.5 opacity-80">{p.reason ?? "—"}</p>
                  <p className="text-xs mt-1 opacity-60">
                    {new Date(p.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-xs font-bold uppercase">{p.priority}</span>
                  <button
                    onClick={() => closeMut.mutate(p.id)}
                    disabled={closeMut.isPending}
                    className="text-xs underline opacity-70 hover:opacity-100"
                  >
                    Clore
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Agent Findings */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-500 mb-3">
          Agent findings ouverts ({findings?.length ?? 0})
        </h2>
        {loadFind ? (
          <p className="text-sm text-zinc-400">Chargement…</p>
        ) : findings?.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucun finding ouvert.</p>
        ) : (
          <ul className="space-y-2">
            {findings?.map((f) => (
              <li
                key={f.id}
                className="flex items-start justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[f.severity]}`}>
                      {f.severity}
                    </span>
                    <span className="text-xs font-semibold">{f.agent_name}</span>
                    <span className="text-xs text-zinc-400">{f.finding_type}</span>
                  </div>
                  <p className="text-sm">{f.message}</p>
                  {f.recommendation && (
                    <p className="text-xs text-zinc-500">→ {f.recommendation}</p>
                  )}
                </div>
                <p className="text-xs text-zinc-400 shrink-0 ml-3">
                  {new Date(f.created_at).toLocaleDateString("fr-FR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
