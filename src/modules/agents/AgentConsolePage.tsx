// src/modules/agents/AgentConsolePage.tsx
// Module 6 — Agent Console : exécuter les agents, lire leurs findings.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Card, Empty, Badge, useSurface } from "../_ui/kit";
import { AGENTS } from "./runtime/agents";
import { listFindings, persistFindings, setFindingStatus } from "./api";
import type { AgentName, AgentSeverity } from "../../core/db/types";

const SEV_TONE: Record<AgentSeverity, "rose" | "amber" | "sky"> = {
  error: "rose",
  warn: "amber",
  info: "sky",
};

export default function AgentConsolePage(): JSX.Element {
  const { subtle, btn, btnPrimary } = useSurface();
  const qc = useQueryClient();
  const [running, setRunning] = useState<AgentName | "all" | null>(null);

  const findings = useQuery({ queryKey: ["agent_findings"], queryFn: () => listFindings() });

  const runAgent = useMutation({
    mutationFn: async (target: AgentName | "all") => {
      setRunning(target);
      const defs = target === "all" ? AGENTS : AGENTS.filter((a) => a.name === target);
      let total = 0;
      for (const def of defs) {
        const drafts = await def.run();
        total += await persistFindings(drafts);
      }
      return total;
    },
    onSettled: () => {
      setRunning(null);
      void qc.invalidateQueries({ queryKey: ["agent_findings"] });
      void qc.invalidateQueries({ queryKey: ["production_kpi"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "acknowledged" | "resolved" }) =>
      setFindingStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent_findings"] }),
  });

  return (
    <div>
      <PageHeader
        title="Agent Console"
        subtitle="Intake · Normalizer · INCA Matcher · Production · Auditor"
        actions={
          <button
            type="button"
            className={btnPrimary}
            disabled={runAgent.isPending}
            onClick={() => runAgent.mutate("all")}
          >
            {running === "all" ? "Exécution…" : "Lancer tous"}
          </button>
        }
      />

      {/* Agents grid */}
      <div className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a) => (
          <Card key={a.name} className="flex flex-col p-4">
            <div className="font-semibold">{a.label}</div>
            <p className={`mt-1 flex-1 text-sm ${subtle}`}>{a.description}</p>
            <button
              type="button"
              className={`${btn} mt-3`}
              disabled={runAgent.isPending}
              onClick={() => runAgent.mutate(a.name)}
            >
              {running === a.name ? "Exécution…" : "Lancer"}
            </button>
          </Card>
        ))}
      </div>

      {/* Findings */}
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">Findings</h2>
      <Card className="divide-y divide-slate-700/30">
        {findings.isLoading && <Empty>Chargement…</Empty>}
        {!findings.isLoading && (findings.data?.length ?? 0) === 0 && <Empty>Aucun finding.</Empty>}
        {findings.data
          ?.filter((f) => f.status !== "resolved")
          .map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone={SEV_TONE[f.severity]}>{f.agent}</Badge>
                  <span className="text-sm font-medium">{f.title}</span>
                </div>
                <div className={`text-xs ${subtle}`}>
                  {new Date(f.created_at).toLocaleString("fr-FR")}
                  {f.status === "acknowledged" && " · vu"}
                </div>
              </div>
              <div className="flex gap-2">
                {f.status === "open" && (
                  <button
                    type="button"
                    className={btn}
                    onClick={() => updateStatus.mutate({ id: f.id, status: "acknowledged" })}
                  >
                    Vu
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-xl border border-emerald-500/40 px-3 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => updateStatus.mutate({ id: f.id, status: "resolved" })}
                >
                  Résoudre
                </button>
              </div>
            </div>
          ))}
      </Card>
    </div>
  );
}
