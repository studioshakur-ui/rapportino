import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AppBar, Btn, EmptyState, Pill, Screen, Section } from "../../../components/command-ui";
import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { askCockpit, type CockpitAnswer } from "../api/ai.api";

const SUGGESTIONS = [
  "Quali cavi mancano di prova oggi?",
  "Quali zone sono a 0%?",
  "Cosa blocca la chiusura adesso?",
  "Riassumi gli ultimi messaggi dal campo.",
];

export default function AssistentePage(): JSX.Element {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: (q: string) => askCockpit(q),
  });

  function ask(q: string): void {
    const text = q.trim();
    if (!text || isPending) return;
    setQuestion(text);
    mutate(text);
  }

  const answer: CockpitAnswer | undefined = data;

  return (
    <Screen className="max-w-4xl space-y-6">
      <AppBar
        title="Assistente"
        kicker="Assistente · Campo"
        subtitle="Fai una domanda sul cantiere in linguaggio naturale. Risponde dai dati reali della lista attiva, dei messaggi e degli eventi terreno."
      />

      <Section title="La tua domanda" eyebrow="Chiedi">
        <div className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
          <form
            onSubmit={(e) => { e.preventDefault(); ask(question); }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Es. Quali cavi sono bloccati nella zona CMS?"
              className="min-h-12 flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:bg-white"
            />
            <Btn onClick={() => ask(question)} disabled={isPending || !question.trim()} className="w-full sm:w-auto">
              {isPending ? "Sto pensando…" : "Chiedi"}
            </Btn>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                disabled={isPending}
                className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-amber-300 hover:text-stone-950 disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {(error as Error).message || "Errore durante la richiesta."}
          <button onClick={() => reset()} className="ml-2 underline">riprova</button>
        </div>
      ) : null}

      {isPending ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-stone-200 bg-stone-100" />
          ))}
        </div>
      ) : null}

      {answer ? (
        <Section
          title="Risposta"
          eyebrow="Assistente"
          className="space-y-3"
        >
          <article className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base leading-7 text-stone-900">{answer.summary}</p>
              {answer.action_required ? <Pill tone="red">Azione richiesta</Pill> : <Pill tone="emerald">OK</Pill>}
            </div>

            {answer.alerts && answer.alerts.length > 0 ? (
              <div className="mt-4 space-y-2">
                {answer.alerts.map((a, i) => (
                  <div key={i} className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{a}</div>
                ))}
              </div>
            ) : null}

            {answer.cables && answer.cables.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Cavi</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {answer.cables.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => navigate(`/cable/${encodeURIComponent(c.code)}`)}
                      title={c.note ?? c.status}
                      className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1 font-mono text-xs font-semibold text-stone-700 transition hover:border-amber-300"
                    >
                      {formatCableDisplay(c.code)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {answer.zones && answer.zones.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Zone</p>
                <div className="mt-2 space-y-1.5">
                  {answer.zones.map((z) => (
                    <div key={z.name} className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-1.5 text-xs">
                      <span className="truncate text-stone-700">{z.name}</span>
                      <span className={`shrink-0 font-semibold tabular-nums ${z.pct === 0 ? "text-red-700" : z.pct < 50 ? "text-amber-700" : "text-emerald-700"}`}>
                        {z.pct}% ({z.confirmed}/{z.total})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {answer.suggestions && answer.suggestions.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Suggerimenti</p>
                <ul className="mt-2 space-y-1.5">
                  {answer.suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm text-stone-700">
                      <span className="text-amber-500">→</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        </Section>
      ) : null}

      {!answer && !isPending && !error ? (
        <EmptyState
          title="Pronto a rispondere"
          description="Scrivi una domanda o tocca un suggerimento qui sopra."
          icon="💬"
        />
      ) : null}
    </Screen>
  );
}
