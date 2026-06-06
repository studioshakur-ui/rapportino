// src/modules/daily-lists/DailyListDetailPage.tsx
// CORE COMMAND — Dashboard métier d'une liste journalière
// Phase E + G: vue par câble, par périmètre, contexte AI-ready
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getImport, loadItemsWithEvidence } from "./dailyLists.repo";
import { buildListSummary, buildDailyBriefingContext } from "./dailyLists.logic";
import { buildEquipmentImpactsFromDailyItems } from "../equipment/equipment.logic";
import DailyListProgress from "./components/DailyListProgress";
import DailyListTable from "./components/DailyListTable";
import type { DailyListItemVM } from "./dailyLists.types";
import { formatCableDisplay } from "../../core/cable/cableDisplay";
import { AppBar, EmptyState, Pill, Screen, Section, StatCard } from "../../components/command-ui";

export default function DailyListDetailPage(): JSX.Element {
  const { importId } = useParams<{ importId: string }>();
  const navigate = useNavigate();
  const [showBriefing, setShowBriefing] = useState(false);

  const { data: importRow, isLoading: loadingImport } = useQuery({
    queryKey: ["daily_list_import", importId],
    queryFn:  () => getImport(importId!),
    enabled:  Boolean(importId),
    staleTime: 60_000,
  });

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ["daily_list_items_vm", importId],
    queryFn:  () => loadItemsWithEvidence(importId!),
    enabled:  Boolean(importId),
    staleTime: 30_000,
    // No passive polling — Realtime (useRealtimeSync) drives freshness.
  });

  const isLoading = loadingImport || loadingItems;

  const summary = importRow && items
    ? buildListSummary(importRow.id, importRow.list_date, importRow.file_name, items)
    : null;

  const briefing = summary && items
    ? buildDailyBriefingContext(importRow!.id, importRow!.list_date, items)
    : null;
  const missingEvidenceItems = items?.filter((item) => item.missing_evidence) ?? [];
  const partialItems = items?.filter((item) => item.has_partial_progress || item.computed_status === "to_verify") ?? [];
  const problemItems = items?.filter((item) =>
    item.has_short_issue || item.has_missing_issue || item.computed_status === "blocked" || item.computed_status === "missing"
  ) ?? [];
  const criticalItems = items?.filter((item) =>
    item.has_short_issue || item.has_missing_issue || item.has_partial_progress || item.computed_status === "blocked"
  ) ?? [];
  const absolutePriorities = [...criticalItems, ...missingEvidenceItems]
    .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, 12);
  const zeroPerimeters = summary?.by_perimeter.filter((p) => p.pct === 0 && p.total > 0) ?? [];
  const equipmentImpacts = items ? buildEquipmentImpactsFromDailyItems(items) : [];
  const remaining = summary ? Math.max(summary.total - summary.confirmed, 0) : 0;

  if (!importId) {
    return (
      <Screen>
        <EmptyState title="Import ID manquant" description="Retourner aux listes journalières et rouvrir une liste." icon="!" />
      </Screen>
    );
  }

  return (
    <Screen className="max-w-6xl space-y-6">
      <button
        onClick={() => navigate("/command/daily-lists")}
        className="min-h-10 rounded-xl border border-zinc-800 px-3 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-white"
      >
        ← Toutes les listes
      </button>

      <AppBar
        title={importRow?.file_name ?? "Liste journalière"}
        subtitle={`${importRow?.list_date ?? "date inconnue"} · ${importRow?.rows_count ?? 0} câbles · ${importRow?.source_kind?.toUpperCase() ?? ""}`}
        action={
          <button
            onClick={() => setShowBriefing((v) => !v)}
            className="min-h-10 rounded-xl border border-zinc-800 px-3 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-white"
          >
            {showBriefing ? "Masquer contexte AI" : "🤖 Contexte AI"}
          </button>
        }
      />

      {isLoading ? (
        <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 text-sm text-zinc-400">
          <svg className="h-4 w-4 animate-spin text-sky-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Chargement des données terrain…
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total" value={summary.total} helper="lignes exploitables" />
            <StatCard label="Confirmés" value={summary.confirmed} helper={`${summary.confirmed_by_whatsapp} confirmées WhatsApp`} tone="emerald" />
            <StatCard label="Restants" value={remaining} helper={`${summary.missing_evidence} sans preuve`} tone={remaining > 0 ? "amber" : "neutral"} />
            <StatCard
              label="Problèmes"
              value={problemItems.length + partialItems.length}
              helper={`${zeroPerimeters.length} zone${zeroPerimeters.length > 1 ? "s" : ""} à 0%`}
              tone={problemItems.length + partialItems.length > 0 ? "red" : "neutral"}
            />
          </div>

          <Section title="Avancement global" eyebrow="Progression">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4">
              <DailyListProgress summary={summary} />
            </div>
          </Section>
        </>
      ) : null}

      {summary && summary.tomorrow_actions.length > 0 ? (
        <Section title="Actions demain" eyebrow="Priorité terrain" count={summary.tomorrow_actions.length}>
          <div className="space-y-3">
            {summary.tomorrow_actions.map((action) => (
              <article key={`${action.kind}-${action.perimetro ?? "all"}`} className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-amber-100">{action.label}</p>
                    {action.perimetro ? <p className="mt-1 text-xs text-amber-300/80">Zone {action.perimetro}</p> : null}
                  </div>
                  <Pill tone="amber">{action.count}</Pill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {action.cable_codes.map((code) => (
                    <button
                      key={code}
                      onClick={() => navigate(`/command/cable/${encodeURIComponent(code)}`)}
                      className="min-h-9 rounded-xl bg-black/20 px-3 font-mono text-sm font-semibold text-amber-100 transition hover:bg-black/30"
                    >
                      {formatCableDisplay(code)}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      {missingEvidenceItems.length > 0 ? (
        <Section title="Sans preuve" eyebrow="À confirmer" count={missingEvidenceItems.length}>
          <CableCardGrid items={missingEvidenceItems} accent="amber" onOpen={(item) => navigate(item.cable_story_path)} />
        </Section>
      ) : null}

      {partialItems.length > 0 ? (
        <Section title="Partiels / À vérifier" eyebrow="Contrôle terrain" count={partialItems.length}>
          <CableCardGrid items={partialItems} accent="sky" onOpen={(item) => navigate(item.cable_story_path)} />
        </Section>
      ) : null}

      {problemItems.length > 0 || zeroPerimeters.length > 0 ? (
        <Section title="Bloqués / Problèmes" eyebrow="Risque chantier" count={problemItems.length + zeroPerimeters.length}>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4">
              <h3 className="text-sm font-semibold text-red-200">Zones critiques</h3>
              {zeroPerimeters.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-400">Aucune zone à 0%.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {zeroPerimeters.map((zone) => (
                    <div key={zone.perimetro} className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-3 py-2">
                      <span className="text-sm font-medium text-red-100">{zone.perimetro}</span>
                      <span className="text-xs text-red-200">{zone.total} câbles · 0%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4">
              <h3 className="text-sm font-semibold text-zinc-100">Priorités absolues</h3>
              {absolutePriorities.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-400">Aucune priorité bloquante détectée.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {absolutePriorities.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.cable_story_path)}
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/50 px-3 py-3 text-left transition hover:border-red-500/30"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="font-mono text-sm font-semibold text-white">{formatCableDisplay(item.cable_code_normalized)}</span>
                          <span className="mt-1 block text-xs leading-5 text-zinc-500">{item.recommended_action}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-zinc-400">{item.perimetro ?? "—"}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>
      ) : null}

      {summary && summary.by_perimeter.length > 0 ? (
        <Section title="Par zone" eyebrow="Avancement" count={summary.by_perimeter.length}>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="space-y-3">
              {summary.by_perimeter.map((perimeter) => {
                const pct = perimeter.pct;
                const critical = perimeter.pct === 0 || (perimeter.no_evidence > 0 && pct < 30);
                return (
                  <div key={perimeter.perimetro} className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`truncate text-sm font-medium ${critical ? "text-amber-300" : "text-zinc-200"}`}>{perimeter.perimetro}</span>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">{perimeter.confirmed}/{perimeter.total} · {pct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full ${pct === 0 ? "bg-zinc-600" : pct < 50 ? "bg-amber-400" : pct < 80 ? "bg-sky-400" : "bg-emerald-500"}`}
                      />
                    </div>
                    {perimeter.no_evidence > 0 ? <p className="text-[11px] text-amber-300">{perimeter.no_evidence} sans preuve</p> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </Section>
      ) : null}

      {equipmentImpacts.length > 0 ? (
        <Section title="Équipements touchés" eyebrow="APP départ / arrivée" count={equipmentImpacts.length}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {equipmentImpacts.slice(0, 18).map((equipment) => (
              <button
                key={equipment.equipment_code}
                onClick={() => navigate(`/command/equipment/${encodeURIComponent(equipment.equipment_code)}`)}
                className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4 text-left transition hover:border-sky-500/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-white">{equipment.equipment_code}</span>
                  <Pill tone={equipment.risk_level === "critical" || equipment.risk_level === "high" ? "red" : equipment.risk_level === "medium" ? "amber" : "emerald"}>
                    {equipment.risk_level}
                  </Pill>
                </div>
                <div className="mt-2 text-xs leading-5 text-zinc-500">
                  {equipment.total_cables} câbles · {equipment.confirmed_by_field} preuves · {equipment.without_field_evidence} sans preuve
                </div>
                {equipment.risk_reasons[0] ? <div className="mt-2 truncate text-xs text-amber-300">{equipment.risk_reasons[0]}</div> : null}
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      {items && items.length > 0 ? (
        <Section title="Tableau complet" eyebrow="Détail par câble" count={items.length}>
          <DailyListTable items={items} />
        </Section>
      ) : null}

      {!isLoading && items && items.length === 0 ? (
        <EmptyState title="Liste vide" description="Aucun câble exploitable dans cet import." icon="📋" />
      ) : null}

      {showBriefing && briefing ? (
        <Section title="Contexte AI-ready" eyebrow="Debug" count={1}>
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="mb-3 text-xs text-zinc-500">
              JSON prêt à transmettre à un AI Advisor. Aucun LLM n'a été appelé ici.
            </p>
            <pre className="max-h-96 overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-[11px] text-zinc-300">
              {JSON.stringify(briefing, null, 2)}
            </pre>
          </div>
        </Section>
      ) : null}
    </Screen>
  );
}

function CableCardGrid({
  items,
  accent,
  onOpen,
}: {
  items: DailyListItemVM[];
  accent: "amber" | "sky";
  onOpen: (item: DailyListItemVM) => void;
}): JSX.Element {
  const accentClass = accent === "amber" ? "border-amber-500/20 bg-amber-500/10" : "border-sky-500/20 bg-sky-500/10";
  const actionClass = accent === "amber" ? "text-amber-300" : "text-sky-300";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onOpen(item)}
          className={`rounded-3xl border p-4 text-left transition hover:border-white/20 ${accentClass}`}
        >
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="font-mono text-base font-semibold text-white">{formatCableDisplay(item.cable_code_normalized)}</span>
              <span className="mt-1 block text-xs text-zinc-400">{item.perimetro ?? "—"}</span>
            </span>
            {item.progress_percent !== null && item.progress_percent < 100 ? (
              <Pill tone="amber">{item.progress_percent}%</Pill>
            ) : null}
          </span>
          <span className={`mt-3 block text-xs leading-5 ${actionClass}`}>{item.recommended_action}</span>
        </button>
      ))}
    </div>
  );
}
