import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, Pill, ProgressBar, Screen, Section, StatCard } from "../../components/command-ui";
import { formatCableDisplay } from "../../core/cable/cableDisplay";
import { loadCoreEngineSnapshot, type CoreEngineSnapshot } from "../../domain/core-engine";
import { translateIncaStatus } from "../../domain/core-engine/incaStatus";

type Direction = "incoming" | "outgoing";

type CableCard = {
  cableCode: string;
  displayCableCode: string;
  direction: Direction;
  appPartenza: string | null;
  appArrivo: string | null;
  system: string | null;
  area: string | null;
  incaStatus: string | null;
  terrainStatus: string;
  reason: string;
  note: string | null;
  confirmedHere: boolean;
};

function normalizeKey(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function buildCableCards(snapshot: CoreEngineSnapshot | null, equipmentCode: string, confirmedCodes: Set<string>): CableCard[] {
  if (!snapshot) return [];

  const sourceRows = [
    ...snapshot.field.priority_items,
    ...snapshot.field.missing_evidence_items,
    ...snapshot.field.partial_items,
    ...snapshot.field.blocked_items,
  ];

  const seen = new Set<string>();
  const cards: CableCard[] = [];

  for (const row of sourceRows) {
    const cableCode = row.cable_code;
    if (seen.has(cableCode)) continue;

    const partenza = normalizeKey(row.app_partenza);
    const arrivo = normalizeKey(row.app_arrivo);
    const current = normalizeKey(equipmentCode);
    const direction: Direction | null =
      partenza === current ? "outgoing" : arrivo === current ? "incoming" : null;

    if (!direction) continue;

    const inca = translateIncaStatus(row.situazione_inca ?? row.stato_collegamento);
    const confirmedHere = confirmedCodes.has(cableCode) || row.confirmed_by_whatsapp || row.computed_status === "confirmed_field";

    cards.push({
      cableCode,
      displayCableCode: row.display_cable_code || formatCableDisplay(row.cable_code_raw ?? row.cable_code),
      direction,
      appPartenza: row.app_partenza,
      appArrivo: row.app_arrivo,
      system: row.perimetro ?? null,
      area: row.note ?? null,
      incaStatus: inca.raw ?? row.situazione_inca ?? row.stato_collegamento,
      terrainStatus: confirmedHere
        ? "Verificato"
        : row.computed_status === "blocked"
          ? "Bloccante"
          : row.computed_status === "to_verify"
            ? "Non verificato"
            : "Da verificare",
      reason: row.recommended_action,
      note: row.last_message ?? row.note,
      confirmedHere,
    });
    seen.add(cableCode);
  }

  return cards;
}

function statusTone(status: string | null | undefined): "neutral" | "emerald" | "amber" | "red" | "sky" {
  const translated = translateIncaStatus(status);
  if (translated.isBlocked) return "red";
  if (translated.isClosed) return "emerald";
  if (translated.status === "POSATO") return "sky";
  return "amber";
}

export default function EquipmentStoryPage(): JSX.Element {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const equipmentCode = code ? decodeURIComponent(code) : "";
  const [selectedCable, setSelectedCable] = useState<string | null>(null);
  const [confirmedCodes, setConfirmedCodes] = useState<Set<string>>(new Set());
  const [showContext, setShowContext] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["core_engine_snapshot", "equipment_story", equipmentCode],
    queryFn: loadCoreEngineSnapshot,
    enabled: Boolean(equipmentCode),
    staleTime: 30_000,
  });

  const equipment = useMemo(
    () => data?.apparatus.equipments.find((item) => item.equipment_code === equipmentCode) ?? null,
    [data, equipmentCode]
  );

  const visibleCards = useMemo(
    () => buildCableCards(data ?? null, equipmentCode, confirmedCodes),
    [data, equipmentCode, confirmedCodes]
  );

  const incoming = visibleCards.filter((item) => item.direction === "incoming" && !item.confirmedHere);
  const outgoing = visibleCards.filter((item) => item.direction === "outgoing" && !item.confirmedHere);
  const selected = visibleCards.find((item) => item.cableCode === selectedCable) ?? null;

  const activeConfirmed = (equipment?.confirmed_cables ?? 0) + confirmedCodes.size;
  const totalCables = equipment?.total_cables ?? 0;
  const remaining = Math.max(totalCables - activeConfirmed, 0);
  const blocked = equipment?.blocked_cables ?? 0;
  const closureStatus = remaining === 0 && totalCables > 0 ? "CLOSED" : equipment?.closure_status ?? "OPEN";
  const completionRate = totalCables > 0 ? Math.round((activeConfirmed / totalCables) * 100) : 0;
  const riskLevel = equipment?.risk_level ?? "low";

  const handleConfirm = () => {
    if (!selected) return;
    setConfirmedCodes((current) => {
      const next = new Set(current);
      next.add(selected.cableCode);
      return next;
    });
    setSelectedCable(null);
    setFeedback("Verifica registrata");
  };

  if (!equipmentCode) {
    return (
      <Screen>
        <EmptyState title="Codice apparato mancante" description="Apri un apparato da una lista o da una Cable Story." icon="!" />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-500 shadow-sm">
          <svg className="h-4 w-4 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Caricamento apparato…
        </div>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Errore di caricamento apparato.
        </div>
      </Screen>
    );
  }

  if (!equipment) {
    return (
      <Screen>
        <EmptyState
          title="Apparato non trovato"
          description="Questo codice non esiste nel snapshot corrente."
          icon="∅"
        />
      </Screen>
    );
  }

  const summary = equipment;
  const recommendedActions = equipment.recommended_actions ?? [];

  return (
    <Screen className="space-y-6">
      <section className="rounded-[28px] border border-stone-200 bg-[linear-gradient(135deg,#1f232b_0%,#101317_100%)] px-5 py-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/6 text-3xl text-white/80 sm:flex">
              ⛁
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white/45">Apparato</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{equipment.equipment_code}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Pill tone={closureStatus === "CLOSED" ? "emerald" : closureStatus === "BLOCKED" ? "red" : "amber"} className="border-white/10 bg-white/10 text-white">
                  {closureStatus}
                </Pill>
                <span className="text-sm font-medium text-white/85">{activeConfirmed} / {totalCables} cavi confermati</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={riskLevel === "critical" || riskLevel === "high" ? "red" : riskLevel === "medium" ? "amber" : "emerald"} className="border-red-400/30 bg-red-500/10 text-red-100">
              Rischio {riskLevel}
            </Pill>
            <Pill tone={closureStatus === "CLOSED" ? "emerald" : closureStatus === "BLOCKED" ? "red" : "amber"} className="border-white/10 bg-white/10 text-white">
              {closureStatus}
            </Pill>
            <button
              onClick={() => setShowContext((value) => !value)}
              className="inline-flex min-h-11 items-center rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white/85 transition hover:bg-white/15"
            >
              Contesto AI-ready
            </button>
            <button
              onClick={() => navigate("/import")}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-stone-900 transition hover:border-zinc-300"
            >
              <span className="text-lg leading-none">🗄</span>
              Import INCA
            </button>
            <button
              onClick={() => navigate("/import")}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)] transition hover:bg-emerald-600"
            >
              <span className="text-lg leading-none">⇧</span>
              Import lista (PDF/Excel)
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Entranti" value={incoming.length} helper="confermati" tone="sky" />
        <StatCard label="Uscenti" value={outgoing.length} helper="confermati" tone="emerald" />
        <StatCard label="Chiusura" value={closureStatus} helper="stato attuale" tone={closureStatus === "CLOSED" ? "emerald" : closureStatus === "BLOCKED" ? "red" : "amber"} />
        <StatCard label="Restanti" value={remaining} helper="da confermare" tone={remaining > 0 ? "amber" : "neutral"} />
        <StatCard label="Bloccati" value={blocked} helper={`INCA = ${summary.blocked_cables > 0 ? "B" : "—"}`} tone={blocked > 0 ? "red" : "neutral"} />
        <StatCard label="Cavi collegati" value={totalCables} helper="totale cavi" tone="neutral" />
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <Section title="Stati INCA" eyebrow="Stati" className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-medium text-stone-600">
              <span>Avanzamento INCA</span>
              <span className="font-semibold text-stone-950">{activeConfirmed} / {totalCables}</span>
            </div>
            <ProgressBar value={activeConfirmed} max={Math.max(totalCables, 1)} tone={closureStatus === "CLOSED" ? "emerald" : "blue"} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Line label="Posati INCA" value={summary.status_distribution["P"] ?? 0} />
              <Line label="Tasso indicativo" value={`${completionRate}%`} />
            </div>
            <p className="text-xs text-stone-500">
              Ultimo aggiornamento: {data.today.latest_import?.list_date ?? "data sconosciuta"}
            </p>
          </div>
        </Section>

        <Section title="Chiusura apparato" eyebrow="Closure Engine" className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="space-y-2 text-sm">
            <Line label="Stato" value={closureStatus} accent={closureStatus === "CLOSED" ? "emerald" : closureStatus === "BLOCKED" ? "red" : "amber"} />
            <Line label="Confermati terreno" value={activeConfirmed} />
            <Line label="Restanti" value={remaining} accent={remaining > 0 ? "amber" : "emerald"} />
            <Line label="Posati INCA" value={summary.status_distribution["P"] ?? 0} />
            <Line label="Tasso indicativo" value={`${completionRate}%`} />
          </div>
        </Section>
      </section>

      <section className="space-y-3 rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Verifica campo</p>
            <h2 className="text-base font-semibold text-stone-950">Cavi da verificare ({visibleCards.filter((item) => !item.confirmedHere).length})</h2>
            <p className="mt-1 text-sm text-stone-500">Clicca su un cavo per confermare la verifica sul campo.</p>
          </div>
          <button className="min-h-10 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:border-stone-300">
            Conferma tutti ({visibleCards.filter((item) => !item.confirmedHere).length})
          </button>
        </div>

        <div className="space-y-2">
          {visibleCards.filter((item) => !item.confirmedHere).length === 0 ? (
            <EmptyState
              title="Nessun cavo da verificare"
              description="Tutti i cavi visibili sono già stati confermati in questa sessione."
              icon="✓"
            />
          ) : (
            visibleCards
              .filter((item) => !item.confirmedHere)
              .map((item) => (
                <button
                  key={item.cableCode}
                  onClick={() => setSelectedCable(item.cableCode)}
                  className="w-full rounded-[22px] border border-stone-200 bg-stone-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-white"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-stone-950">{item.displayCableCode}</span>
                        <Pill tone={statusTone(item.incaStatus)}>{item.incaStatus ?? "—"}</Pill>
                        <Pill tone={item.terrainStatus === "Bloccante" ? "red" : item.terrainStatus === "Non verificato" ? "amber" : "sky"}>
                          {item.terrainStatus}
                        </Pill>
                      </div>
                      <p className="mt-2 text-xs text-stone-500">
                        Da {item.appPartenza ?? "—"} · A {item.appArrivo ?? "—"} · {item.system ?? "sistema non assegnato"}
                      </p>
                      {item.note ? <p className="mt-2 text-xs leading-5 text-stone-600">{item.note}</p> : null}
                    </div>
                    <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700">
                      Verifica sul campo
                    </span>
                  </div>
                </button>
              ))
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
          <Pill tone="red">B = Bloccato INCA</Pill>
          <Pill tone="amber">Non verificato = Da verificare sul campo</Pill>
          <Pill tone="emerald">Verificato = Confermato sul campo</Pill>
          {feedback ? <span className="ml-auto text-emerald-700">{feedback}</span> : null}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <MiniCableSection
          title="Cavi entranti"
          cables={incoming}
          emptyTitle="Nessun cavo entrante"
          emptyDescription="Nessun cavo collegato in questa direzione."
          onPick={setSelectedCable}
        />
        <MiniCableSection
          title="Cavi uscenti"
          cables={outgoing}
          emptyTitle="Nessun cavo uscente"
          emptyDescription="Nessun cavo collegato in questa direzione."
          onPick={setSelectedCable}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Section title="Problemi aperti" eyebrow="Rischi" count={recommendedActions.length} className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          {recommendedActions.length === 0 ? (
            <p className="text-sm text-stone-500">Nessun problema aperto rilevato.</p>
          ) : (
            <div className="space-y-2">
              {recommendedActions.slice(0, 12).map((action) => (
                <div key={action} className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                  {action}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Azioni raccomandate" eyebrow="Campo" count={recommendedActions.length} className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          {recommendedActions.length === 0 ? (
            <p className="text-sm text-stone-500">Nessuna azione raccomandata.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recommendedActions.map((action) => (
                <li key={action} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-800">
                  {action}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </section>

      {showContext && summary ? (
        <Section title="Contesto AI-ready" eyebrow="Debug" className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <pre className="max-h-96 overflow-auto rounded-2xl border border-stone-200 bg-stone-950 p-4 text-[11px] text-stone-300">
            {JSON.stringify(summary, null, 2)}
          </pre>
        </Section>
      ) : null}

      {selected ? (
        <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white shadow-[0_-12px_30px_rgba(15,23,42,0.12)] lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[390px] lg:border-l lg:border-t-0 lg:shadow-[-12px_0_30px_rgba(15,23,42,0.12)]">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-stone-950">Verifica cavo sul campo</p>
                <p className="mt-1 text-xs text-stone-500">Conferma la situazione senza uscire dal contesto apparato.</p>
              </div>
              <button
                onClick={() => setSelectedCable(null)}
                className="rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-500 transition hover:text-stone-900"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Cavo</p>
                <p className="mt-1 font-mono text-xl font-semibold text-stone-950">{selected.displayCableCode}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                <Detail label="Da" value={selected.appPartenza ?? "—"} />
                <Detail label="A" value={selected.appArrivo ?? "—"} />
                <Detail label="Stato INCA" value={selected.incaStatus ?? "—"} />
                <Detail label="Stato terreno" value={selected.terrainStatus} />
              </div>

              <div>
                <p className="text-sm font-medium text-stone-900">Nota (facoltativa)</p>
                <textarea
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm outline-none placeholder:text-stone-400 focus:border-emerald-300"
                  placeholder="Es. Foto scattata, cavo identificato, operatore..."
                />
              </div>
            </div>

            <div className="border-t border-stone-200 px-5 py-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedCable(null)}
                  className="min-h-11 flex-1 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:border-stone-300"
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirm}
                  className="min-h-11 flex-1 rounded-2xl border border-emerald-600 bg-emerald-600 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)] transition hover:bg-emerald-700"
                >
                  Conferma verifica
                </button>
              </div>
            </div>
          </div>
        </aside>
      ) : null}
    </Screen>
  );
}

function MiniCableSection({
  title,
  cables,
  emptyTitle,
  emptyDescription,
  onPick,
}: {
  title: string;
  cables: CableCard[];
  emptyTitle: string;
  emptyDescription: string;
  onPick: (code: string) => void;
}): JSX.Element {
  return (
    <Section title={title} eyebrow="Apparato" count={cables.length} className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
      {cables.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} icon="∅" />
      ) : (
        <div className="space-y-2">
          {cables.slice(0, 6).map((cable) => (
            <button
              key={cable.cableCode}
              onClick={() => onPick(cable.cableCode)}
              className="w-full rounded-[22px] border border-stone-200 bg-stone-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-stone-950">{cable.displayCableCode}</p>
                  <p className="mt-1 text-xs text-stone-500">{cable.system ?? "Sistema non assegnato"}</p>
                </div>
                <Pill tone={cable.confirmedHere ? "emerald" : "amber"}>
                  {cable.confirmedHere ? "Verificato" : "Da verificare"}
                </Pill>
              </div>
              <p className="mt-2 text-xs text-stone-500">
                {cable.direction === "incoming" ? "Entrante" : "Uscente"} · INCA {cable.incaStatus ?? "—"}
              </p>
            </button>
          ))}
        </div>
      )}
    </Section>
  );
}

function Detail({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function Line({ label, value, accent = "neutral" }: { label: string; value: number | string; accent?: "neutral" | "emerald" | "amber" | "red" }): JSX.Element {
  const tone =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "amber"
        ? "text-amber-700"
        : accent === "red"
          ? "text-rose-700"
          : "text-stone-950";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2">
      <span className="text-stone-500">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}
