// src/features/core-command/command-center/CommandCenterPage.tsx — V6 mobile shell
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { listRecentImports, loadItemsWithEvidence } from "../../../modules/daily-lists/dailyLists.repo";
import { buildListSummary } from "../../../modules/daily-lists/dailyLists.logic";
import type { DailyListItemVM } from "../../../modules/daily-lists/dailyLists.types";
import { buildEquipmentImpactsFromDailyItems } from "../../../modules/equipment/equipment.logic";
import { AppBar, EmptyState, Pill, Screen, Section, StatCard } from "../../../components/command-ui";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";

export default function CommandCenterPage(): JSX.Element {
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
  const remaining = Math.max(total - done, 0);

  const noProof = items?.filter((item) => item.computed_status === "no_evidence") ?? [];
  const partial = items?.filter((item) => item.computed_status === "to_verify") ?? [];
  const blocked = items?.filter((item) => item.computed_status === "blocked") ?? [];
  const zeroZones = summary?.by_perimeter.filter((perimeter) => perimeter.pct === 0 && perimeter.total > 0) ?? [];
  const equipmentImpacts = items ? buildEquipmentImpactsFromDailyItems(items) : [];
  const criticalEquipment = equipmentImpacts.filter((equipment) => equipment.risk_level === "critical" || equipment.risk_level === "high");
  const recentSignals = (items ?? [])
    .filter((item) => item.last_event_at || item.last_evidence_at)
    .sort((left, right) => String(right.last_event_at ?? right.last_evidence_at).localeCompare(String(left.last_event_at ?? left.last_evidence_at)))
    .slice(0, 6);
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
            className="min-h-12 rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            Importer la liste du jour
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen className="max-w-6xl space-y-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.30)]">
        <AppBar
          title="Aujourd'hui"
          subtitle={new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
          action={<Pill tone={pct >= 80 ? "emerald" : pct >= 50 ? "sky" : pct > 0 ? "amber" : "neutral"}>{pct}% avancement</Pill>}
        />

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm text-zinc-400">
            {latest ? (
              <>
                <span className="truncate">{latest.file_name}</span>
                <span className="mx-2 text-zinc-700">·</span>
                <span>{latest.list_date ?? "date inconnue"}</span>
              </>
            ) : "Chargement de la liste active…"}
          </div>
          <button
            onClick={() => navigate("/command/daily-lists")}
            className="min-h-10 w-fit rounded-xl border border-zinc-800 px-3 text-xs font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-white"
          >
            Changer de liste →
          </button>
        </div>

        {summary ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-end gap-4">
              <span className="text-7xl font-black leading-none tracking-tighter text-white sm:text-8xl">
                {pct}<span className="text-4xl text-zinc-600 sm:text-5xl">%</span>
              </span>
              <span className="pb-2 text-sm leading-relaxed text-zinc-500">
                {done} / {total}<br />câbles
              </span>
            </div>

            <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800/80">
              {[
                { count: summary.confirmed, className: "bg-emerald-500" },
                { count: summary.likely_laid, className: "bg-sky-500" },
                { count: summary.to_verify, className: "bg-amber-400" },
                { count: summary.no_evidence, className: "bg-zinc-700" },
                { count: summary.blocked, className: "bg-red-500" },
              ].filter((segment) => segment.count > 0).map((segment) => (
                <div
                  key={segment.className}
                  style={{ width: `${total > 0 ? (segment.count / total) * 100 : 0}%` }}
                  className={segment.className}
                />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {isError ? (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-300">Preuves terrain non chargées</p>
          <p className="mt-1 text-xs text-amber-200/70">
            Le chargement des preuves terrain a échoué. L'avancement ci-dessous peut être incomplet.
          </p>
        </div>
      ) : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Confirmés" value={done} helper={`${total} câbles au total`} tone="emerald" />
          <StatCard label="Restants" value={remaining} helper="à suivre sur le terrain" tone={remaining > 0 ? "amber" : "neutral"} />
          <StatCard label="Sans preuve" value={noProof.length} helper="à confirmer" tone={noProof.length > 0 ? "amber" : "neutral"} />
          <StatCard label="Problèmes" value={problemCount} helper="partiels, bloqués, zones ou équipements" tone={problemCount > 0 ? "red" : "neutral"} />
        </div>
      ) : null}

      {!isLoading ? (
        <Section title="Actions maintenant" eyebrow="Priorité chantier" count={noProof.length + partial.length + blocked.length + zeroZones.length + criticalEquipment.length}>
          <div className="grid gap-3 lg:grid-cols-2">
            <ActionCard
              title="Sans preuve"
              count={noProof.length}
              tone="amber"
              empty="Aucun câble sans preuve."
              footer={noProof.length > 0 ? `Demander une confirmation à ${uniqueActors(noProof) || "l'équipe"}.` : undefined}
              onOpenAll={() => latest && navigate(`/command/daily-lists/${latest.id}`)}
            >
              <CableButtons items={noProof.slice(0, 12)} onOpen={(code) => navigate(`/command/cable/${encodeURIComponent(code)}`)} />
            </ActionCard>

            <ActionCard
              title="Partiels / à vérifier"
              count={partial.length}
              tone="sky"
              empty="Aucun signal partiel."
              footer={partial.length > 0 ? "Vérifier l'achèvement demain matin." : undefined}
              onOpenAll={() => latest && navigate(`/command/daily-lists/${latest.id}`)}
            >
              <CableButtons items={partial.slice(0, 12)} onOpen={(code) => navigate(`/command/cable/${encodeURIComponent(code)}`)} />
            </ActionCard>

            <ActionCard
              title="Bloqués"
              count={blocked.length}
              tone="red"
              empty="Aucun câble bloqué."
              onOpenAll={() => navigate("/command/problems")}
            >
              <CableButtons items={blocked.slice(0, 12)} onOpen={(code) => navigate(`/command/cable/${encodeURIComponent(code)}`)} />
            </ActionCard>

            <ActionCard
              title="Zones à 0%"
              count={zeroZones.length}
              tone="amber"
              empty="Aucune zone à 0%."
              onOpenAll={() => latest && navigate(`/command/daily-lists/${latest.id}`)}
            >
              <div className="space-y-2">
                {zeroZones.slice(0, 6).map((zone) => (
                  <button
                    key={zone.perimetro}
                    onClick={() => latest && navigate(`/command/daily-lists/${latest.id}`)}
                    className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-left transition hover:border-amber-500/40"
                  >
                    <span className="text-sm font-medium text-zinc-100">{zone.perimetro}</span>
                    <span className="text-xs text-amber-300">{zone.total} câbles</span>
                  </button>
                ))}
              </div>
            </ActionCard>

            <ActionCard
              title="Équipements critiques"
              count={criticalEquipment.length}
              tone="red"
              empty="Aucun équipement critique."
              onOpenAll={() => criticalEquipment[0] && navigate(`/command/equipment/${encodeURIComponent(criticalEquipment[0].equipment_code)}`)}
            >
              <div className="space-y-2">
                {criticalEquipment.slice(0, 4).map((equipment) => (
                  <button
                    key={equipment.equipment_code}
                    onClick={() => navigate(`/command/equipment/${encodeURIComponent(equipment.equipment_code)}`)}
                    className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-left transition hover:border-red-500/40"
                  >
                    <span className="font-mono text-sm font-semibold text-white">{equipment.equipment_code}</span>
                    <span className="text-xs text-red-200">{equipment.without_field_evidence} sans preuve</span>
                  </button>
                ))}
              </div>
            </ActionCard>
          </div>
        </Section>
      ) : null}

      {summary && summary.by_perimeter.length > 0 ? (
        <Section title="Avancement par zone" eyebrow="Périmètres" count={summary.by_perimeter.length}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summary.by_perimeter.map((perimeter) => {
              const perimeterPct = perimeter.total > 0 ? Math.round((perimeter.confirmed / perimeter.total) * 100) : 0;
              const isLate = perimeterPct < 50 && perimeter.total >= 3;

              return (
                <button
                  key={perimeter.perimetro}
                  onClick={() => latest && navigate(`/command/daily-lists/${latest.id}`)}
                  className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 text-left transition hover:border-sky-500/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`truncate text-sm font-semibold ${isLate ? "text-amber-300" : "text-zinc-100"}`}>{perimeter.perimetro}</span>
                    <Pill tone={perimeterPct >= 80 ? "emerald" : perimeterPct >= 50 ? "sky" : perimeterPct > 0 ? "amber" : "neutral"}>{perimeterPct}%</Pill>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      style={{ width: `${perimeterPct}%` }}
                      className={`h-full rounded-full ${perimeterPct === 0 ? "bg-zinc-700" : perimeterPct < 50 ? "bg-amber-400" : perimeterPct < 80 ? "bg-sky-500" : "bg-emerald-500"}`}
                    />
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {perimeter.confirmed} confirmé{perimeter.confirmed > 1 ? "s" : ""} · {perimeter.total - perimeter.confirmed} restant{(perimeter.total - perimeter.confirmed) > 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </Section>
      ) : null}

      {criticalEquipment.length > 0 ? (
        <Section title="Équipements critiques" eyebrow="APP à surveiller" count={criticalEquipment.length}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {criticalEquipment.slice(0, 9).map((equipment) => (
              <button
                key={equipment.equipment_code}
                onClick={() => navigate(`/command/equipment/${encodeURIComponent(equipment.equipment_code)}`)}
                className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-left transition hover:border-red-400/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-base font-semibold text-white">{equipment.equipment_code}</span>
                  <Pill tone="red">{equipment.risk_level}</Pill>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <span>{equipment.total_cables} câbles liés</span>
                  <span>{equipment.without_field_evidence} sans preuve</span>
                </div>
                {equipment.risk_reasons[0] ? <p className="mt-3 text-xs leading-5 text-red-200">{equipment.risk_reasons[0]}</p> : null}
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      {!isLoading && recentSignals.length > 0 ? (
        <Section title="Derniers signaux terrain" eyebrow="WhatsApp / Telegram" count={recentSignals.length}>
          <div className="grid gap-3 md:grid-cols-2">
            {recentSignals.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/command/cable/${encodeURIComponent(item.cable_code_normalized)}`)}
                className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 text-left transition hover:border-sky-500/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-base font-semibold text-white">{formatCableDisplay(item.cable_code_normalized)}</span>
                  <Pill tone={item.computed_status === "blocked" ? "red" : item.computed_status === "to_verify" ? "amber" : item.computed_status === "confirmed_field" ? "emerald" : "neutral"}>
                    {statusLabel(item.computed_status)}
                  </Pill>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {item.last_actor ?? "Équipe"} · {formatEventDate(item.last_event_at ?? item.last_evidence_at)}
                </p>
                {item.last_message ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-300">{item.last_message}</p> : null}
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      {summary && noProof.length === 0 && partial.length === 0 && blocked.length === 0 && zeroZones.length === 0 && criticalEquipment.length === 0 ? (
        <EmptyState
          title={isError ? "Preuves terrain non chargées" : done >= total && total > 0 ? "Tous les câbles sont confirmés" : "Aucune action immédiate"}
          description={isError ? "Réessayer après synchronisation terrain." : "Le cockpit ne détecte aucune alerte prioritaire sur la liste active."}
        />
      ) : null}
    </Screen>
  );
}

function uniqueActors(items: DailyListItemVM[]): string {
  return [...new Set(items.map((item) => item.last_actor).filter(Boolean))].slice(0, 3).join(", ");
}

function formatEventDate(value: string | null): string {
  if (!value) return "date inconnue";
  return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmed_field: "Confirmé",
    likely_laid: "Probable",
    to_verify: "À vérifier",
    no_evidence: "Sans preuve",
    missing: "Manquant",
    blocked: "Bloqué",
    outside_inca: "Hors INCA",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

function ActionCard({
  title,
  count,
  tone,
  empty,
  footer,
  onOpenAll,
  children,
}: {
  title: string;
  count: number;
  tone: "amber" | "red" | "sky";
  empty: string;
  footer?: string;
  onOpenAll: () => void;
  children: ReactNode;
}): JSX.Element {
  return (
    <article className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <Pill tone={tone}>{count}</Pill>
      </div>
      <div className="mt-3">
        {count > 0 ? children : <p className="text-sm text-zinc-500">{empty}</p>}
      </div>
      {footer ? <p className="mt-3 text-xs leading-5 text-zinc-500">{footer}</p> : null}
      {count > 0 ? (
        <button onClick={onOpenAll} className="mt-3 text-xs font-medium text-sky-300 transition hover:text-sky-200">
          Voir le détail →
        </button>
      ) : null}
    </article>
  );
}

function CableButtons({
  items,
  onOpen,
}: {
  items: DailyListItemVM[];
  onOpen: (code: string) => void;
}): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onOpen(item.cable_code_normalized)}
          className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-2.5 py-1.5 font-mono text-xs font-semibold text-zinc-200 transition hover:border-sky-500/40 hover:text-sky-300"
        >
          {formatCableDisplay(item.cable_code_normalized)}
        </button>
      ))}
    </div>
  );
}
