import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppBar, Btn, EmptyState, Screen } from "../../../components/command-ui";
import { StatoPill } from "../../../components/stato/StatoPill";
import { STATO_CONSEGNA, type GestoConsegnaKey } from "../../../domain/statoConsegna";
import { loadGiroOggi, type GiroOggiItem } from "./giroOggi.api";

const PIPELINE: GestoConsegnaKey[] = ["da_posare", "da_sistemare", "pronto_coll", "da_finire"];

export default function GiroOggiPage(): JSX.Element {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["giro_oggi"],
    queryFn: loadGiroOggi,
    staleTime: 30_000,
  });

  const total = data?.items.length ?? 0;

  return (
    <Screen className="max-w-3xl space-y-5">
      <AppBar
        title="La tua lista oggi"
        subtitle="Il giro del giorno, ordinato per gesto di consegna e aggiornato dallo stato live INCA."
        action={data ? <StatoPill stato="consegnato" label={`Fatti ${data.consegnati} / ${total}`} /> : null}
      />

      <div className="theme-card-surface rounded-[24px] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] theme-token-faint">Lista attiva</p>
            <h2 className="mt-1 text-lg font-semibold theme-token-text">{data?.fileName ?? "Caricamento..."}</h2>
            <p className="mt-1 text-sm theme-token-muted">{formatListDate(data?.listDate ?? null, data?.importedAt ?? null)}</p>
          </div>
          <Btn onClick={() => navigate("/navemaster")} variant="secondary">← Torna a Consegna</Btn>
        </div>
      </div>

      {isLoading ? <LoadingCards /> : null}

      {!isLoading && (isError || !data) ? (
        <EmptyState
          title={isError ? "Lista non disponibile" : "Nessuna lista attiva"}
          description={isError ? "Non è stato possibile leggere la lista del giorno. Riprova tra poco." : "Importa una lista giornaliera per preparare il giro."}
          icon="Lista"
        />
      ) : null}

      {data ? (
        <div className="space-y-6">
          {PIPELINE.map((gesto) => {
            const items = data.items.filter((item) => item.gesto === gesto);
            if (items.length === 0) return null;
            return <GiroSection key={gesto} gesto={gesto} items={items} />;
          })}

          {data.consegnati > 0 ? (
            <details className="theme-card-surface rounded-[24px] p-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
                <StatoPill stato="consegnato" />
                <span className="text-sm font-semibold theme-token-muted">{data.consegnati} cavi</span>
              </summary>
              <div className="mt-3 space-y-3">
                {data.items.filter((item) => item.gesto === "consegnato").map((item) => <GiroCard key={item.id} item={item} />)}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </Screen>
  );
}

function GiroSection({ gesto, items }: { gesto: GestoConsegnaKey; items: GiroOggiItem[] }): JSX.Element {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <StatoPill stato={gesto} />
        <span className="theme-count-badge inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.map((item) => <GiroCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

function GiroCard({ item }: { item: GiroOggiItem }): JSX.Element {
  const meta = STATO_CONSEGNA[item.gesto];
  return (
    <article className="theme-card-surface rounded-[24px] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-mono text-base font-semibold theme-token-text">{item.displayCodice}</p>
        <StatoPill stato={item.gesto} className="shrink-0" />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-sm">
        <Endpoint apparato={item.apparatoDa} descrizione={item.descrizioneDa} />
        <span className="pt-1 theme-token-faint" aria-hidden>→</span>
        <Endpoint apparato={item.apparatoA} descrizione={item.descrizioneA} align="right" />
      </div>

      <div className="theme-card-surface-2 mt-4 rounded-2xl px-3 py-3 text-sm leading-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] theme-token-faint">{item.note ? "Nota" : "Manca"}</p>
        <p className="mt-1 theme-token-text">{item.note ?? item.manca}</p>
      </div>

      <button
        type="button"
        disabled
        title="Arriva presto: il completamento sarà registrato come evento nel lotto 4b."
        className="theme-btn theme-btn-secondary mt-4 min-h-12 w-full rounded-2xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        Fatto · arriva presto
      </button>
      <span className="sr-only">Azione {meta.label} non ancora disponibile</span>
    </article>
  );
}

function Endpoint({ apparato, descrizione, align = "left" }: { apparato: string | null; descrizione: string | null; align?: "left" | "right" }): JSX.Element {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="font-semibold theme-token-text">{apparato ?? "—"}</p>
      {descrizione ? <p className="mt-1 text-xs leading-5 theme-token-muted">{descrizione}</p> : null}
    </div>
  );
}

function LoadingCards(): JSX.Element {
  return (
    <div className="space-y-3" aria-label="Caricamento lista">
      {[1, 2, 3].map((item) => <div key={item} className="theme-card-surface h-36 animate-pulse rounded-[24px]" />)}
    </div>
  );
}

function formatListDate(listDate: string | null, importedAt: string | null): string {
  const value = listDate ? `${listDate}T12:00:00` : importedAt;
  if (!value) return "Data non disponibile";
  return new Date(value).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}
