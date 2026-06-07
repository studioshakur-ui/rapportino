// src/features/core-command/command-center/CommandCenterPage.tsx — CENTRO COMANDO
// UI consuma solo output dominio già normalizzati.
// Nessun calcolo métier qui. Nessun testo in francese.

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listRecentImports, loadItemsWithEvidence } from "../../../modules/daily-lists/dailyLists.repo";
import { buildListSummary } from "../../../modules/daily-lists/dailyLists.logic";
import { Pill, Screen, StatCard, EmptyState, Section, AppBar } from "../../../components/command-ui";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { listRecentTelegramMessages } from "../api/telegramMessages.api";
import { buildSistemiChiusura, sistemiNonChiusi, chiusureRecenti } from "../../../domain/sistema";
import { buildApparecchiaturaVMs } from "../../../domain/apparecchiatura";
import { buildPercorsoCritico } from "../../../domain/percorso-critico";
import { buildImpattiTelegram } from "../../../domain/telegram-impact";
import { loadEquipmentIntelligenceDashboard } from "../../../modules/equipment/equipmentIntelligence.repo";
import type { DailyListItemVM } from "../../../modules/daily-lists/dailyLists.types";
import type { SistemaChiusura } from "../../../domain/sistema";
import type { ApparecchiaturaVM } from "../../../domain/apparecchiatura";
import type { CavoPercorsoCritico } from "../../../domain/percorso-critico";
import type { ImpattoTelegram } from "../../../domain/telegram-impact";
import { STATO_CHIUSURA } from "../../../domain/dizionario";
import { ensureArray } from "../../../core/utils/array";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatData(value: string | null): string {
  if (!value) return "data sconosciuta";
  return new Date(value).toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}


function statoPill(status: string): "emerald" | "sky" | "amber" | "red" | "neutral" {
  if (status === "confirmed_field") return "emerald";
  if (status === "likely_laid") return "sky";
  if (status === "to_verify" || status === "no_evidence") return "amber";
  if (status === "blocked" || status === "missing") return "red";
  return "neutral";
}

function statoChiusuraTone(stato: string): "emerald" | "sky" | "amber" | "red" | "neutral" {
  if (stato === STATO_CHIUSURA.CHIUSO) return "emerald";
  if (stato === STATO_CHIUSURA.IN_CORSO) return "sky";
  if (stato === STATO_CHIUSURA.NON_CHIUSO) return "amber";
  if (stato === STATO_CHIUSURA.BLOCCATO) return "red";
  return "neutral";
}

function rischioTone(raw: string): "emerald" | "sky" | "amber" | "red" | "neutral" {
  if (raw === "low") return "emerald";
  if (raw === "medium") return "sky";
  if (raw === "high") return "amber";
  if (raw === "critical") return "red";
  return "neutral";
}

