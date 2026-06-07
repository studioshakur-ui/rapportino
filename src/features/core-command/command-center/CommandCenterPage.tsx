import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Pill, Screen, StatCard, EmptyState, Section, AppBar } from "../../../components/command-ui";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { loadCoreEngineSnapshot } from "../../../domain/core-engine";
import type { ApparatusClosureCard, TodayWorkClosureCard, TodayWorkTelegramCard } from "../../../domain/core-engine";
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

function statusTone(status: string): "emerald" | "sky" | "amber" | "red" | "neutral" {
  if (status === "CLOSED") return "emerald";
  if (status === "BLOCKED") return "red";
  if (status === "OPEN") return "amber";
  return "sky";
}

function rischioTone(raw: string): "emerald" | "sky" | "amber" | "red" | "neutral" {
  if (raw === "low") return "emerald";
  if (raw === "medium") return "sky";
  if (raw === "high") return "amber";
  if (raw === "critical") return "red";
  return "neutral";
}

function rischioLabel(raw: string): string {
  if (raw === "low") return "Basso";
  if (raw === "medium") return "Medio";
  if (raw === "high") return "Alto";
  if (raw === "critical") return "Critico";
  return raw;
}

function closureLabel(raw: string): string {
  if (raw === "CLOSED") return "CHIUSO";
  if (raw === "BLOCKED") return "BLOCCATO";
  if (raw === "PARTIAL") return "PARZIALE";
  if (raw === "OPEN") return "APERTO";
  return raw;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CommandCenterPage(): JSX.Element {
  const navigate = useNavigate();

  const { data: snapshot, isLoading, isError } = useQuery({
    queryKey: ["core_engine_snapshot"],
    queryFn: loadCoreEngineSnapshot,
    staleTime: 60_000,
  });
  const latest = snapshot?.today.latest_import ?? null;
  const summary = snapshot?.today.summary ?? null;
  const nonChiusi = ensureArray(snapshot?.today.critical_closures, "commandCenter.today.critical_closures")
    .filter((card) => card.kind === "system" && card.status !== "CLOSED");
  const recentiChiusi = ensureArray(snapshot?.apparatus.systems, "commandCenter.apparatus.systems")
    .filter((system) => system.closure_status === "CLOSED")
    .slice(0, 6);
  const apparecchiature = ensureArray(snapshot?.apparatus.equipments, "commandCenter.apparatus.equipments")
    .filter((equipment) => equipment.closure_status !== "CLOSED" || equipment.risk_level === "high" || equipment.risk_level === "critical")
    .slice(0, 9);
  const cabliBloccantiDiretti = ensureArray(snapshot?.field.blocked_items, "commandCenter.field.blocked_items").slice(0, 20);
  const percorsoCritico = ensureArray(snapshot?.apparatus.equipments, "commandCenter.apparatus.equipments")
    .flatMap((equipment) => ensureArray(equipment.critical_path, `commandCenter.${equipment.equipment_code}.critical_path`))
    .slice(0, 12);
  const impattiTelegram = ensureArray(snapshot?.today.telegram_impacts, "commandCenter.today.telegram_impacts").slice(0, 12);

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
      <section className="rounded-[32px] border border-stone-200 bg-[linear-gradient(135deg,#ffffff_0%,#f6f0e3_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <AppBar
          title="Centro Comando"
          subtitle={new Date().toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long" })}
          action={
            summary ? (
              <Pill tone={nonChiusi.length === 0 ? "emerald" : nonChiusi.some((s) => s.status === "BLOCKED") ? "red" : "amber"}>
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
            <StatCard label="Cavi confermati" value={snapshot?.today.metrics.confirmed_cables ?? 0} helper={`/ ${snapshot?.today.metrics.total_cables ?? 0} totale`} tone="emerald" />
            <StatCard label="Rimanenti" value={snapshot?.today.metrics.remaining_cables ?? 0} helper="da seguire" tone={(snapshot?.today.metrics.remaining_cables ?? 0) > 0 ? "amber" : "neutral"} />
            <StatCard label="Senza evidenza" value={summary.no_evidence} helper="da confermare" tone={summary.no_evidence > 0 ? "amber" : "neutral"} />
            <StatCard label="Anomalie" value={snapshot?.today.metrics.blocked_cables ?? 0} helper="bloccati · critici" tone={(snapshot?.today.metrics.blocked_cables ?? 0) > 0 ? "red" : "neutral"} />
          </div>
        ) : null}
      </section>

      {isError ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Evidenze terreno non caricate</p>
          <p className="mt-1 text-xs text-amber-700">
            Il caricamento delle evidenze terreno è fallito. L'avanzamento potrebbe essere incompleto.
          </p>
        </div>
      ) : null}

      {!isLoading && nonChiusi.length > 0 ? (
        <SistemiNonChiusiSection
          sistemi={nonChiusi}
          onNavigate={() => latest && navigate(`/import/${latest.id}`)}
        />
      ) : null}

      {apparecchiature.length > 0 ? (
        <ApparecchiatureCriticheSection
          apparecchiature={apparecchiature}
          onOpen={(codice) => navigate(`/equipment/${encodeURIComponent(codice)}`)}
        />
      ) : null}

      {cabliBloccantiDiretti.length > 0 ? (
        <CaviBloccantiSection
          cavi={cabliBloccantiDiretti}
          onOpen={(code) => navigate(`/cable/${encodeURIComponent(code)}`)}
        />
      ) : null}

      {percorsoCritico.length > 0 ? (
        <PercorsoCriticoSection
          percorso={percorsoCritico}
          onOpen={(code) => navigate(`/cable/${encodeURIComponent(code)}`)}
        />
      ) : null}

      <ImpattiTelegramSection
        impatti={impattiTelegram}
      />

      {recentiChiusi.length > 0 ? (
        <ChiusureRecentiSection sistemi={recentiChiusi} />
      ) : null}

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
  sistemi: TodayWorkClosureCard[];
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
            key={sistema.key}
            onClick={() => onNavigate()}
            className="rounded-[28px] border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {sistema.kind === "system" ? "Sistema" : "Apparecchiatura"}
              </span>
              <Pill tone={statusTone(sistema.status)}>{sistema.status}</Pill>
            </div>
            <p className="mt-1 text-base font-bold text-stone-950">{sistema.name}</p>

            <dl className="mt-3 space-y-1.5 text-xs text-stone-600">
              <div className="flex items-start gap-2">
                <dt className="w-24 shrink-0 font-medium text-stone-500">Avanzamento</dt>
                <dd>{sistema.summary}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="w-24 shrink-0 font-medium text-stone-500">Cosa manca</dt>
                <dd>{sistema.status === "CLOSED" ? "Tutto chiuso" : "Da seguire"}</dd>
              </div>
              {sistema.blocker ? (
                <div className="flex items-start gap-2">
                  <dt className="w-24 shrink-0 font-medium text-red-600">Bloccato da</dt>
                  <dd className="font-mono text-red-700">{sistema.blocker}</dd>
                </div>
              ) : null}
            </dl>
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
  apparecchiature: ApparatusClosureCard[];
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
            key={app.equipment_code}
            onClick={() => onOpen(app.equipment_code)}
            className="rounded-[28px] border border-rose-200 bg-rose-50/70 p-4 text-left shadow-sm transition hover:border-rose-300"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-base font-semibold text-stone-950">{app.equipment_code}</span>
              <Pill tone={rischioTone(app.risk_level)}>{rischioLabel(app.risk_level)}</Pill>
            </div>

            <dl className="mt-3 space-y-1.5 text-xs text-stone-600">
              <div className="flex items-start gap-2">
                <dt className="w-28 shrink-0 font-medium text-stone-500">Avanzamento</dt>
                <dd>{`${app.confirmed_cables}/${app.total_cables} cavi confermati`}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="w-28 shrink-0 font-medium text-stone-500">Cosa manca</dt>
                <dd>{app.total_cables - app.confirmed_cables > 0 ? `${app.total_cables - app.confirmed_cables} cavi non confermati` : "Tutti i cavi confermati"}</dd>
              </div>
              {app.blocker ? (
                <div className="flex items-start gap-2">
                  <dt className="w-28 shrink-0 font-medium text-red-600">Cosa blocca</dt>
                  <dd className="text-red-700">{app.blocker}</dd>
                </div>
              ) : null}
              {app.blocker ? (
                <div className="flex items-start gap-2">
                  <dt className="w-28 shrink-0 font-medium text-rose-600">Impatto</dt>
                  <dd className="text-rose-700">apparecchiatura non chiudibile</dd>
                </div>
              ) : null}
            </dl>

            {app.recommended_actions[0] ? (
              <p className="mt-3 text-xs leading-5 text-rose-700">{app.recommended_actions[0]}</p>
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
  cavi: Array<{
    cable_code: string;
    perimetro: string | null;
    recommended_action: string;
  }>;
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
              key={item.cable_code}
              onClick={() => onOpen(item.cable_code)}
              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-left transition hover:border-red-400"
            >
              <p className="font-mono text-sm font-semibold text-stone-950">
                {formatCableDisplay(item.cable_code)}
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
  percorso: string[];
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
            key={cavo}
            onClick={() => onOpen(cavo)}
            className="flex items-start gap-3 rounded-[22px] border border-stone-200 bg-white p-3 text-left transition hover:border-amber-300"
          >
            <div className="mt-0.5 flex-shrink-0">
              <span className="inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold text-stone-950">
                {formatCableDisplay(cavo)}
              </p>
              <p className="mt-0.5 text-xs text-stone-600">Percorso critico dal snapshot core</p>
            </div>
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
}: {
  impatti: TodayWorkTelegramCard[];
}): JSX.Element {
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
            <StatCard label="Con cavi" value={impatti.filter((item) => item.cable_codes.length > 0).length} helper="apribili in Cable Story" tone={impatti.some((item) => item.cable_codes.length > 0) ? "emerald" : "neutral"} />
            <StatCard label="System closed" value={impatti.filter((item) => item.system_closed).length} helper="chiusure ufficiali" tone={impatti.some((item) => item.system_closed) ? "emerald" : "neutral"} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {impatti.map((impatto) => (
              <article
                key={impatto.message_id}
                className={`rounded-[28px] border p-4 shadow-sm ${
                  impatto.system_closed ? "border-emerald-200 bg-emerald-50/60" : "border-sky-200 bg-sky-50/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-950">{impatto.text || "Messaggio Telegram"}</p>
                    <p className="mt-1 text-xs text-stone-600">{formatData(impatto.message_ts)}</p>
                  </div>
              <Pill tone={impatto.system_closed ? "emerald" : "amber"}>{impatto.system_closed ? "SYSTEM CLOSED" : "in attesa"}</Pill>
                </div>

                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-stone-700">
                  {impatto.before_label} → {impatto.after_label}
                </p>

                {impatto.cable_codes.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {impatto.cable_codes.slice(0, 6).map((code) => (
                      <div
                        key={code}
                        className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-2.5 py-1.5"
                      >
                        <span className="font-mono text-xs font-semibold text-stone-700">{formatCableDisplay(code)}</span>
                        <span className="text-[10px] text-stone-400">{impatto.systems.join(" · ") || "—"}</span>
                      </div>
                    ))}
                    {impatto.cable_codes.length > 6 ? (
                      <p className="text-xs text-stone-500">+{impatto.cable_codes.length - 6} altri cavi</p>
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
  sistemi: Array<{
    system: string;
    zone: string | null;
    total_equipments: number;
    closed_equipments: number;
    open_equipments: number;
    blocked_equipments: number;
    closure_status: string;
  }>;
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
            key={sistema.system}
            className="rounded-[22px] border border-emerald-200 bg-emerald-50/60 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-stone-950">{sistema.system}</span>
              <Pill tone="emerald">{closureLabel(sistema.closure_status)}</Pill>
            </div>
            <p className="mt-1 text-xs text-stone-600">{sistema.closed_equipments}/{sistema.total_equipments} apparecchiature chiuse</p>
          </div>
        ))}
      </div>
    </div>
  );
}
