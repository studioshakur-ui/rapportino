// src/features/core-command/priorities/PrioritiesPage.tsx — V2 (post-audit)
// "Problèmes ouverts" en langage humain. Zéro "agent findings", zéro snake_case.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listOpenPriorities, closePriority } from "../api/cablePriorities.api";
import { useAgentFindings } from "../hooks/useAgentFindings";

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

export default function PrioritiesPage() {
  const navigate = useNavigate();
  const qc       = useQueryClient();

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

  const totalProblems = (priorities?.length ?? 0) + (findings?.length ?? 0);
  const isLoading     = loadPri || loadFind;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* En-tête */}
      <div>
        <h1 className="text-xl font-bold text-white">Problèmes ouverts</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          {isLoading ? "Chargement…" : totalProblems === 0
            ? "Aucun problème ouvert. ✓"
            : `${totalProblems} problème${totalProblems > 1 ? "s" : ""} à traiter`
          }
        </p>
      </div>

      {/* ── Priorités câbles ── */}
      {(priorities?.length ?? 0) > 0 && (
        <section className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Priorités signalées</p>
          {priorities?.map((p) => {
            const isHigh = p.priority === "critical" || p.priority === "high";
            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-4 space-y-2 ${
                  isHigh
                    ? "border-red-800/50 bg-red-900/10"
                    : "border-zinc-800 bg-zinc-900"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <button
                      onClick={() => navigate(`/command/cable/${encodeURIComponent(p.cable_code)}`)}
                      className="font-mono font-bold text-white hover:text-blue-400 transition"
                    >
                      {p.cable_code}
                    </button>
                    {p.reason && (
                      <p className="text-sm text-zinc-300">{p.reason}</p>
                    )}
                    <p className="text-xs text-zinc-500">
                      Signalé le {new Date(p.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "long",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                      p.priority === "critical" ? "bg-red-500/20 text-red-400" :
                      p.priority === "high"     ? "bg-orange-500/20 text-orange-400" :
                                                  "bg-zinc-700 text-zinc-400"
                    }`}>
                      {p.priority === "critical" ? "Critique" :
                       p.priority === "high"     ? "Urgent" :
                       p.priority === "medium"   ? "Moyen" : "Bas"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => navigate(`/command/cable/${encodeURIComponent(p.cable_code)}`)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    Voir le câble →
                  </button>
                  <button
                    onClick={() => closeMut.mutate(p.id)}
                    disabled={closeMut.isPending}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition disabled:opacity-50"
                  >
                    Marquer résolu
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ── Findings traduits ── */}
      {(findings?.length ?? 0) > 0 && (
        <section className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Anomalies détectées</p>
          {findings?.map((f) => {
            const { label, icon } = humanizeKind(f.finding_type, f.severity);
            const isBlock = f.severity === "block";
            return (
              <div
                key={f.id}
                className={`rounded-2xl border p-4 space-y-2 ${
                  isBlock
                    ? "border-red-800/50 bg-red-900/10"
                    : "border-amber-800/40 bg-amber-900/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-lg shrink-0 ${isBlock ? "text-red-400" : "text-amber-400"}`}>
                    {icon}
                  </span>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        isBlock ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {label}
                      </span>
                      {f.entity_id && (
                        <button
                          onClick={() => navigate(`/command/cable/${encodeURIComponent(f.entity_id ?? "")}`)}
                          className="font-mono text-sm font-bold text-white hover:text-blue-400 transition"
                        >
                          {f.entity_id}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300">{f.message}</p>
                    {f.recommendation && (
                      <p className="text-xs text-zinc-500">→ {f.recommendation}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Vide */}
      {!isLoading && totalProblems === 0 && (
        <div className="rounded-2xl border border-emerald-800/30 bg-emerald-900/10 p-8 text-center">
          <p className="text-3xl mb-2">✓</p>
          <p className="text-emerald-400 font-bold">Aucun problème ouvert</p>
          <p className="text-zinc-500 text-sm mt-1">Tous les câbles sont sans anomalie.</p>
        </div>
      )}
    </div>
  );
}
