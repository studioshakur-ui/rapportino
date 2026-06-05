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
import DailyListTable   from "./components/DailyListTable";

export default function DailyListDetailPage() {
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
    refetchInterval: 120_000,
  });

  const isLoading = loadingImport || loadingItems;

  const summary = importRow && items
    ? buildListSummary(importRow.id, importRow.list_date, importRow.file_name, items)
    : null;

  const briefing = summary && items
    ? buildDailyBriefingContext(importRow!.id, importRow!.list_date, items)
    : null;
  const missingEvidenceItems = items?.filter((item) => item.missing_evidence) ?? [];
  const criticalItems = items?.filter((item) =>
    item.has_short_issue || item.has_missing_issue || item.has_partial_progress || item.computed_status === "blocked"
  ) ?? [];
  const absolutePriorities = [...criticalItems, ...missingEvidenceItems]
    .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, 12);
  const zeroPerimeters = summary?.by_perimeter.filter((p) => p.pct === 0 && p.total > 0) ?? [];
  const equipmentImpacts = items ? buildEquipmentImpactsFromDailyItems(items) : [];

  if (!importId) return <div className="p-6 text-red-500">Import ID manquant.</div>;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate("/command/daily-lists")}
            className="text-xs text-zinc-400 hover:text-zinc-600 mb-2 flex items-center gap-1"
          >
            ← Toutes les listes
          </button>
          <h1 className="text-xl font-bold">
            {importRow?.file_name ?? "Liste journalière"}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {importRow?.list_date ?? "date inconnue"} ·{" "}
            {importRow?.rows_count ?? 0} câbles ·{" "}
            {importRow?.source_kind?.toUpperCase() ?? ""}
          </p>
        </div>
        <button
          onClick={() => setShowBriefing((v) => !v)}
          className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
        >
          {showBriefing ? "Masquer contexte AI" : "🤖 Contexte AI"}
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          Chargement des données terrain…
        </div>
      )}

      {/* KPI cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Lignes exploitables"
            value={summary.total}
            sub={`${summary.confirmed_by_whatsapp} confirmées WhatsApp`}
          />
          <KpiCard
            label="Preuves terrain"
            value={summary.confirmed_by_whatsapp}
            sub={`${summary.total - summary.missing_evidence} lignes avec signal`}
            accent="emerald"
          />
          <KpiCard
            label="Sans preuve"
            value={summary.missing_evidence}
            sub="à confirmer demain"
            accent={summary.missing_evidence > 0 ? "amber" : undefined}
          />
          <KpiCard
            label="Zones critiques"
            value={zeroPerimeters.length}
            sub={`${summary.short_issues + summary.missing_issues + summary.partial_progress} points à traiter`}
            accent={zeroPerimeters.length > 0 || criticalItems.length > 0 ? "red" : undefined}
          />
        </div>
      )}

      {/* Progress bar */}
      {summary && (
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Avancement global
          </h2>
          <DailyListProgress summary={summary} />
        </section>
      )}

      {/* By perimeter */}
      {summary && summary.by_perimeter.length > 0 && (
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3">
            Avancement par périmètre
          </h2>
          <div className="space-y-2">
            {summary.by_perimeter.map((p) => {
                  const pct = p.pct;
                  const critical = p.pct === 0 || (p.no_evidence > 0 && pct < 30);
              return (
                <div key={p.perimetro} className="flex items-center gap-3">
                  <span className={`w-28 shrink-0 text-xs font-medium truncate ${
                    critical ? "text-amber-600 dark:text-amber-400" : "text-zinc-600 dark:text-zinc-400"
                  }`}>
                    {p.perimetro}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${
                        pct === 0 ? "bg-zinc-300 dark:bg-zinc-600" :
                        pct < 50  ? "bg-amber-400" :
                        pct < 80  ? "bg-blue-400" :
                                    "bg-emerald-500"
                      }`}
                    />
                  </div>
                  <span className="w-20 text-right text-xs tabular-nums text-zinc-500">
                    {p.confirmed}/{p.total} · {pct}%
                  </span>
                  {p.no_evidence > 0 && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0">
                      {p.no_evidence} sans preuve
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {summary && summary.tomorrow_actions.length > 0 && (
        <section className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-4">
          <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
            Actions demain
          </h2>
          <ul className="space-y-2">
            {summary.tomorrow_actions.map((action) => (
              <li key={`${action.kind}-${action.perimetro ?? "all"}`} className="text-sm text-amber-800 dark:text-amber-300">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">{action.label}</span>
                  <span className="text-xs tabular-nums">{action.count}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {action.cable_codes.map((code) => (
                    <button
                      key={code}
                      onClick={() => navigate(`/command/cable/${encodeURIComponent(code)}`)}
                      className="font-mono text-[11px] rounded bg-white/70 dark:bg-black/20 px-1.5 py-0.5 hover:underline"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {equipmentImpacts.length > 0 && (
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3">
            Équipements touchés par la liste ({equipmentImpacts.length})
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {equipmentImpacts.slice(0, 18).map((equipment) => (
              <button
                key={equipment.equipment_code}
                onClick={() => navigate(`/command/equipment/${encodeURIComponent(equipment.equipment_code)}`)}
                className="text-left rounded-lg border border-zinc-100 dark:border-zinc-800 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold">{equipment.equipment_code}</span>
                  <span className={`text-[11px] font-semibold ${
                    equipment.risk_level === "critical" || equipment.risk_level === "high"
                      ? "text-red-600 dark:text-red-400"
                      : equipment.risk_level === "medium"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {equipment.risk_level}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {equipment.total_cables} câbles · {equipment.confirmed_by_field} preuves · {equipment.without_field_evidence} sans preuve
                </div>
                {equipment.risk_reasons[0] && (
                  <div className="mt-1 text-xs text-amber-600 dark:text-amber-400 truncate">
                    {equipment.risk_reasons[0]}
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {missingEvidenceItems.length > 0 && (
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3">
            Sans preuve WhatsApp ({missingEvidenceItems.length})
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {missingEvidenceItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.cable_story_path)}
                className="text-left rounded-lg border border-zinc-100 dark:border-zinc-800 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
              >
                <span className="font-mono text-sm font-semibold">{item.cable_code_normalized}</span>
                <span className="ml-2 text-xs text-zinc-400">{item.perimetro ?? "—"}</span>
                <span className="block text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {item.recommended_action}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {(criticalItems.length > 0 || zeroPerimeters.length > 0) && (
        <section className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3">
              Zones critiques
            </h2>
            {zeroPerimeters.length === 0 ? (
              <p className="text-sm text-zinc-400">Aucune zone à 0%.</p>
            ) : (
              <div className="space-y-2">
                {zeroPerimeters.map((zone) => (
                  <div key={zone.perimetro} className="flex items-center justify-between rounded-lg bg-red-50 dark:bg-red-900/10 px-3 py-2">
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">{zone.perimetro}</span>
                    <span className="text-xs text-red-600 dark:text-red-400">{zone.total} câbles · 0%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-3">
              Priorités absolues
            </h2>
            {absolutePriorities.length === 0 ? (
              <p className="text-sm text-zinc-400">Aucune priorité bloquante détectée.</p>
            ) : (
              <div className="space-y-2">
                {absolutePriorities.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.cable_story_path)}
                    className="w-full text-left flex items-start justify-between gap-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    <span>
                      <span className="font-mono text-sm font-semibold">{item.cable_code_normalized}</span>
                      <span className="block text-xs text-zinc-500">{item.recommended_action}</span>
                    </span>
                    <span className="text-[11px] text-zinc-400 whitespace-nowrap">{item.perimetro ?? "—"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Cable table */}
      {items && items.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 mb-3">
            Détail par câble ({items.length})
          </h2>
          <DailyListTable items={items} />
        </section>
      )}

      {/* AI briefing context (collapsible) */}
      {showBriefing && briefing && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-4">
          <h2 className="text-sm font-semibold text-zinc-500 mb-2">
            🤖 Contexte AI-ready — <span className="font-mono text-xs">{briefing.import_id}</span>
          </h2>
          <p className="text-xs text-zinc-400 mb-3">
            Ce JSON est prêt à être transmis à un AI Advisor. Aucun LLM n'a été appelé ici.
          </p>
          <pre className="text-[11px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 overflow-auto max-h-96">
            {JSON.stringify(briefing, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }: {
  label: string;
  value: number;
  sub?: string;
  accent?: "emerald" | "amber" | "red";
}) {
  const accentClass = accent === "emerald"
    ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20"
    : accent === "amber"
    ? "border-amber-200 bg-amber-50 dark:bg-amber-900/10"
    : accent === "red"
    ? "border-red-200 bg-red-50 dark:bg-red-900/10"
    : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900";

  const valueClass = accent === "emerald"
    ? "text-emerald-700 dark:text-emerald-400"
    : accent === "amber"
    ? "text-amber-700 dark:text-amber-400"
    : accent === "red"
    ? "text-red-700 dark:text-red-400"
    : "";

  return (
    <div className={`rounded-xl p-4 border ${accentClass}`}>
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}
