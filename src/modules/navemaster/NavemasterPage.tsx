import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppBar, Btn, EmptyState, Pill, Screen, Section, StatCard } from "../../components/command-ui";
import { formatCableDisplay } from "../../core/cable/cableDisplay";
import { computeNavemasterRun, loadNavemasterView, loadPerimetroBoard, loadPerimetroCavi, setNavemasterAlertStatus } from "./navemaster.api";
import type { NavemasterAlert, NavemasterAlertType, PerimetroBoardRow } from "./navemaster.types";
import { buildMorningSentence, isOverdue } from "./perimetroBoard.logic";
import { statoFromCavo } from "../../domain/statoConsegna";
import { StatoPill } from "../../components/stato/StatoPill";
import { FunnelBars } from "../../components/stato/FunnelBars";

function giorniLabel(g: number | null): string {
  if (g == null) return "—";
  if (g < 0) return `in ritardo ${Math.abs(g)} g`;
  if (g === 0) return "consegna oggi";
  return `tra ${g} g`;
}

function formatConsegna(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" });
}

function formatShortDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function fmtMetric(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("it-IT", { maximumFractionDigits: Number.isInteger(n) ? 0 : 1 });
}

function actionCount(row: PerimetroBoardRow): number {
  const buckets = row.da_posare + row.da_sistemare + row.pronto_coll + row.coll_parziale;
  return buckets > 0 ? buckets : row.da_completare;
}

