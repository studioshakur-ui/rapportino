import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppBar, Btn, EmptyState, Pill, Screen, Section, StatCard } from "../../../components/command-ui";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { loadCoreEngineSnapshot } from "../../../domain/core-engine";

function formatDate(value: string | null): string {
  if (!value) return "data sconosciuta";
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function closureLabel(status: string): string {
  if (status === "CLOSED") return "CHIUSO";
  if (status === "PARTIAL") return "PARZIALE";
  if (status === "BLOCKED") return "BLOCCATO";
  return "APERTO";
}

function isFieldVerificationBlocker(value: string | null | undefined): boolean {
  const text = String(value ?? "").toLowerCase();
  return text.includes("prova") || text.includes("evidenza") || text.includes("verific");
}

const CLOSURES_PAGE_SIZE = 8;
const TELEGRAM_PAGE_SIZE = 8;

export default function OggiPage(): JSX.Element {
  const navigate = useNavigate();
  const [showAllClosures, setShowAllClosures] = useState(false);
  const [showAllTelegram, setShowAllTelegram] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["core_engine_snapshot"],
    queryFn: loadCoreEngineSnapshot,
    staleTime: 30_000,
  });

  const today = data?.today ?? null;
  const summary = today?.summary ?? null;

  return (
    <Screen className="max-w-6xl space-y-6">
      <AppBar
        title="Oggi"
        subtitle="Cosa devo chiudere oggi, cosa blocca la chiusura e quali impatti Telegram hanno cambiato lo stato."
        action={today?.latest_import ? <Pill tone="emerald">{today.latest_import.file_name}</Pill> : null}
      />

      {!isLoading && !today ? (
        <EmptyState
          title="Nessun dato disponibile"
          description="Importa una lista e sincronizza i segnali Telegram per popolare il motore di chiusura."
          icon="📋"
        />
      ) : null}

      {today ? (
        <>
          <section className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Azione adesso</p>
                <h2 className="text-lg font-semibold text-stone-950">Preparare il giro di oggi</h2>
                <p className="mt-1 text-sm text-stone-600">
                  Lista {today.latest_import?.file_name ?? "non disponibile"} · {today.metrics.remaining_cables} cavi da chiudere.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Btn onClick={() => window.print()} variant="secondary" className="w-full sm:w-auto">
                  Stampa lista
                </Btn>
                <Btn onClick={() => navigate("/campo")} className="w-full sm:w-auto">
                  Apri giro campo
                </Btn>
              </div>
            </div>
          </section>

          <div className="grid gap-2 overflow-x-auto pb-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Cavi totali" value={today.metrics.total_cables} tone="neutral" />
            <StatCard label="Rimanenti" value={today.metrics.remaining_cables} tone={today.metrics.remaining_cables > 0 ? "amber" : "emerald"} />
            <StatCard label="Sistemi aperti" value={today.metrics.open_systems} tone={today.metrics.open_systems > 0 ? "amber" : "emerald"} />
            <StatCard label="Apparati bloccati" value={today.metrics.blocked_equipments} tone={today.metrics.blocked_equipments > 0 ? "red" : "neutral"} />
          </div>

          <section className="grid gap-4 lg:grid-cols-2">
            <Section title="Da verificare oggi" eyebrow="Oggi" count={today.critical_closures.length}>
              {today.critical_closures.length === 0 ? (
                <EmptyState
                  title="Nessuna verifica urgente"
                  description="La lista non contiene apparati o sistemi da controllare subito."
                  icon="✓"
                  tone="emerald"
                />
              ) : (
                <>
                  <div className="space-y-3">
                    {(showAllClosures ? today.critical_closures : today.critical_closures.slice(0, CLOSURES_PAGE_SIZE)).map((item) => (
                      <button
                        key={item.key}
                        onClick={() => navigate(item.route)}
                        className="w-full rounded-[24px] border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                              {item.kind === "system" ? "Sistema" : "Apparato"}
                            </p>
                            <p className="mt-1 text-base font-semibold text-stone-950">{item.name}</p>
                            <p className="mt-1 text-sm text-stone-600">{item.summary}</p>
                            {item.blocker ? (
                              <p className={`mt-2 text-xs ${isFieldVerificationBlocker(item.blocker) ? "text-amber-700" : "text-red-700"}`}>
                                {isFieldVerificationBlocker(item.blocker) ? "Da verificare sul campo" : "Blocco reale"}: {item.blocker}
                              </p>
                            ) : null}
                          </div>
                          <Pill tone={item.status === "BLOCKED" ? "red" : item.status === "PARTIAL" ? "amber" : "neutral"}>
                            {closureLabel(item.status)}
                          </Pill>
                        </div>
                      </button>
                    ))}
                  </div>
                  {!showAllClosures && today.critical_closures.length > CLOSURES_PAGE_SIZE && (
                    <button
                      onClick={() => setShowAllClosures(true)}
                      className="mt-2 w-full rounded-2xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-950"
                    >
                      Mostra tutti ({today.critical_closures.length})
                    </button>
                  )}
                </>
              )}
            </Section>

            <Section title="Ultimi impatti Telegram" eyebrow="Campo" count={today.telegram_impacts.length}>
              {today.telegram_impacts.length === 0 ? (
                <EmptyState
                  title="Nessun impatto Telegram"
                  description="Nessun messaggio recente ha modificato la chiusura."
                  icon="📡"
                />
              ) : (
                <>
                  <div className="space-y-3">
                    {(showAllTelegram ? today.telegram_impacts : today.telegram_impacts.slice(0, TELEGRAM_PAGE_SIZE)).map((impact) => (
                      <article key={impact.message_id} className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-stone-950">{formatDate(impact.message_ts)}</p>
                            <p className="mt-1 text-xs text-stone-500">{impact.before_label} → {impact.after_label}</p>
                          </div>
                          <Pill tone={impact.system_closed ? "emerald" : "amber"}>{impact.system_closed ? "Sistema chiuso" : "Impatto"}</Pill>
                        </div>
                        <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-stone-700">
                          {impact.text || "Messaggio senza testo"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {impact.cable_codes.map((code) => (
                            <button
                              key={code}
                              onClick={() => navigate(`/cable/${encodeURIComponent(code)}`)}
                              className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-mono font-semibold text-stone-700 transition hover:border-amber-300"
                            >
                              {formatCableDisplay(code)}
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                  {!showAllTelegram && today.telegram_impacts.length > TELEGRAM_PAGE_SIZE && (
                    <button
                      onClick={() => setShowAllTelegram(true)}
                      className="mt-2 w-full rounded-2xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-950"
                    >
                      Mostra tutti ({today.telegram_impacts.length})
                    </button>
                  )}
                </>
              )}
            </Section>
          </section>

          {summary ? (
            <Section title="Riepilogo lista" eyebrow="Lista attiva">
              <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <StatCard label="Confermati" value={summary.confirmed + summary.likely_laid} tone="emerald" />
                  <StatCard label="Da verificare" value={summary.to_verify} tone="amber" />
                  <StatCard label="Prove mancanti" value={summary.no_evidence} tone="amber" />
                  <StatCard label="Bloccati" value={summary.blocked} tone="red" />
                  <StatCard label="Fuori INCA" value={summary.outside_inca} tone="violet" />
                  <StatCard label="Import" value={today.latest_import?.rows_count ?? 0} tone="neutral" />
                </div>
              </div>
            </Section>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
