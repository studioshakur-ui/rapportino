// src/features/core-command/command-center/CommandCenterPage.tsx
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { listRecentImports, loadItemsWithEvidence } from "../../../modules/daily-lists/dailyLists.repo";
import { buildListSummary } from "../../../modules/daily-lists/dailyLists.logic";
import type { DailyListItemVM } from "../../../modules/daily-lists/dailyLists.types";
import { buildEquipmentImpactsFromDailyItems } from "../../../modules/equipment/equipment.logic";
import { Pill, Screen, StatCard, EmptyState } from "../../../components/command-ui";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";

export default function CommandCenterPage(): JSX.Element {
  const navigate = useNavigate();

  const { data: imports } = useQuery({
    queryKey: ["daily_list_imports"],
    queryFn: () => listRecentImports(1),
    staleTime: 60_000,
  });
  const latest = imports?.[0] ?? null;

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ["daily_list_items_vm", latest?.id],
    queryFn: () => loadItemsWithEvidence(latest!.id),
    enabled: Boolean(latest?.id),
    staleTime: 60_000,
  });

  const summary = latest && items
    ? buildListSummary(latest.id, latest.list_date, latest.file_name, items)
    : null;

  const done       = (summary?.confirmed ?? 0) + (summary?.likely_laid ?? 0);
  const total      = summary?.total ?? 0;
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0;
  const remaining  = Math.max(total - done, 0);

  const noProof    = items?.filter((i) => i.computed_status === "no_evidence") ?? [];
  const partial    = items?.filter((i) => i.computed_status === "to_verify") ?? [];
  const blocked    = items?.filter((i) => i.computed_status === "blocked") ?? [];
  const zeroZones  = summary?.by_perimeter.filter((p) => p.pct === 0 && p.total > 0) ?? [];
  const equipmentImpacts   = items ? buildEquipmentImpactsFromDailyItems(items) : [];
  const criticalEquipment  = equipmentImpacts.filter((e) => e.risk_level === "critical" || e.risk_level === "high");
  const recentSignals      = (items ?? [])
    .filter((i) => i.last_event_at || i.last_evidence_at)
    .sort((a, b) => String(b.last_event_at ?? b.last_evidence_at).localeCompare(String(a.last_event_at ?? a.last_evidence_at)))
    .slice(0, 8);
  const problemCount = partial.length + blocked.length + zeroZones.length + criticalEquipment.length;

  if (!latest && !isLoading) {
    return (
      <Screen>
        <EmptyState
          title="Aucune liste importée"
          description="Importer la liste du jour pour ouvrir le cockpit chantier."
          icon="📋"
        />
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/command/daily-lists")}
            className="min-h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Importer la liste du jour
          </button>
        </div>
      </Screen>
    );
  }

  const listLabel = latest?.list_date
    ? `Liste du ${new Date(latest.list_date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`
    : (latest?.file_name ?? "Liste active");

  return (
    <Screen className="max-w-6xl space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Cockpit chantier</h1>
          {latest && (
            <p className="mt-0.5 text-sm text-gray-500">{listLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={pct >= 80 ? "emerald" : pct >= 50 ? "blue" : pct > 0 ? "amber" : "neutral"}>
            {pct}% avancement
          </Pill>
          <button
            onClick={() => navigate("/command/daily-lists")}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            Changer de liste
          </button>
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Preuves terrain non chargées</p>
          <p className="mt-1 text-xs text-amber-700">L'avancement ci-dessous peut être incomplet.</p>
        </div>
      )}

      {/* ── Big progress ── */}
      {summary && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-end gap-6">
            <div>
              <span className="text-7xl font-black leading-none tracking-tighter text-gray-900 sm:text-8xl">
                {pct}
              </span>
              <span className="text-4xl font-black text-gray-300 sm:text-5xl">%</span>
            </div>
            <div className="pb-2 text-sm leading-relaxed text-gray-500">
              {done} confirmés<br />{total} câbles total
            </div>
          </div>

          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-gray-100">
            {[
              { count: summary.confirmed,   className: "bg-emerald-500" },
              { count: summary.likely_laid, className: "bg-blue-400" },
              { count: summary.to_verify,   className: "bg-amber-400" },
              { count: summary.no_evidence, className: "bg-gray-300" },
              { count: summary.blocked,     className: "bg-red-500" },
            ].filter((s) => s.count > 0).map((s) => (
              <div
                key={s.className}
                style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }}
                className={s.className}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
            <span><span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1" />{summary.confirmed} confirmés</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-blue-400 mr-1" />{summary.likely_laid} probables</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-amber-400 mr-1" />{summary.to_verify} à vérifier</span>
            <span><span className="inline-block h-2 w-2 rounded-full bg-gray-300 mr-1" />{summary.no_evidence} sans preuve</span>
            {summary.blocked > 0 && <span><span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-1" />{summary.blocked} bloqués</span>}
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Confirmés" value={done} helper={`/ ${total} câbles`} tone="emerald" />
          <StatCard label="Restants" value={remaining} helper="à suivre" tone={remaining > 0 ? "amber" : "neutral"} />
          <StatCard label="Sans preuve" value={noProof.length} helper="à confirmer" tone={noProof.length > 0 ? "amber" : "neutral"} />
          <StatCard label="Alertes" value={problemCount} helper="partiels · bloqués · zones" tone={problemCount > 0 ? "red" : "neutral"} />
        </div>
      )}

      {/* ── Action grid ── */}
      {!isLoading && summary && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Actions prioritaires</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            <ActionCard title="Sans preuve terrain" count={noProof.length} tone="amber" empty="Aucun câble sans preuve." onViewAll={() => latest && navigate(`/command/daily-lists/${latest.id}`)}>
              <CableChips items={noProof.slice(0, 12)} onOpen={(c) => navigate(`/command/cable/${encodeURIComponent(c)}`)} />
            </ActionCard>

            <ActionCard title="Partiels / à vérifier" count={partial.length} tone="blue" empty="Aucun signal partiel." onViewAll={() => latest && navigate(`/command/daily-lists/${latest.id}`)}>
              <CableChips items={partial.slice(0, 12)} onOpen={(c) => navigate(`/command/cable/${encodeURIComponent(c)}`)} />
            </ActionCard>

            <ActionCard title="Câbles bloqués" count={blocked.length} tone="red" empty="Aucun câble bloqué." onViewAll={() => navigate("/command/problems")}>
              <CableChips items={blocked.slice(0, 12)} onOpen={(c) => navigate(`/command/cable/${encodeURIComponent(c)}`)} />
            </ActionCard>

            <ActionCard title="Zones à 0%" count={zeroZones.length} tone="amber" empty="Aucune zone à 0%." onViewAll={() => latest && navigate(`/command/daily-lists/${latest.id}`)}>
              <div className="space-y-1.5">
                {zeroZones.slice(0, 5).map((z) => (
                  <button
                    key={z.perimetro}
                    onClick={() => latest && navigate(`/command/daily-lists/${latest.id}`)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm transition hover:border-amber-300 hover:bg-amber-50"
                  >
                    <span className="font-medium text-gray-800">{z.perimetro}</span>
                    <span className="text-xs text-amber-700">{z.total} câbles</span>
                  </button>
                ))}
              </div>
            </ActionCard>
          </div>
        </div>
      )}

      {/* ── Zone progress ── */}
      {summary && summary.by_perimeter.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Avancement par zone <span className="ml-2 text-gray-400 normal-case font-normal">({summary.by_perimeter.length} périmètres)</span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summary.by_perimeter.map((p) => {
              const perimPct = p.total > 0 ? Math.round((p.confirmed / p.total) * 100) : 0;
              const tone = perimPct >= 80 ? "emerald" : perimPct >= 50 ? "blue" : perimPct > 0 ? "amber" : "red";
              return (
                <button
                  key={p.perimetro}
                  onClick={() => latest && navigate(`/command/daily-lists/${latest.id}`)}
                  className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-gray-900">{p.perimetro}</span>
                    <Pill tone={tone}>{perimPct}%</Pill>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      style={{ width: `${perimPct}%` }}
                      className={`h-full rounded-full ${perimPct === 0 ? "bg-gray-200" : perimPct < 50 ? "bg-amber-400" : perimPct < 80 ? "bg-blue-500" : "bg-emerald-500"}`}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {p.confirmed} confirmé{p.confirmed > 1 ? "s" : ""} · {p.total - p.confirmed} restant{(p.total - p.confirmed) > 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Critical equipment ── */}
      {criticalEquipment.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Équipements critiques</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {criticalEquipment.slice(0, 9).map((eq) => (
              <div key={eq.equipment_code} className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-base font-bold text-red-900">{eq.equipment_code}</span>
                  <Pill tone="red">{eq.risk_level}</Pill>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-red-700">
                  <span>{eq.total_cables} câbles liés</span>
                  <span>{eq.without_field_evidence} sans preuve</span>
                </div>
                {eq.risk_reasons[0] && <p className="mt-2 text-xs leading-5 text-red-700">{eq.risk_reasons[0]}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent signals ── */}
      {!isLoading && recentSignals.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Derniers signaux terrain
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Câble</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Statut</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 sm:table-cell">Acteur</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Heure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentSignals.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/command/cable/${encodeURIComponent(item.cable_code_normalized)}`)}
                    className="cursor-pointer transition hover:bg-blue-50/50"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {formatCableDisplay(item.cable_code_normalized)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={item.computed_status === "blocked" ? "red" : item.computed_status === "to_verify" ? "amber" : item.computed_status === "confirmed_field" ? "emerald" : "neutral"}>
                        {statusLabel(item.computed_status)}
                      </Pill>
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-gray-500 sm:table-cell">{item.last_actor ?? "—"}</td>
                    <td className="hidden max-w-[200px] truncate px-4 py-3 text-xs text-gray-600 md:table-cell">{item.last_message ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(item.last_event_at ?? item.last_evidence_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── All clear ── */}
      {summary && noProof.length === 0 && partial.length === 0 && blocked.length === 0 && zeroZones.length === 0 && criticalEquipment.length === 0 && (
        <EmptyState
          title={done >= total && total > 0 ? "Tous les câbles sont confirmés ✓" : "Aucune action immédiate"}
          description="Le cockpit ne détecte aucune alerte prioritaire sur la liste active."
          icon="✓"
        />
      )}
    </Screen>
  );
}

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    confirmed_field: "Confirmé",
    likely_laid:     "Probable",
    to_verify:       "À vérifier",
    no_evidence:     "Sans preuve",
    missing:         "Manquant",
    blocked:         "Bloqué",
    outside_inca:    "Hors INCA",
  };
  return m[s] ?? s.replace(/_/g, " ");
}

function formatDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function ActionCard({ title, count, tone, empty, onViewAll, children }: {
  title: string; count: number; tone: "amber" | "red" | "blue";
  empty: string; onViewAll: () => void; children: ReactNode;
}): JSX.Element {
  const toneMap: Record<string, string> = {
    amber: "border-amber-200 bg-amber-50",
    red:   "border-red-200 bg-red-50",
    blue:  "border-blue-200 bg-blue-50",
  };
  return (
    <div className={`rounded-xl border p-4 ${count > 0 ? toneMap[tone] : "border-gray-200 bg-white"}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <Pill tone={count > 0 ? tone as any : "neutral"}>{count}</Pill>
      </div>
      <div className="mt-3">
        {count > 0 ? children : <p className="text-sm text-gray-400">{empty}</p>}
      </div>
      {count > 0 && (
        <button onClick={onViewAll} className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 transition">
          Voir le détail →
        </button>
      )}
    </div>
  );
}

function CableChips({ items, onOpen }: { items: DailyListItemVM[]; onOpen: (code: string) => void }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onOpen(item.cable_code_normalized)}
          className="rounded-md border border-gray-300 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-gray-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
        >
          {formatCableDisplay(item.cable_code_normalized)}
        </button>
      ))}
    </div>
  );
}