function PerimetroCaviList({ shipId, perimetro }: { shipId: string; perimetro: string }): JSX.Element {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["navemaster_perimetro_cavi", shipId, perimetro],
    queryFn: () => loadPerimetroCavi(shipId, perimetro),
    staleTime: 30_000,
  });

  if (isLoading) return <div className="px-1 py-2 text-xs text-stone-500">Carico cavi…</div>;
  if (isError) return <div className="px-1 py-2 text-xs text-red-600">Errore nel caricamento dei cavi.</div>;
  const cavi = data ?? [];
  if (cavi.length === 0) return <div className="px-1 py-2 text-xs text-emerald-700">Nessun cavo da completare.</div>;

  return (
    <div className="mt-3 space-y-1 border-t border-stone-100 pt-3">
      {cavi.map((c) => {
        const stato = statoFromCavo(c);
        return (
          <button
            key={c.codice}
            onClick={() => navigate(`/cable/${encodeURIComponent(c.codice)}`)}
            className="w-full rounded-2xl border border-stone-200 bg-stone-50/70 px-3 py-3 text-left transition hover:bg-stone-50"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-stone-950">{formatCableDisplay(c.codice)}</span>
              <StatoPill stato={stato} />
              <span className="text-xs font-medium text-stone-600">{c.manca}</span>
              <span className="ml-auto text-xs text-emerald-700">Verifica →</span>
            </div>
            <div className="mt-2 grid gap-2 text-xs text-stone-600 sm:grid-cols-2">
              <div className="rounded-xl bg-white px-2 py-2">
                <div className="font-medium text-stone-500">Partenza → Arrivo</div>
                <div className="mt-1 text-stone-900">{c.apparato_da ?? "—"} → {c.apparato_a ?? "—"}</div>
                <div className="mt-1 text-stone-500">{c.descrizione_da ?? "—"} → {c.descrizione_a ?? "—"}</div>
              </div>
              <div className="rounded-xl bg-white px-2 py-2">
                <div className="font-medium text-stone-500">Collegamenti</div>
                <div className="mt-1 text-stone-900">{fmtMetric(c.numero_pin)} pin · {fmtMetric(c.tot_collegamenti)} previsti</div>
                <div className="mt-1 text-stone-500">fattibile {c.coll_fattibile ?? "—"} · partenza {c.coll_partenza ? "OK" : "—"} · arrivo {c.coll_arrivo ? "OK" : "—"}</div>
              </div>
              <div className="rounded-xl bg-white px-2 py-2">
                <div className="font-medium text-stone-500">Date</div>
                <div className="mt-1 text-stone-500">
                  posa {formatShortDate(c.inca_data_posa)} · sist P {formatShortDate(c.data_sist_partenza)} · sist A {formatShortDate(c.data_sist_arrivo)} · coll {formatShortDate(c.inca_data_collegamento)}
                </div>
              </div>
              <div className="rounded-xl bg-white px-2 py-2">
                <div className="font-medium text-stone-500">Stato sistemazione</div>
                <div className="mt-1 text-stone-500">partenza {c.sist_partenza ?? "—"} · arrivo {c.sist_arrivo ?? "—"} · collegato {c.collegato ?? "—"}</div>
              </div>
            </div>
            {c.note_sistemazione || c.problematiche_posa || c.problematiche_coll || c.op_lista_sist ? (
              <div className="mt-2 space-y-1 text-xs text-stone-600">
                {c.note_sistemazione ? <div><span className="font-medium text-stone-700">Note:</span> {c.note_sistemazione}</div> : null}
                {c.problematiche_posa ? <div><span className="font-medium text-stone-700">Posa:</span> {c.problematiche_posa}</div> : null}
                {c.problematiche_coll ? <div><span className="font-medium text-stone-700">Collegamenti:</span> {c.problematiche_coll}</div> : null}
                {c.op_lista_sist ? <div><span className="font-medium text-stone-700">OP lista:</span> {c.op_lista_sist}</div> : null}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function PerimetroBoardRowCard({ row, shipId }: { row: PerimetroBoardRow; shipId: string | null }): JSX.Element {
  const [open, setOpen] = useState(false);
  const overdue = isOverdue(row);
  const remainingActions = actionCount(row);
  const done = remainingActions === 0;
  const canExpand = row.da_completare > 0 && shipId != null;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-stone-950">{row.perimetro}</span>
        <Pill tone={done ? "emerald" : overdue ? "red" : "neutral"}>{giorniLabel(row.giorni_al_target)}</Pill>
        <span className="text-xs text-stone-500">consegna {formatConsegna(row.data_consegna)}</span>
        {row.bloccati > 0 ? <Pill tone="amber">{row.bloccati} bloccati</Pill> : null}
        {canExpand ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-auto min-h-8 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:border-stone-300"
          >
            {open ? "Nascondi cavi" : `${row.da_completare} cavi rimasti`}
          </button>
        ) : (
          <span className="ml-auto text-xs font-medium text-stone-600">{done ? "completo" : `${remainingActions} azioni rimaste`}</span>
        )}
      </div>
      <FunnelBars
        className="mt-3"
        posa={{ label: "Posa", value: row.pct_posa ?? 0, detail: `${row.posati}/${row.tot_cavi}`, colorVar: "--stato-posa" }}
        sistemato={{ label: "Sistemato", value: row.pct_sist ?? 0, detail: `${row.sistemati}/${row.tot_cavi}`, colorVar: "--stato-sistemato" }}
        collegato={{ label: "Collegamenti", value: row.pct_coll_pin ?? 0, detail: `${fmtMetric(row.coll_fatti)}/${fmtMetric(row.coll_previsti)}`, colorVar: "--stato-collegato" }}
      />
      {open && shipId ? <PerimetroCaviList shipId={shipId} perimetro={row.perimetro} /> : null}
    </div>
  );
}

const TYPE_LABEL: Record<NavemasterAlertType, string> = {
  BLOCKED_IMPACT: "Bloccati attivi",
  STATUS_CONFLICT: "Conflitti di stato",
  METRI_MISMATCH: "Metri incoerenti",
  MISSING_IN_CORE: "Manca prova campo",
  EXTRA_IN_CORE: "Prova senza baseline",
  DUPLICATE_IN_INCA: "Duplicati INCA",
};

const TYPE_ORDER: NavemasterAlertType[] = [
  "BLOCKED_IMPACT",
  "STATUS_CONFLICT",
  "METRI_MISMATCH",
  "MISSING_IN_CORE",
  "EXTRA_IN_CORE",
  "DUPLICATE_IN_INCA",
];

function verdictTone(verdict: string | null): "emerald" | "amber" | "red" | "neutral" {
  if (verdict === "OK") return "emerald";
  if (verdict === "WARN") return "amber";
  if (verdict === "BLOCK") return "red";
  return "neutral";
}

function reasonOf(alert: NavemasterAlert): string {
  const r = alert.evidence?.["reason"];
  return typeof r === "string" ? r.replace(/_/g, " ") : "—";
}

export default function NavemasterPage(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["navemaster_view"],
    queryFn: loadNavemasterView,
    staleTime: 30_000,
  });

  const { data: board } = useQuery({
    queryKey: ["navemaster_perimetro_board"],
    queryFn: loadPerimetroBoard,
    staleTime: 30_000,
  });
  const boardRows = board?.rows ?? [];
  const morningSentence = useMemo(() => buildMorningSentence(boardRows), [boardRows]);

  const run = data?.run ?? null;
  const shipId = data?.shipId ?? null;
  const openAlerts = useMemo(
    () => (data?.alerts ?? []).filter((a) => a.status !== "RESOLVED"),
    [data]
  );

  const grouped = useMemo(() => {
    const map = new Map<NavemasterAlertType, NavemasterAlert[]>();
    for (const a of openAlerts) {
      const list = map.get(a.type) ?? [];
      list.push(a);
      map.set(a.type, list);
    }
    return map;
  }, [openAlerts]);

  const both = run?.drivers?.coverage?.both ?? 0;
  const incaOnly = run?.drivers?.coverage?.inca_only ?? 0;
  const critici = run?.drivers?.alerts?.critical ?? 0;

  async function recompute(): Promise<void> {
    if (!shipId) {
      setFeedback("Nessuna nave attiva");
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      await computeNavemasterRun(shipId);
      await queryClient.invalidateQueries({ queryKey: ["navemaster_view"] });
      await queryClient.invalidateQueries({ queryKey: ["navemaster_perimetro_board"] });
      setFeedback("Run ricalcolato");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Errore nel calcolo");
    } finally {
      setBusy(false);
    }
  }

  async function triage(alert: NavemasterAlert, status: "ACK" | "RESOLVED"): Promise<void> {
    try {
      await setNavemasterAlertStatus(alert.id, status);
      await queryClient.invalidateQueries({ queryKey: ["navemaster_view"] });
      await queryClient.invalidateQueries({ queryKey: ["navemaster_perimetro_board"] });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Errore nel triage");
    }
  }

  return (
    <Screen className="max-w-5xl space-y-6">
      <AppBar
        title="Navemaster"
        subtitle="INCA ↔ campo: dove non sono d'accordo, su tutta la nave."
        action={
          <Btn onClick={() => void recompute()} disabled={busy || !shipId}>
            {busy ? "Calcolo…" : "Calcola"}
          </Btn>
        }
      />

      {boardRows.length > 0 ? (
        <Section title="Consegna perimetri" eyebrow="Dove appoggiare oggi" count={boardRows.length}>
          <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
            {morningSentence}
          </div>
          <div className="space-y-2">
            {boardRows.map((row) => (
              <PerimetroBoardRowCard key={row.perimetro} row={row} shipId={board?.shipId ?? null} />
            ))}
          </div>
        </Section>
      ) : null}

      {!isLoading && !run ? (
        <EmptyState
          title="Nessun run disponibile"
          description="Premi «Calcola» per riconciliare il baseline INCA attivo con le prove campo."
          icon="⚙"
        />
      ) : null}

      {run ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
            <Pill tone={verdictTone(run.verdict)}>{run.verdict ?? "—"}</Pill>
            <span>Ultimo run: {new Date(run.created_at).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            {feedback ? <span className="ml-auto font-medium text-emerald-700">{feedback}</span> : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Alert aperte" value={openAlerts.length} tone={openAlerts.length > 0 ? "amber" : "emerald"} />
            <StatCard label="Critici" value={critici} tone={critici > 0 ? "red" : "neutral"} />
            <StatCard label="Riconciliati" value={both} helper="INCA + campo" tone="emerald" />
            <StatCard label="Solo INCA" value={incaOnly} helper="senza prova" tone={incaOnly > 0 ? "amber" : "neutral"} />
          </div>

          {openAlerts.length === 0 ? (
            <EmptyState title="Nessuna alert aperta" description="INCA e campo sono allineati per questo run." icon="✓" tone="emerald" />
          ) : (
            TYPE_ORDER.filter((type) => grouped.has(type)).map((type) => {
              const alerts = grouped.get(type) ?? [];
              return (
                <Section key={type} title={TYPE_LABEL[type]} eyebrow="Alert" count={alerts.length}>
                  <div className="space-y-2">
                    {alerts.slice(0, 100).map((alert) => (
                      <div key={alert.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-semibold text-stone-950">
                                {alert.codice ? formatCableDisplay(alert.codice) : alert.codice_norm ?? "—"}
                              </span>
                              <Pill tone={alert.severity === "CRITICAL" ? "red" : "amber"}>{reasonOf(alert)}</Pill>
                              {alert.status === "ACK" ? <Pill tone="sky">Visto</Pill> : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            {alert.codice ? (
                              <button
                                onClick={() => navigate(`/cable/${encodeURIComponent(alert.codice as string)}`)}
                                className="min-h-9 rounded-xl border border-emerald-600 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                Verifica cavo
                              </button>
                            ) : null}
                            {alert.status !== "ACK" ? (
                              <button
                                onClick={() => void triage(alert, "ACK")}
                                className="min-h-9 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:border-stone-300"
                              >
                                Visto
                              </button>
                            ) : null}
                            <button
                              onClick={() => void triage(alert, "RESOLVED")}
                              className="min-h-9 rounded-xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:border-stone-300"
                            >
                              Risolvi
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              );
            })
          )}
        </>
      ) : null}
    </Screen>
  );
}
