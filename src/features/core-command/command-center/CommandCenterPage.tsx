// src/features/core-command/command-center/CommandCenterPage.tsx — V6 mobile-first
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listRecentImports, loadItemsWithEvidence } from "../../../modules/daily-lists/dailyLists.repo";
import { buildListSummary } from "../../../modules/daily-lists/dailyLists.logic";
import type { DailyListItemVM } from "../../../modules/daily-lists/dailyLists.types";
import { Screen, SectionCard, CablePills, Chip, CardLink, EmptyState } from "../ui/CommandKit";

export default function CommandCenterPage() {
  const navigate = useNavigate();

  const { data: imports } = useQuery({
    queryKey: ["daily_list_imports"],
    queryFn: () => listRecentImports(1),
    staleTime: 60_000,
    // No passive polling — Realtime (useRealtimeSync) drives freshness.
  });
  const latest = imports?.[0] ?? null;

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ["daily_list_items_vm", latest?.id],
    queryFn: () => loadItemsWithEvidence(latest!.id),
    enabled: Boolean(latest?.id),
    staleTime: 60_000,
    // No passive polling — Realtime (useRealtimeSync) drives freshness.
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
  const goCable = (code: string) => navigate(`/command/cable/${encodeURIComponent(code)}`);

  if (!latest && !isLoading) {
    return (
      <Screen>
        <EmptyState
          icon="📋"
          title="Aucune liste importée"
          hint="Importe la liste du jour pour suivre l'avancement terrain."
          action={
            <button
              onClick={() => navigate("/command/daily-lists")}
              className="mt-1 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 active:bg-zinc-200"
            >
              Importer la liste du jour
            </button>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen className="space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-zinc-600">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
          {latest && (
            <p className="truncate text-sm text-zinc-400">
              {latest.file_name}
              <span className="mx-1.5 text-zinc-700">·</span>
              {latest.list_date}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate("/command/daily-lists")}
          className="shrink-0 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 active:bg-zinc-800"
        >
          Changer
        </button>
      </header>

      {isError && (
        <div className="rounded-2xl border border-amber-700/40 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-medium text-amber-400">Preuves terrain non chargées</p>
          <p className="mt-0.5 text-xs text-amber-600/80">
            Le chargement des preuves a échoué. L'avancement peut être incomplet.
          </p>
        </div>
      )}

      {/* Progress hero */}
      {summary && (
        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5">
          <div className="flex items-center gap-5">
            <ProgressRing pct={pct} />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-zinc-600">Avancement</p>
                <p className="text-sm text-zinc-400">
                  <strong className="text-zinc-200 tabular-nums">{done}</strong> / {total} câbles posés
                </p>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-zinc-800/80">
                {[
                  { count: summary.confirmed,   className: "bg-emerald-500" },
                  { count: summary.likely_laid, className: "bg-blue-500" },
                  { count: summary.to_verify,   className: "bg-amber-400" },
                  { count: summary.no_evidence, className: "bg-zinc-700" },
                  { count: summary.blocked,     className: "bg-red-500" },
                ].filter((s) => s.count > 0).map((s) => (
                  <div key={s.className} style={{ width: `${(s.count / total) * 100}%` }} className={s.className} />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-zinc-800/60 pt-4">
            {summary.confirmed   > 0 && <Chip tone="emerald" label="confirmés"   count={summary.confirmed} />}
            {summary.likely_laid > 0 && <Chip tone="blue"    label="probables"   count={summary.likely_laid} />}
            {summary.to_verify   > 0 && <Chip tone="amber"   label="partiels"    count={summary.to_verify} />}
            {summary.no_evidence > 0 && <Chip tone="neutral" label="sans preuve" count={summary.no_evidence} />}
            {summary.blocked     > 0 && <Chip tone="red"     label="bloqués"     count={summary.blocked} />}
          </div>
        </section>
      )}

      {/* Action stacks */}
      {!isLoading && (
        <div className="space-y-4">
          {noProof.length > 0 && (
            <SectionCard
              label="À confirmer ce soir"
              count={noProof.length}
              tone="amber"
              hint={`Demander une confirmation à ${uniqueActors(noProof) || "l'équipe"}`}
              footer={
                <CardLink onClick={() => navigate(`/command/daily-lists/${latest!.id}`)}>
                  Voir la liste complète →
                </CardLink>
              }
            >
              <CablePills codes={noProof.map((i) => i.cable_code_normalized)} onSelect={goCable} tone="amber" max={20} />
            </SectionCard>
          )}

          {partial.length > 0 && (
            <SectionCard
              label="Signalés partiels"
              count={partial.length}
              tone="amber"
              hint="Vérifier l'achèvement demain matin"
            >
              {partialActors.length > 0 && (
                <p className="text-sm text-zinc-400">{partialActors.join(", ")}</p>
              )}
              <CablePills codes={partial.map((i) => i.cable_code_normalized)} onSelect={goCable} tone="neutral" />
            </SectionCard>
          )}

          {blocked.length > 0 && (
            <SectionCard
              label="Bloqués"
              count={blocked.length}
              tone="red"
              footer={
                <CardLink onClick={() => navigate("/command/problems")}>
                  Voir les problèmes ouverts →
                </CardLink>
              }
            >
              <CablePills codes={blocked.map((i) => i.cable_code_normalized)} onSelect={goCable} tone="red" />
            </SectionCard>
          )}

          {summary && noProof.length === 0 && partial.length === 0 && blocked.length === 0 && (
            isError ? (
              <EmptyState icon="⚠️" title="Preuves terrain non chargées" hint="Réessaie dans un instant." />
            ) : done >= total && total > 0 ? (
              <EmptyState icon="✅" title="Tous les câbles sont confirmés" hint="Rien à traiter ce soir." />
            ) : (
              <EmptyState icon="📡" title="Aucune preuve terrain liée" hint="Aucun message terrain n'est encore rattaché à cette liste." />
            )
          )}
        </div>
      )}

      {/* Zones */}
      {summary && summary.by_perimeter.length > 0 && (
        <SectionCard label="Par zone">
          <div className="space-y-4">
            {summary.by_perimeter.map((perimeter) => {
              const perimeterPct = perimeter.total > 0 ? Math.round((perimeter.confirmed / perimeter.total) * 100) : 0;
              const isLate = perimeterPct < 50 && perimeter.total >= 3;
              const remaining = perimeter.total - perimeter.confirmed;
              return (
                <button
                  key={perimeter.perimetro}
                  onClick={() => navigate(`/command/daily-lists/${latest!.id}`)}
                  className="w-full space-y-2 text-left active:opacity-70"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className={`truncate text-sm font-medium ${isLate ? "text-amber-400" : "text-zinc-300"}`}>
                      {perimeter.perimetro}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                      {perimeterPct}%{isLate && <span className="ml-1 text-amber-600">↓</span>}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      style={{ width: `${perimeterPct}%` }}
                      className={`h-full rounded-full transition-all ${
                        perimeterPct === 0 ? "bg-zinc-700"
                          : perimeterPct < 50 ? "bg-amber-500"
                            : perimeterPct < 80 ? "bg-blue-500"
                              : "bg-emerald-500"
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    {perimeter.confirmed} confirmé{perimeter.confirmed > 1 ? "s" : ""} · {remaining} restant{remaining > 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </SectionCard>
      )}
    </Screen>
  );
}

function uniqueActors(items: DailyListItemVM[]): string {
  return [...new Set(items.map((item) => item.last_actor).filter(Boolean))].slice(0, 3).join(", ");
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  const color =
    pct === 0 ? "stroke-zinc-700"
      : pct < 50 ? "stroke-amber-500"
        : pct < 80 ? "stroke-blue-500"
          : "stroke-emerald-500";
  return (
    <div className="relative h-[88px] w-[88px] shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} className="fill-none stroke-zinc-800" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={r}
          className={`fill-none ${color} transition-all duration-500`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-black tabular-nums text-white">{pct}<span className="text-sm text-zinc-600">%</span></span>
      </div>
    </div>
  );
}
