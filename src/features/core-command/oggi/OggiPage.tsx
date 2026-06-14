import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppBar, Btn, EmptyState, Pill, Screen, Section, StatCard } from "../../../components/command-ui";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { loadCoreEngineSnapshot } from "../../../domain/core-engine";
import { loadPerimetroBoard } from "../../../modules/navemaster/navemaster.api";
import { buildMorningSentence } from "../../../modules/navemaster/perimetroBoard.logic";
import { SituazioneShare } from "../situazione/SituazioneShare";

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
  const [shareOpen, setShareOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["core_engine_snapshot"],
    queryFn: loadCoreEngineSnapshot,
    staleTime: 30_000,
  });

  const { data: perimetroBoard, isError: perimetroBoardError } = useQuery({
    queryKey: ["navemaster_perimetro_board"],
    queryFn: loadPerimetroBoard,
    staleTime: 30_000,
  });

  const today = data?.today ?? null;
  const summary = today?.summary ?? null;
  const morningSentence = perimetroBoardError
    ? "Consegna non disponibile. Apri il board per riprovare."
    : perimetroBoard
      ? buildMorningSentence(perimetroBoard.rows)
      : "Caricamento consegna in corso...";

  return (
    <Screen className="max-w-6xl space-y-6">
      <AppBar
        title="Oggi"
        subtitle="Cosa devo chiudere oggi, cosa blocca la chiusura e quali impatti Telegram hanno cambiato lo stato."
        action={today?.latest_import ? <Pill tone="emerald">{today.latest_import.file_name}</Pill> : null}
      />

      <section className="theme-banner-success rounded-[24px] px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">Dove appoggiare oggi</p>
          <p className="mt-2 text-sm font-medium leading-6">{morningSentence}</p>
        </div>
        <Btn onClick={() => navigate("/navemaster")} variant="secondary" className="mt-3 shrink-0 sm:mt-0">
          Apri Consegna →
        </Btn>
      </section>

      {!isLoading && !today ? (
        <EmptyState
          title="Nessun dato disponibile"
          description="Importa una lista e sincronizza i segnali Telegram per popolare il motore di chiusura."
          icon="📋"
        />
      ) : null}

      {today ? (
        <>
          <section className="theme-card-surface rounded-[28px] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] theme-token-faint">Azione adesso</p>
                <h2 className="text-lg font-semibold theme-token-text">Preparare il giro di oggi</h2>
                <p className="mt-1 text-sm theme-token-muted">
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
                <Btn onClick={() => setShareOpen(true)} variant="secondary" className="w-full sm:w-auto">
                  Condividi 16:30
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
                        className="theme-card-surface theme-card-hover w-full rounded-[24px] p-4 text-left transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] theme-token-faint">
                              {item.kind === "system" ? "Sistema" : "Apparato"}
                            </p>
                            <p className="mt-1 text-base font-semibold theme-token-text">{item.name}</p>
                            <p className="mt-1 text-sm theme-token-muted">{item.summary}</p>
                            {item.blocker ? (
                              <p
                                className="mt-2 text-xs"
                                style={{ color: isFieldVerificationBlocker(item.blocker) ? "var(--stato-sistemato)" : "var(--stato-bloccato)" }}
                              >
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
                      className="theme-btn theme-btn-secondary mt-2 w-full rounded-2xl py-3 text-sm font-medium transition"
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
                      <article key={impact.message_id} className="theme-card-surface rounded-[24px] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold theme-token-text">{formatDate(impact.message_ts)}</p>
                            <p className="mt-1 text-xs theme-token-faint">{impact.before_label} → {impact.after_label}</p>
                          </div>
                          <Pill tone={impact.system_closed ? "emerald" : "amber"}>{impact.system_closed ? "Sistema chiuso" : "Impatto"}</Pill>
                        </div>
                        <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 theme-token-muted">
                          {impact.text || "Messaggio senza testo"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {impact.cable_codes.map((code) => (
                            <button
                              key={code}
                              onClick={() => navigate(`/cable/${encodeURIComponent(code)}`)}
                              className="theme-card-surface-2 theme-card-hover rounded-xl px-2.5 py-1 text-xs font-mono font-semibold theme-token-text transition"
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
                      className="theme-btn theme-btn-secondary mt-2 w-full rounded-2xl py-3 text-sm font-medium transition"
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
              <div className="theme-card-surface rounded-[28px] p-5">
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

      {shareOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end lg:items-stretch lg:justify-end"
          role="presentation"
          style={{ background: "color-mix(in srgb, var(--bg) 72%, transparent)" }}
          onClick={() => setShareOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="situazione-share-title"
            className="theme-token-surface w-full max-h-[90vh] overflow-y-auto rounded-t-[28px] border-t theme-token-border p-5 shadow-2xl lg:h-full lg:max-h-none lg:max-w-xl lg:rounded-none lg:border-l lg:border-t-0 lg:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="theme-appbar-kicker text-[11px] font-semibold uppercase tracking-[0.2em]">Condividi</p>
                <h2 id="situazione-share-title" className="mt-1 text-xl font-semibold theme-token-text">Messaggio 16:30</h2>
                <p className="mt-1 text-sm theme-token-muted">Testo pronto per il punto operativo di fine giornata.</p>
              </div>
              <Btn onClick={() => setShareOpen(false)} variant="ghost">Chiudi</Btn>
            </div>
            <SituazioneShare situation={data?.situation ?? null} />
            <Btn onClick={() => navigate("/situazione")} variant="ghost" className="mt-3 w-full">
              Apri vista completa
            </Btn>
          </aside>
        </div>
      ) : null}
    </Screen>
  );
}
