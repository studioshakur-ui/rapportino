// src/features/core-command/command-center/CommandCenterPage.tsx — V5 Silent
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { listRecentImports, loadItemsWithEvidence } from "../../../modules/daily-lists/dailyLists.repo";
import { buildListSummary } from "../../../modules/daily-lists/dailyLists.logic";
import type { DailyListItemVM } from "../../../modules/daily-lists/dailyLists.types";

export default function CommandCenterPage() {
  const navigate = useNavigate();

  const { data: imports } = useQuery({
    queryKey: ["daily_list_imports"],
    queryFn: () => listRecentImports(1),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const latest = imports?.[0] ?? null;

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ["daily_list_items_vm", latest?.id],
    queryFn: () => loadItemsWithEvidence(latest!.id),
    enabled: Boolean(latest?.id),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const summary = latest && items
    ? buildListSummary(latest.id, latest.list_date, latest.file_name, items)
    : null;

  const done = (summary?.confirmed ?? 0) + (summary?.likely_laid ?? 0);
  const total = summary?.total ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const noProof = items?.filter((item) => item.computed_status === "no_evidence") ?? [];
  const partial = items?.filter((item) => item.computed_status === "to_verify") ?? [];
  const blocked = items?.filter((item) => item.computed_status === "blocked") ?? [];

  const partialActors = [...new Set(partial.map((item) => item.last_actor).filter(Boolean))];

  if (!latest && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6">
          <p className="text-zinc-600 text-sm uppercase tracking-widest">Aucune liste importée</p>
          <button
            onClick={() => navigate("/command/daily-lists")}
            className="text-white text-sm border border-zinc-700 rounded-lg px-5 py-2.5 hover:border-zinc-500 transition-colors"
          >
            Importer la liste du jour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
      <div className="flex items-start justify-between mb-10">
        <div className="space-y-0.5">
          <p className="text-zinc-600 text-xs uppercase tracking-widest">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
          {latest && (
            <p className="text-zinc-400 text-sm">
              {latest.file_name}
              <span className="text-zinc-700 mx-2">·</span>
              {latest.list_date}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate("/command/daily-lists")}
          className="text-zinc-600 text-xs hover:text-zinc-300 transition-colors"
        >
          Changer →
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:gap-20">
        <div className="flex-1 min-w-0 space-y-12">
          {isError && (
            <div className="rounded-lg border border-amber-700/40 bg-amber-500/10 px-4 py-3">
              <p className="text-amber-400 text-sm font-medium">Preuves terrain non chargées</p>
              <p className="text-amber-600/80 text-xs mt-0.5">
                Le chargement des preuves terrain a échoué. L'avancement ci-dessous peut être incomplet.
              </p>
            </div>
          )}

          {summary && (
            <div className="space-y-5">
              <p className="text-zinc-600 text-xs uppercase tracking-widest">Avancement</p>
              <div className="flex items-baseline gap-5">
                <span className="text-8xl font-black text-white tracking-tighter leading-none">
                  {pct}<span className="text-5xl text-zinc-600">%</span>
                </span>
                <span className="text-zinc-500 text-sm leading-relaxed">
                  {done} / {total}<br />câbles
                </span>
              </div>

              <div className="h-1.5 bg-zinc-800/80 rounded-full overflow-hidden flex">
                {[
                  { count: summary.confirmed, className: "bg-emerald-500" },
                  { count: summary.likely_laid, className: "bg-blue-500" },
                  { count: summary.to_verify, className: "bg-amber-400" },
                  { count: summary.no_evidence, className: "bg-zinc-700" },
                  { count: summary.blocked, className: "bg-red-500" },
                ].filter((segment) => segment.count > 0).map((segment) => (
                  <div
                    key={segment.className}
                    style={{ width: `${(segment.count / total) * 100}%` }}
                    className={segment.className}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                {[
                  { count: summary.confirmed, label: "confirmés", className: "bg-emerald-500" },
                  { count: summary.likely_laid, label: "probables", className: "bg-blue-500" },
                  { count: summary.to_verify, label: "partiels", className: "bg-amber-400" },
                  { count: summary.no_evidence, label: "sans preuve", className: "bg-zinc-600" },
                  { count: summary.blocked, label: "bloqués", className: "bg-red-500" },
                ].filter((segment) => segment.count > 0).map((segment) => (
                  <span key={segment.label} className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${segment.className} shrink-0`} />
                    <strong className="text-zinc-300 font-medium tabular-nums">{segment.count}</strong>
                    <span>{segment.label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {!isLoading && (
            <div className="space-y-10">
              {noProof.length > 0 && (
                <Section label="À confirmer ce soir" count={noProof.length} accent="amber">
                  <CablePills
                    cables={noProof.slice(0, 20).map((item) => item.cable_code_normalized)}
                    more={noProof.length > 20 ? noProof.length - 20 : 0}
                    onClick={(code) => navigate(`/command/cable/${encodeURIComponent(code)}`)}
                    color="amber"
                  />
                  <SectionHint>
                    Demander une confirmation à {uniqueActors(noProof) || "l'équipe"}
                  </SectionHint>
                  <SectionLink onClick={() => navigate(`/command/daily-lists/${latest!.id}`)}>
                    Voir la liste complète
                  </SectionLink>
                </Section>
              )}

              {partial.length > 0 && (
                <Section label="Signalés partiels" count={partial.length} accent="neutral">
                  {partialActors.length > 0 && (
                    <p className="text-zinc-400 text-sm">{partialActors.join(", ")}</p>
                  )}
                  <CablePills
                    cables={partial.map((item) => item.cable_code_normalized)}
                    more={0}
                    onClick={(code) => navigate(`/command/cable/${encodeURIComponent(code)}`)}
                    color="neutral"
                  />
                  <SectionHint>Vérifier l'achèvement demain matin</SectionHint>
                </Section>
              )}

              {blocked.length > 0 && (
                <Section label="Bloqués" count={blocked.length} accent="red">
                  <CablePills
                    cables={blocked.map((item) => item.cable_code_normalized)}
                    more={0}
                    onClick={(code) => navigate(`/command/cable/${encodeURIComponent(code)}`)}
                    color="red"
                  />
                  <SectionLink onClick={() => navigate("/command/problems")}>
                    Voir les problèmes ouverts
                  </SectionLink>
                </Section>
              )}

              {summary && noProof.length === 0 && partial.length === 0 && blocked.length === 0 && (
                isError ? (
                  <p className="text-amber-400 text-sm">Preuves terrain non chargées</p>
                ) : done >= total && total > 0 ? (
                  <p className="text-zinc-600 text-sm">Tous les câbles sont confirmés.</p>
                ) : (
                  <p className="text-zinc-600 text-sm">Aucune preuve terrain liée pour cette liste.</p>
                )
              )}
            </div>
          )}
        </div>

        {summary && summary.by_perimeter.length > 0 && (
          <div className="lg:w-72 shrink-0 mt-12 lg:mt-0 space-y-6 pt-10 lg:pt-0 border-t border-zinc-800/50 lg:border-t-0 lg:border-l lg:border-zinc-800/50 lg:pl-10">
            <p className="text-zinc-600 text-xs uppercase tracking-widest">Par zone</p>
            <div className="space-y-5">
              {summary.by_perimeter.map((perimeter) => {
                const perimeterPct = perimeter.total > 0 ? Math.round((perimeter.confirmed / perimeter.total) * 100) : 0;
                const isLate = perimeterPct < 50 && perimeter.total >= 3;

                return (
                  <button
                    key={perimeter.perimetro}
                    onClick={() => navigate(`/command/daily-lists/${latest!.id}`)}
                    className="w-full text-left space-y-2.5 group"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className={`text-sm font-medium truncate ${isLate ? "text-amber-400" : "text-zinc-300"}`}>
                        {perimeter.perimetro}
                      </span>
                      <span className="text-xs text-zinc-600 tabular-nums shrink-0">
                        {perimeterPct}%
                        {isLate && <span className="ml-1.5 text-amber-600">↓</span>}
                      </span>
                    </div>
                    <div className="h-px bg-zinc-800 overflow-visible">
                      <div
                        style={{ width: `${perimeterPct}%` }}
                        className={`h-px transition-all ${
                          perimeterPct === 0 ? "bg-zinc-800"
                            : perimeterPct < 50 ? "bg-amber-500"
                              : perimeterPct < 80 ? "bg-blue-500"
                                : "bg-emerald-500"
                        }`}
                      />
                    </div>
                    <p className="text-xs text-zinc-700 group-hover:text-zinc-500 transition-colors">
                      {perimeter.confirmed} confirmé{perimeter.confirmed > 1 ? "s" : ""} · {perimeter.total - perimeter.confirmed} restant{(perimeter.total - perimeter.confirmed) > 1 ? "s" : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function uniqueActors(items: DailyListItemVM[]): string {
  return [...new Set(items.map((item) => item.last_actor).filter(Boolean))].slice(0, 3).join(", ");
}

function Section({ label, count, accent, children }: {
  label: string;
  count: number;
  accent: "amber" | "red" | "neutral";
  children: ReactNode;
}) {
  const countColor = accent === "amber" ? "text-amber-400" : accent === "red" ? "text-red-400" : "text-zinc-400";

  return (
    <div className="space-y-3 pt-6 border-t border-zinc-800/60 first:pt-0 first:border-t-0">
      <div className="flex items-baseline gap-3">
        <p className="text-white text-sm font-semibold">{label}</p>
        <span className={`text-xs tabular-nums ${countColor}`}>{count}</span>
      </div>
      {children}
    </div>
  );
}

function CablePills({ cables, more, onClick, color }: {
  cables: string[];
  more: number;
  onClick: (code: string) => void;
  color: "amber" | "red" | "neutral";
}) {
  const pillClassName = {
    amber: "text-amber-300 hover:text-amber-100 hover:bg-amber-500/10",
    red: "text-red-400 hover:text-red-200 hover:bg-red-500/10",
    neutral: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40",
  }[color];

  return (
    <div className="flex flex-wrap gap-x-1 gap-y-0.5">
      {cables.map((code) => (
        <button
          key={code}
          onClick={() => onClick(code)}
          className={`font-mono text-xs px-1.5 py-0.5 rounded transition-colors ${pillClassName}`}
        >
          {code}
        </button>
      ))}
      {more > 0 && <span className="text-xs text-zinc-700 self-center">+{more}</span>}
    </div>
  );
}

function SectionHint({ children }: { children: ReactNode }) {
  return <p className="text-zinc-600 text-xs">{children}</p>;
}

function SectionLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-zinc-500 text-xs hover:text-zinc-300 transition-colors underline underline-offset-2 decoration-zinc-700"
    >
      {children}
    </button>
  );
}