// ── Page ─────────────────────────────────────────────────────────────────────

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

  const { data: equipmentDashboard } = useQuery({
    queryKey: ["equipment_intelligence_dashboard"],
    queryFn: loadEquipmentIntelligenceDashboard,
    staleTime: 30_000,
  });

  // ── Domain layer — tutto il calcolo métier qui, fuori dai componenti ──────
  const summary = latest && items
    ? buildListSummary(latest.id, latest.list_date, latest.file_name, items)
    : null;

  const equipments = ensureArray(equipmentDashboard?.equipments, "commandCenter.equipments");

  const sistemi         = items ? buildSistemiChiusura(items, equipments) : [];
  const nonChiusi       = sistemiNonChiusi(sistemi);
  const recentiChiusi   = chiusureRecenti(sistemi);

  const apparecchiature = buildApparecchiaturaVMs(
    equipments.filter((e) => e.risk_level === "critical" || e.risk_level === "high")
  );

  const percorsoCritico = items ? buildPercorsoCritico(items, equipments) : [];

  const impattiTelegram = items && telegramMessages
    ? buildImpattiTelegram(telegramMessages, items)
    : (telegramMessages ?? []).map((msg) => ({
        messaggio_id: msg.id,
        mittente: msg.sender_name ?? "Telegram",
        testo: msg.text ?? "",
        data: msg.message_ts ?? msg.created_at,
        cavi_impattati: [],
        ha_cavi_bloccanti: false,
        ha_riferimenti_cavi: ensureArray(msg.cable_refs, `commandCenter.telegram.${msg.id}.cable_refs`).length > 0,
      }));

  const cabliBloccantiDiretti = items?.filter((i) => i.computed_status === "blocked") ?? [];

  if (!latest && !isLoading) {
    return (
      <Screen>
        <EmptyState
          title="Nessuna lista importata"
          description="Importare la lista del giorno per aprire il Centro Comando."
          icon="📋"
        />
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/import")}
            className="min-h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Importa lista del giorno
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen className="max-w-6xl space-y-6">

      {/* ── Intestazione ─────────────────────────────────────────────────── */}
      <section className="rounded-[32px] border border-stone-200 bg-[linear-gradient(135deg,#ffffff_0%,#f6f0e3_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <AppBar
          title="Centro Comando"
          subtitle={new Date().toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long" })}
          action={
            summary ? (
              <Pill tone={nonChiusi.length === 0 ? "emerald" : nonChiusi.some((s) => s.stato === STATO_CHIUSURA.BLOCCATO) ? "red" : "amber"}>
                {nonChiusi.length === 0 ? "Tutto chiuso" : `${nonChiusi.length} sist. non chius${nonChiusi.length === 1 ? "o" : "i"}`}
              </Pill>
            ) : null
          }
        />

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm text-stone-600">
            {latest ? (
              <>
                <span className="truncate">{latest.file_name}</span>
                <span className="mx-2 text-stone-300">·</span>
                <span>{latest.list_date ?? "data sconosciuta"}</span>
              </>
            ) : "Caricamento lista attiva…"}
          </div>
          <button
            onClick={() => navigate("/import")}
            className="min-h-10 w-fit rounded-2xl border border-stone-200 bg-white px-3 text-xs font-medium text-stone-600 transition hover:border-stone-300 hover:text-stone-950"
          >
            Cambia lista
          </button>
        </div>

        {summary ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Cavi confermati" value={(summary.confirmed ?? 0) + (summary.likely_laid ?? 0)} helper={`/ ${summary.total} totale`} tone="emerald" />
            <StatCard label="Rimanenti" value={Math.max(summary.total - (summary.confirmed ?? 0) - (summary.likely_laid ?? 0), 0)} helper="da seguire" tone={summary.total - (summary.confirmed ?? 0) - (summary.likely_laid ?? 0) > 0 ? "amber" : "neutral"} />
            <StatCard label="Senza evidenza" value={summary.no_evidence} helper="da confermare" tone={summary.no_evidence > 0 ? "amber" : "neutral"} />
            <StatCard label="Anomalie" value={(summary.blocked ?? 0) + (summary.short_issues ?? 0) + (summary.missing_issues ?? 0)} helper="bloccati · corti · mancanti" tone={(summary.blocked ?? 0) > 0 ? "red" : "neutral"} />
          </div>
        ) : null}
      </section>

      {/* ── Errore caricamento evidenze ──────────────────────────────────── */}
      {isError ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Evidenze terreno non caricate</p>
          <p className="mt-1 text-xs text-amber-700">
            Il caricamento delle evidenze terreno è fallito. L'avanzamento potrebbe essere incompleto.
          </p>
        </div>
      ) : null}

      {/* ── Sistemi non chiusi ────────────────────────────────────────────── */}
      {!isLoading && nonChiusi.length > 0 ? (
        <SistemiNonChiusiSection
          sistemi={nonChiusi}
          onNavigate={() => latest && navigate(`/import/${latest.id}`)}
        />
      ) : null}

      {/* ── Apparecchiature critiche ──────────────────────────────────────── */}
      {apparecchiature.length > 0 ? (
        <ApparecchiatureCriticheSection
          apparecchiature={apparecchiature}
          onOpen={(codice) => navigate(`/equipment/${encodeURIComponent(codice)}`)}
        />
      ) : null}

      {/* ── Cavi bloccanti ───────────────────────────────────────────────── */}
      {cabliBloccantiDiretti.length > 0 ? (
        <CaviBloccantiSection
          cavi={cabliBloccantiDiretti}
          onOpen={(code) => navigate(`/cable/${encodeURIComponent(code)}`)}
        />
      ) : null}

      {/* ── Percorso critico ─────────────────────────────────────────────── */}
      {percorsoCritico.length > 0 ? (
        <PercorsoCriticoSection
          percorso={percorsoCritico}
          onOpen={(code) => navigate(`/cable/${encodeURIComponent(code)}`)}
        />
      ) : null}

      {/* ── Impatti Telegram ─────────────────────────────────────────────── */}
      <ImpattiTelegramSection
        impatti={impattiTelegram}
        onOpenCavo={(code) => navigate(`/cable/${encodeURIComponent(code)}`)}
      />

      {/* ── Chiusure recenti ─────────────────────────────────────────────── */}
      {recentiChiusi.length > 0 ? (
        <ChiusureRecentiSection sistemi={recentiChiusi} />
      ) : null}

      {/* ── Stato ok ─────────────────────────────────────────────────────── */}
      {!isLoading &&
        summary &&
        nonChiusi.length === 0 &&
        apparecchiature.length === 0 &&
        cabliBloccantiDiretti.length === 0 &&
        percorsoCritico.length === 0 ? (
        <EmptyState
          title="Centro Comando: nessuna anomalia aperta"
          description="Tutti i sistemi risultano chiusi e nessuna apparecchiatura è a rischio."
          icon="✓"
        />
      ) : null}
    </Screen>
  );
}

