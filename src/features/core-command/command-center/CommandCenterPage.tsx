// src/features/core-command/command-center/CommandCenterPage.tsx — CORE COMMAND dashboard
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { listRecentImports, loadItemsWithEvidence } from "../../../modules/daily-lists/dailyLists.repo";
import { buildListSummary } from "../../../modules/daily-lists/dailyLists.logic";
import type { DailyListItemVM } from "../../../modules/daily-lists/dailyLists.types";
import { buildEquipmentImpactsFromDailyItems } from "../../../modules/equipment/equipment.logic";
import { Pill, Screen, StatCard, EmptyState, Section, AppBar } from "../../../components/command-ui";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { listRecentTelegramMessages, type TelegramLiveMessage } from "../api/telegramMessages.api";

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

  const { data: telegramMessages } = useQuery({
    queryKey: ["telegram_live_feed"],
    queryFn: () => listRecentTelegramMessages(12),
    staleTime: 30_000,
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

  return (
    <Screen className="max-w-6xl space-y-6">
      <section className="rounded-[32px] border border-stone-200 bg-[linear-gradient(135deg,#ffffff_0%,#f6f0e3_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <AppBar
          title="Dashboard chantier"
          subtitle={new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
          action={<Pill tone={pct >= 80 ? "emerald" : pct >= 50 ? "sky" : pct > 0 ? "amber" : "neutral"}>{pct}% avancement</Pill>}
        />

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm text-stone-600">
            {latest ? (
              <>
                <span className="truncate">{latest.file_name}</span>
                <span className="mx-2 text-stone-300">·</span>
                <span>{latest.list_date ?? "date inconnue"}</span>
              </>
            ) : "Chargement de la liste active…"}
          </div>
          <button
            onClick={() => navigate("/command/daily-lists")}
            className="min-h-10 w-fit rounded-2xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-950"
          >
            Changer de liste
          </button>
        </div>

        {summary ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-end gap-4">
              <span className="text-7xl font-black leading-none tracking-tighter text-stone-950 sm:text-8xl">
                {pct}<span className="text-4xl text-stone-400 sm:text-5xl">%</span>
              </span>
              <span className="pb-2 text-sm leading-relaxed text-stone-600">
                {done} / {total}<br />câbles
              </span>
            </div>

            <div className="flex h-2 overflow-hidden rounded-full bg-stone-200">
              {[
                { count: summary.confirmed, className: "bg-emerald-500" },
                { count: summary.likely_laid, className: "bg-sky-500" },
                { count: summary.to_verify, className: "bg-amber-400" },
                { count: summary.no_evidence, className: "bg-stone-400" },
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
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Preuves terrain non chargées</p>
          <p className="mt-1 text-xs text-amber-700">
            Le chargement des preuves terrain a échoué. L'avancement ci-dessous peut être incomplet.
          </p>
        </div>
      ) : null}

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Confirmés" value={done} helper={`/ ${total} câbles`} tone="emerald" />
          <StatCard label="Restants" value={remaining} helper="à suivre" tone={remaining > 0 ? "amber" : "neutral"} />
          <StatCard label="Sans preuve" value={noProof.length} helper="à confirmer" tone={noProof.length > 0 ? "amber" : "neutral"} />
          <StatCard label="Alertes" value={problemCount} helper="partiels · bloqués · zones" tone={problemCount > 0 ? "red" : "neutral"} />
        </div>
      ) : null}

      <TelegramLiveSection
        messages={telegramMessages ?? []}
        onOpenCable={(code) => navigate(`/command/cable/${encodeURIComponent(code)}`)}
      />

      {!isLoading && summary ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">Actions prioritaires</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            <ActionCard title="Sans preuve terrain" count={noProof.length} tone="amber" empty="Aucun câble sans preuve." onViewAll={() => latest && navigate(`/command/daily-lists/${latest.id}`)}>
              <CableChips items={noProof.slice(0, 12)} onOpen={(c) => navigate(`/command/cable/${encodeURIComponent(c)}`)} />
            </ActionCard>

            <ActionCard title="Partiels / à vérifier" count={partial.length} tone="amber" empty="Aucun signal partiel." onViewAll={() => latest && navigate(`/command/daily-lists/${latest.id}`)}>
              <CableChips items={partial.slice(0, 12)} onOpen={(c) => navigate(`/command/cable/${encodeURIComponent(c)}`)} />
            </ActionCard>

            <ActionCard title="Câbles bloqués" count={blocked.length} tone="red" empty="Aucun câble bloqué." onViewAll={() => navigate("/command/problems")}>
              <CableChips items={blocked.slice(0, 12)} onOpen={(c) => navigate(`/command/cable/${encodeURIComponent(c)}`)} />
            </ActionCard>

            <ActionCard title="Zones à 0%" count={zeroZones.length} tone="amber" empty="Aucune zone à 0%." onViewAll={() => latest && navigate(`/command/daily-lists/${latest.id}`)}>
              <div className="space-y-1.5">
                {zeroZones.slice(0, 5).map((zone) => (
                  <button
                    key={zone.perimetro}
                    onClick={() => latest && navigate(`/command/daily-lists/${latest.id}`)}
                    className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-left transition hover:border-amber-300"
                  >
                    <span className="text-sm font-medium text-stone-900">{zone.perimetro}</span>
                    <span className="text-xs text-amber-700">{zone.total} câbles</span>
                  </button>
                ))}
              </div>
            </ActionCard>
          </div>
        </div>
      ) : null}

      {summary && summary.by_perimeter.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
            Avancement par zone <span className="ml-2 text-stone-400 normal-case font-normal">({summary.by_perimeter.length} périmètres)</span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summary.by_perimeter.map((perimeter) => {
              const perimeterPct = perimeter.total > 0 ? Math.round((perimeter.confirmed / perimeter.total) * 100) : 0;
              return (
                <button
                  key={perimeter.perimetro}
                  onClick={() => latest && navigate(`/command/daily-lists/${latest.id}`)}
                  className="rounded-[28px] border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-stone-950">{perimeter.perimetro}</span>
                    <Pill tone={perimeterPct >= 80 ? "emerald" : perimeterPct >= 50 ? "sky" : perimeterPct > 0 ? "amber" : "neutral"}>{perimeterPct}%</Pill>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-stone-200">
                    <div
                      style={{ width: `${perimeterPct}%` }}
                      className={`h-full rounded-full ${perimeterPct === 0 ? "bg-stone-400" : perimeterPct < 50 ? "bg-amber-400" : perimeterPct < 80 ? "bg-sky-500" : "bg-emerald-500"}`}
                    />
                  </div>
                  <p className="mt-2 text-xs text-stone-600">
                    {perimeter.confirmed} confirmé{perimeter.confirmed > 1 ? "s" : ""} · {perimeter.total - perimeter.confirmed} restant{(perimeter.total - perimeter.confirmed) > 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {criticalEquipment.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">Équipements critiques</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {criticalEquipment.slice(0, 9).map((equipment) => (
              <button
                key={equipment.equipment_code}
                onClick={() => navigate(`/command/equipment/${encodeURIComponent(equipment.equipment_code)}`)}
                className="rounded-[28px] border border-rose-200 bg-rose-50/70 p-4 text-left shadow-sm transition hover:border-rose-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-base font-semibold text-stone-950">{equipment.equipment_code}</span>
                  <Pill tone="red">{equipment.risk_level}</Pill>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-600">
                  <span>{equipment.total_cables} câbles liés</span>
                  <span>{equipment.without_field_evidence} sans preuve</span>
                </div>
                {equipment.risk_reasons[0] ? <p className="mt-3 text-xs leading-5 text-rose-700">{equipment.risk_reasons[0]}</p> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!isLoading && recentSignals.length > 0 ? (
        <Section title="Derniers signaux terrain" eyebrow="WhatsApp / Telegram" count={recentSignals.length}>
          <div className="grid gap-3 md:grid-cols-2">
            {recentSignals.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/command/cable/${encodeURIComponent(item.cable_code_normalized)}`)}
                className="rounded-[28px] border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-base font-semibold text-stone-950">{formatCableDisplay(item.cable_code_normalized)}</span>
                  <Pill tone={item.computed_status === "blocked" ? "red" : item.computed_status === "to_verify" ? "amber" : item.computed_status === "confirmed_field" ? "emerald" : "neutral"}>
                    {statusLabel(item.computed_status)}
                  </Pill>
                </div>
                <p className="mt-2 text-xs text-stone-600">
                  {item.last_actor ?? "Équipe"} · {formatEventDate(item.last_event_at ?? item.last_evidence_at)}
                </p>
                {item.last_message ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-700">{item.last_message}</p> : null}
              </button>
            ))}
          </div>
        </Section>
      ) : null}

      {summary && noProof.length === 0 && partial.length === 0 && blocked.length === 0 && zeroZones.length === 0 && criticalEquipment.length === 0 ? (
        <EmptyState
          title={done >= total && total > 0 ? "Tous les câbles sont confirmés ✓" : "Aucune action immédiate"}
          description="Le cockpit ne détecte aucune alerte prioritaire sur la liste active."
          icon="✓"
        />
      ) : null}
    </Screen>
  );
}

function TelegramLiveSection({
  messages,
  onOpenCable,
}: {
  messages: TelegramLiveMessage[];
  onOpenCable: (code: string) => void;
}): JSX.Element {
  const messagesWithCable = messages.filter((message) => message.cable_refs.length > 0).length;

  return (
    <Section title="Telegram live" eyebrow="Flux terrain officiel" count={messages.length}>
      {messages.length === 0 ? (
        <EmptyState
          title="Aucun message Telegram capturé"
          description="Le flux se remplira dès que le bot Railway reçoit un message du groupe chantier."
          icon="📡"
        />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Messages récents" value={messages.length} helper="capturés en DB" tone="sky" />
            <StatCard label="Avec câbles" value={messagesWithCable} helper="ouvrables en Cable Story" tone={messagesWithCable > 0 ? "emerald" : "neutral"} />
            <StatCard label="Sans code" value={messages.length - messagesWithCable} helper="contexte terrain" tone="neutral" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {messages.map((message) => (
              <article key={message.id} className="rounded-[28px] border border-sky-200 bg-sky-50/70 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-950">{message.sender_name ?? "Telegram"}</p>
                    <p className="mt-1 text-xs text-stone-600">
                      {formatEventDate(message.message_ts ?? message.created_at)}
                      {message.message_type ? ` · ${message.message_type}` : ""}
                    </p>
                  </div>
                  <Pill tone={message.cable_refs.length > 0 ? "emerald" : "neutral"}>
                    {message.cable_refs.length > 0 ? `${message.cable_refs.length} câble${message.cable_refs.length > 1 ? "s" : ""}` : "info"}
                  </Pill>
                </div>

                <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-stone-700">
                  {message.text || "Message sans texte"}
                </p>

                {message.cable_refs.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {message.cable_refs.slice(0, 10).map((code) => (
                      <button
                        key={code}
                        onClick={() => onOpenCable(code)}
                        className="rounded-xl border border-stone-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-stone-700 transition hover:border-sky-300 hover:text-sky-700"
                      >
                        {formatCableDisplay(code)}
                      </button>
                    ))}
                    {message.cable_refs.length > 10 ? (
                      <span className="self-center text-xs text-stone-500">+{message.cable_refs.length - 10}</span>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

function formatEventDate(value: string | null): string {
  if (!value) return "date inconnue";
  return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmed_field: "Confirmé",
    likely_laid:     "Probable",
    to_verify:       "À vérifier",
    no_evidence:     "Sans preuve",
    missing:         "Manquant",
    blocked:         "Bloqué",
    outside_inca:    "Hors INCA",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

function ActionCard({ title, count, tone, empty, onViewAll, children }: {
  title: string; count: number; tone: "amber" | "red";
  empty: string; onViewAll: () => void; children: ReactNode;
}): JSX.Element {
  return (
    <article className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-950">{title}</h3>
        <Pill tone={count > 0 ? tone : "neutral"}>{count}</Pill>
      </div>
      <div className="mt-3">
        {count > 0 ? children : <p className="text-sm text-stone-600">{empty}</p>}
      </div>
      {count > 0 ? (
        <button onClick={onViewAll} className="mt-3 text-xs font-medium text-sky-700 transition hover:text-sky-800">
          Voir le détail →
        </button>
      ) : null}
    </article>
  );
}

function CableChips({ items, onOpen }: { items: DailyListItemVM[]; onOpen: (code: string) => void }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onOpen(item.cable_code_normalized)}
          className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 font-mono text-xs font-semibold text-stone-700 transition hover:border-sky-300 hover:text-sky-700"
        >
          {formatCableDisplay(item.cable_code_normalized)}
        </button>
      ))}
    </div>
  );
}
