// src/features/core-command/priorities/PrioritiesPage.tsx — V3 mobile shell
// "Problèmes ouverts" en langage humain. Zéro "agent findings", zéro snake_case.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listOpenPriorities, closePriority } from "../api/cablePriorities.api";
import { useAgentFindings } from "../hooks/useAgentFindings";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { AppBar, EmptyState, Pill, Screen, Section, StatCard } from "../../../components/command-ui";

// Traduction INCA/système → langage chantier
function humanizeKind(kind: string, severity?: string): { label: string; icon: string } {
  if (severity === "block") return { label: "Bloqué", icon: "⊘" };
  const map: Record<string, string> = {
    CABLE_CORTO:          "Câble trop court",
    CABLE_MANCANTE:       "Câble manquant",
    CABLE_DA_CONTROLLARE: "À vérifier sur place",
    CABLE_SFILATO:        "Câble retiré",
    length_anomaly:       "Anomalie de longueur",
    missing_in_inca:      "Introuvable dans INCA",
    rework_detected:      "Reprise détectée",
  };
  return { label: map[kind] ?? kind.replace(/_/g, " "), icon: "⚠" };
}

function priorityTone(priority: string): "neutral" | "amber" | "red" {
  if (priority === "critical") return "red";
  if (priority === "high") return "amber";
  return "neutral";
}

function priorityLabel(priority: string): string {
  if (priority === "critical") return "Critique";
  if (priority === "high") return "Urgent";
  if (priority === "medium") return "Moyen";
  return "Bas";
}

export default function PrioritiesPage() {
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: priorities, isLoading: loadPri } = useQuery({
    queryKey: ["cable_priorities", "open"],
    queryFn:  () => listOpenPriorities(100),
    staleTime: 20_000,
  });

  const { data: findings, isLoading: loadFind } = useAgentFindings(undefined, 100);

  const closeMut = useMutation({
    mutationFn: (id: string) => closePriority(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["cable_priorities"] }),
  });

  const query = search.trim().toLowerCase();
  const filteredPriorities = (priorities ?? []).filter((p) => {
    if (!query) return true;
    return [p.cable_code, p.reason, p.priority].some((value) => value?.toLowerCase().includes(query));
  });
  const filteredFindings = (findings ?? []).filter((f) => {
    if (!query) return true;
    return [f.entity_id, f.finding_type, f.message, f.recommendation].some((value) => value?.toLowerCase().includes(query));
  });

  const totalProblems = (priorities?.length ?? 0) + (findings?.length ?? 0);
  const visibleProblems = filteredPriorities.length + filteredFindings.length;
  const isLoading = loadPri || loadFind;

  return (
    <Screen className="space-y-6">
      <AppBar
        title="Problèmes ouverts"
        subtitle={
          isLoading ? "Chargement des problèmes chantier…" : totalProblems === 0
            ? "Aucun problème ouvert."
            : `${totalProblems} problème${totalProblems > 1 ? "s" : ""} à traiter`
        }
        action={<Pill tone={totalProblems > 0 ? "amber" : "emerald"}>{totalProblems} ouvert{totalProblems > 1 ? "s" : ""}</Pill>}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Priorités terrain" value={priorities?.length ?? 0} tone={(priorities?.length ?? 0) > 0 ? "amber" : "neutral"} />
        <StatCard label="Anomalies détectées" value={findings?.length ?? 0} tone={(findings?.length ?? 0) > 0 ? "red" : "neutral"} />
      </div>

      <label className="block">
        <span className="sr-only">Rechercher un câble ou un problème</span>
        <input
          type="search"
          placeholder="Rechercher câble, anomalie, priorité…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-600 focus:bg-zinc-900/90"
        />
      </label>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900" />
          ))}
        </div>
      )}

      {!isLoading && totalProblems === 0 && (
        <EmptyState title="Aucun problème ouvert" description="Tous les câbles sont sans anomalie signalée." />
      )}

      {!isLoading && totalProblems > 0 && visibleProblems === 0 && (
        <EmptyState title="Aucun résultat" description="Aucun problème ne correspond à cette recherche." icon="⌕" />
      )}

      {!isLoading && filteredPriorities.length > 0 && (
        <Section title="Priorités signalées" eyebrow="Terrain" count={filteredPriorities.length}>
          <div className="space-y-3">
            {filteredPriorities.map((p) => (
              <article
                key={p.id}
                className={`rounded-3xl border p-4 ${
                  p.priority === "critical" || p.priority === "high"
                    ? "border-red-500/20 bg-red-500/10"
                    : "border-zinc-800 bg-zinc-900/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <button
                      onClick={() => navigate(`/command/cable/${encodeURIComponent(p.cable_code)}`)}
                      className="font-mono text-lg font-bold text-white transition hover:text-sky-300"
                    >
                      {formatCableDisplay(p.cable_code)}
                    </button>
                    {p.reason ? <p className="text-sm leading-6 text-zinc-300">{p.reason}</p> : null}
                    <p className="text-xs text-zinc-500">
                      Signalé le {new Date(p.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "long",
                      })}
                    </p>
                  </div>
                  <Pill tone={priorityTone(p.priority)}>{priorityLabel(p.priority)}</Pill>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => navigate(`/command/cable/${encodeURIComponent(p.cable_code)}`)}
                    className="min-h-10 rounded-xl bg-sky-500/10 px-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20"
                  >
                    Voir le câble →
                  </button>
                  <button
                    onClick={() => closeMut.mutate(p.id)}
                    disabled={closeMut.isPending}
                    className="min-h-10 rounded-xl border border-zinc-800 px-3 text-sm font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-50"
                  >
                    Marquer résolu
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Section>
      )}

      {!isLoading && filteredFindings.length > 0 && (
        <Section title="Anomalies détectées" eyebrow="Agent" count={filteredFindings.length}>
          <div className="space-y-3">
            {filteredFindings.map((f) => {
              const { label, icon } = humanizeKind(f.finding_type, f.severity);
              const isBlock = f.severity === "block";
              return (
                <article
                  key={f.id}
                  className={`rounded-3xl border p-4 ${
                    isBlock ? "border-red-500/20 bg-red-500/10" : "border-amber-500/20 bg-amber-500/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-lg ${
                      isBlock ? "border-red-500/20 bg-red-500/10 text-red-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    }`}>
                      {icon}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={isBlock ? "red" : "amber"}>{label}</Pill>
                        {f.entity_id ? (
                          <button
                            onClick={() => navigate(`/command/cable/${encodeURIComponent(f.entity_id ?? "")}`)}
                            className="font-mono text-sm font-bold text-white transition hover:text-sky-300"
                          >
                            {formatCableDisplay(f.entity_id)}
                          </button>
                        ) : null}
                      </div>
                      <p className="text-sm leading-6 text-zinc-300">{f.message}</p>
                      {f.recommendation ? <p className="text-xs leading-5 text-zinc-500">→ {f.recommendation}</p> : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Section>
      )}
    </Screen>
  );
}
