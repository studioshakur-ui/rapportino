import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppBar, Btn, EmptyState, Pill, Screen, Section, StatCard } from "../../components/command-ui";
import { formatCableDisplay } from "../../core/cable/cableDisplay";
import { computeNavemasterRun, loadNavemasterView, setNavemasterAlertStatus } from "./navemaster.api";
import type { NavemasterAlert, NavemasterAlertType } from "./navemaster.types";

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
            <EmptyState title="Nessuna alert aperta" description="INCA e campo sono allineati per questo run." icon="✓" />
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