// ── Sezione: Sistemi non chiusi ───────────────────────────────────────────────

function SistemiNonChiusiSection({
  sistemi,
  onNavigate,
}: {
  sistemi: SistemaChiusura[];
  onNavigate: () => void;
}): JSX.Element {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
        Sistemi non chiusi
        <span className="ml-2 text-stone-400 normal-case font-normal">({sistemi.length})</span>
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {sistemi.map((sistema) => (
          <button
            key={sistema.nome}
            onClick={() => onNavigate()}
            className="rounded-[28px] border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Sistema
              </span>
              <Pill tone={statoChiusuraTone(sistema.stato)}>{sistema.stato}</Pill>
            </div>
            <p className="mt-1 text-base font-bold text-stone-950">{sistema.nome}</p>

            <dl className="mt-3 space-y-1.5 text-xs text-stone-600">
              <div className="flex items-start gap-2">
                <dt className="w-24 shrink-0 font-medium text-stone-500">Avanzamento</dt>
                <dd>{sistema.avanzamento_label}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="w-24 shrink-0 font-medium text-stone-500">Cosa manca</dt>
                <dd>{sistema.cosa_manca}</dd>
              </div>
              {sistema.cosa_blocca ? (
                <div className="flex items-start gap-2">
                  <dt className="w-24 shrink-0 font-medium text-red-600">Bloccato da</dt>
                  <dd className="font-mono text-red-700">{sistema.cosa_blocca}</dd>
                </div>
              ) : null}
              {sistema.impatto ? (
                <div className="flex items-start gap-2">
                  <dt className="w-24 shrink-0 font-medium text-rose-600">Impatto</dt>
                  <dd className="text-rose-700">{sistema.impatto}</dd>
                </div>
              ) : null}
            </dl>

            {/* Progress bar */}
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
              <div
                style={{ width: `${sistema.cavi_totali > 0 ? (sistema.cavi_confermati / sistema.cavi_totali) * 100 : 0}%` }}
                className={`h-full rounded-full transition-all ${
                  sistema.stato === STATO_CHIUSURA.BLOCCATO
                    ? "bg-red-500"
                    : sistema.stato === STATO_CHIUSURA.IN_CORSO
                    ? "bg-sky-500"
                    : "bg-amber-400"
                }`}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sezione: Apparecchiature critiche ────────────────────────────────────────

function ApparecchiatureCriticheSection({
  apparecchiature,
  onOpen,
}: {
  apparecchiature: ApparecchiaturaVM[];
  onOpen: (codice: string) => void;
}): JSX.Element {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
        Apparecchiature critiche
        <span className="ml-2 text-stone-400 normal-case font-normal">({apparecchiature.length})</span>
      </h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {apparecchiature.slice(0, 9).map((app) => (
          <button
            key={app.codice}
            onClick={() => onOpen(app.codice)}
            className="rounded-[28px] border border-rose-200 bg-rose-50/70 p-4 text-left shadow-sm transition hover:border-rose-300"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-base font-semibold text-stone-950">{app.codice}</span>
              <Pill tone={rischioTone(app.livello_rischio_raw)}>{app.livello_rischio}</Pill>
            </div>

            <dl className="mt-3 space-y-1.5 text-xs text-stone-600">
              <div className="flex items-start gap-2">
                <dt className="w-28 shrink-0 font-medium text-stone-500">Avanzamento</dt>
                <dd>{app.avanzamento_label}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="w-28 shrink-0 font-medium text-stone-500">Cosa manca</dt>
                <dd>{app.cosa_manca}</dd>
              </div>
              {app.cosa_blocca ? (
                <div className="flex items-start gap-2">
                  <dt className="w-28 shrink-0 font-medium text-red-600">Cosa blocca</dt>
                  <dd className="text-red-700">{app.cosa_blocca}</dd>
                </div>
              ) : null}
              {app.impatto_sistema ? (
                <div className="flex items-start gap-2">
                  <dt className="w-28 shrink-0 font-medium text-rose-600">Impatto</dt>
                  <dd className="text-rose-700">{app.impatto_sistema}</dd>
                </div>
              ) : null}
            </dl>

            {app.anomalie[0] ? (
              <p className="mt-3 text-xs leading-5 text-rose-700">{app.anomalie[0]}</p>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sezione: Cavi bloccanti ───────────────────────────────────────────────────

function CaviBloccantiSection({
  cavi,
  onOpen,
}: {
  cavi: DailyListItemVM[];
  onOpen: (code: string) => void;
}): JSX.Element {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
        Cavi bloccanti
        <span className="ml-2 text-stone-400 normal-case font-normal">({cavi.length})</span>
      </h2>
      <div className="rounded-[28px] border border-red-200 bg-red-50/60 p-4">
        <div className="flex flex-wrap gap-2">
          {cavi.slice(0, 20).map((item) => (
            <button
              key={item.id}
              onClick={() => onOpen(item.cable_code_normalized)}
              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-left transition hover:border-red-400"
            >
              <p className="font-mono text-sm font-semibold text-stone-950">
                {formatCableDisplay(item.cable_code_normalized)}
              </p>
              {item.perimetro ? (
                <p className="mt-0.5 text-[10px] text-stone-500">{item.perimetro}</p>
              ) : null}
              {item.recommended_action ? (
                <p className="mt-1 text-[10px] leading-4 text-red-700">{item.recommended_action}</p>
              ) : null}
            </button>
          ))}
        </div>
        {cavi.length > 20 ? (
          <p className="mt-3 text-xs text-stone-500">+{cavi.length - 20} altri cavi bloccati</p>
        ) : null}
      </div>
    </div>
  );
}

// ── Sezione: Percorso critico ─────────────────────────────────────────────────

function PercorsoCriticoSection({
  percorso,
  onOpen,
}: {
  percorso: CavoPercorsoCritico[];
  onOpen: (code: string) => void;
}): JSX.Element {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
        Percorso critico
        <span className="ml-2 text-stone-400 normal-case font-normal">({percorso.length} cavi)</span>
      </h2>
      <div className="grid gap-2 md:grid-cols-2">
        {percorso.slice(0, 12).map((cavo) => (
          <button
            key={cavo.codice_cavo}
            onClick={() => onOpen(cavo.codice_cavo)}
            className="flex items-start gap-3 rounded-[22px] border border-stone-200 bg-white p-3 text-left transition hover:border-amber-300"
          >
            <div className="mt-0.5 flex-shrink-0">
              <span className={`inline-flex h-2 w-2 rounded-full ${cavo.blocca_sistema ? "bg-red-500" : "bg-amber-400"}`} />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold text-stone-950">
                {formatCableDisplay(cavo.codice_cavo)}
              </p>
              <p className="mt-0.5 text-xs text-stone-600">{cavo.motivo}</p>
              {cavo.apparecchiature_impattate.length > 0 ? (
                <p className="mt-1 text-[10px] text-stone-400">
                  App: {cavo.apparecchiature_impattate.join(" · ")}
                </p>
              ) : null}
            </div>
            {cavo.perimetro ? (
              <span className="ml-auto shrink-0 text-[10px] text-stone-400">{cavo.perimetro}</span>
            ) : null}
          </button>
        ))}
      </div>
      {percorso.length > 12 ? (
        <p className="mt-2 text-xs text-stone-500">+{percorso.length - 12} altri cavi sul percorso critico</p>
      ) : null}
    </div>
  );
}

// ── Sezione: Impatti Telegram ─────────────────────────────────────────────────

function ImpattiTelegramSection({
  impatti,
  onOpenCavo,
}: {
  impatti: ImpattoTelegram[];
  onOpenCavo: (code: string) => void;
}): JSX.Element {
  const conCavi = impatti.filter((i) => i.ha_riferimenti_cavi).length;
  const conBloccanti = impatti.filter((i) => i.ha_cavi_bloccanti).length;

  return (
    <Section
      title="Impatto Telegram"
      eyebrow="Flusso terreno ufficiale"
      count={impatti.length}
    >
      {impatti.length === 0 ? (
        <EmptyState
          title="Nessun messaggio Telegram catturato"
          description="Il flusso si riempirà appena il bot Railway riceverà un messaggio dal gruppo cantiere."
          icon="📡"
        />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Messaggi recenti" value={impatti.length} helper="catturati in DB" tone="sky" />
            <StatCard label="Con cavi" value={conCavi} helper="apribili in Cable Story" tone={conCavi > 0 ? "emerald" : "neutral"} />
            <StatCard label="Con bloccanti" value={conBloccanti} helper="richiedono azione" tone={conBloccanti > 0 ? "red" : "neutral"} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {impatti.map((impatto) => (
              <article
                key={impatto.messaggio_id}
                className={`rounded-[28px] border p-4 shadow-sm ${
                  impatto.ha_cavi_bloccanti
                    ? "border-red-200 bg-red-50/60"
                    : "border-sky-200 bg-sky-50/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-950">{impatto.mittente}</p>
                    <p className="mt-1 text-xs text-stone-600">{formatData(impatto.data)}</p>
                  </div>
                  {impatto.ha_cavi_bloccanti ? (
                    <Pill tone="red">bloccante</Pill>
                  ) : impatto.ha_riferimenti_cavi ? (
                    <Pill tone="emerald">{impatto.cavi_impattati.length} cav{impatto.cavi_impattati.length === 1 ? "o" : "i"}</Pill>
                  ) : (
                    <Pill tone="neutral">info</Pill>
                  )}
                </div>

                <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-stone-700">
                  {impatto.testo || "Messaggio senza testo"}
                </p>

                {impatto.cavi_impattati.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {impatto.cavi_impattati.slice(0, 6).map((cavo) => (
                      <button
                        key={cavo.codice_cavo}
                        onClick={() => onOpenCavo(cavo.codice_cavo)}
                        className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-left transition hover:border-sky-300"
                      >
                        <span className="font-mono text-xs font-semibold text-stone-700">
                          {formatCableDisplay(cavo.codice_cavo)}
                        </span>
                        <div className="flex items-center gap-2">
                          {cavo.perimetro ? (
                            <span className="text-[10px] text-stone-400">{cavo.perimetro}</span>
                          ) : null}
                          <Pill tone={statoPill(cavo.stato)}>{cavo.stato_label}</Pill>
                        </div>
                      </button>
                    ))}
                    {impatto.cavi_impattati.length > 6 ? (
                      <p className="text-xs text-stone-500">+{impatto.cavi_impattati.length - 6} altri cavi</p>
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

// ── Sezione: Chiusure recenti ─────────────────────────────────────────────────

function ChiusureRecentiSection({
  sistemi,
}: {
  sistemi: SistemaChiusura[];
}): JSX.Element {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
        Chiusure recenti
        <span className="ml-2 text-stone-400 normal-case font-normal">({sistemi.length} sist. chiusi)</span>
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {sistemi.map((sistema) => (
          <div
            key={sistema.nome}
            className="rounded-[22px] border border-emerald-200 bg-emerald-50/60 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-stone-950">{sistema.nome}</span>
              <Pill tone="emerald">CHIUSO</Pill>
            </div>
            <p className="mt-1 text-xs text-stone-600">{sistema.avanzamento_label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
