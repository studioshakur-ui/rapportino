// src/features/core-command/intake/TelegramAIPage.tsx
// Classifie les messages Telegram entrants via Claude Haiku.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabaseClient";
import { AppBar, EmptyState, Pill, Screen, Section, StatCard } from "../../../components/command-ui";

interface IncomingMsg {
  id: string;
  sender_name: string | null;
  message_ts: string;
  text: string | null;
  cable_refs: string[];
  processed: boolean;
  classification: Record<string, unknown>;
}

interface ClassifyResult {
  ok: boolean;
  total: number;
  processed: number;
  events_created: number;
  errors: string[];
  dry_run?: boolean;
  classifications?: Array<{
    id: string;
    sender: string | null;
    text_sample: string;
    cables: string[];
    kind: string;
    confidence: number;
    note: string | null;
  }>;
}

function kindTone(kind: string): "emerald" | "amber" | "red" | "sky" | "neutral" {
  if (kind === "CABLE_POSATO") return "emerald";
  if (kind === "CABLE_DA_CONTROLLARE" || kind === "CABLE_CORTO") return "amber";
  if (kind === "CABLE_MANCANTE") return "red";
  if (kind === "CABLE_SFILATO" || kind === "CABLE_LASATO") return "sky";
  return "neutral";
}

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    CABLE_POSATO:          "Posé",
    CABLE_SFILATO:         "Retiré",
    CABLE_LASATO:          "Lâché",
    CABLE_CORTO:           "Trop court",
    CABLE_MANCANTE:        "Manquant",
    CABLE_DA_CONTROLLARE:  "À vérifier",
    CABLE_MENTION:         "Mention",
    GENERAL_MESSAGE:       "Social",
  };
  return map[kind] ?? kind;
}

async function fetchMessages(): Promise<{ all: IncomingMsg[]; unprocessed: number }> {
  const { data, error } = await supabase
    .from("incoming_messages")
    .select("id, sender_name, message_ts, text, cable_refs, processed, classification")
    .order("message_ts", { ascending: false })
    .limit(100);

  if (error) throw error;
  const rows = (data ?? []) as IncomingMsg[];
  return {
    all: rows,
    unprocessed: rows.filter((r) => !r.processed).length,
  };
}

async function callClassify(opts: { dryRun?: boolean; limit?: number }): Promise<ClassifyResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Non authentifié");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const resp = await fetch(`${supabaseUrl}/functions/v1/classify-incoming`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ dry_run: opts.dryRun ?? false, limit: opts.limit ?? 50 }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Erreur réseau" }));
    throw new Error(err.error ?? `HTTP ${resp.status}`);
  }
  return resp.json();
}

export default function TelegramAIPage() {
  const [running, setRunning]   = useState(false);
  const [result,  setResult]    = useState<ClassifyResult | null>(null);
  const [error,   setError]     = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey:  ["incoming_messages_ai"],
    queryFn:   fetchMessages,
    staleTime: 10_000,
  });

  const unprocessed = data?.unprocessed ?? 0;
  const all = data?.all ?? [];

  async function run(dryRun: boolean) {
    setRunning(true); setError(null); setResult(null);
    try {
      const res = await callClassify({ dryRun, limit: 50 });
      setResult(res);
      if (!dryRun) refetch();
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <AppBar
        title="Analyse IA — Telegram"
        subtitle="GPT-4o-mini classifie les messages terrain non traités."
        action={<Pill tone={unprocessed > 0 ? "amber" : "emerald"}>{unprocessed} en attente</Pill>}
      />

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Messages total" value={all.length} />
        <StatCard
          label="Non traités"
          value={unprocessed}
          tone={unprocessed > 0 ? "amber" : "neutral"}
          helper={unprocessed > 0 ? "Prêts pour l'IA" : "Tout à jour"}
        />
        <StatCard
          label="Traités"
          value={all.length - unprocessed}
          tone="emerald"
          helper="core_events + cable_events créés"
        />
      </div>

      {/* Actions */}
      <section className="flex flex-wrap gap-3">
        <button
          onClick={() => run(false)}
          disabled={running || unprocessed === 0}
          className="min-h-11 rounded-2xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40"
        >
          {running ? "Analyse en cours…" : `Classifier ${unprocessed} message${unprocessed > 1 ? "s" : ""} avec OpenAI`}
        </button>
        <button
          onClick={() => run(true)}
          disabled={running || unprocessed === 0}
          className="min-h-11 rounded-2xl border border-zinc-700 px-5 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-40"
        >
          Aperçu (dry run)
        </button>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border p-4 space-y-2 text-sm ${result.ok ? "border-emerald-500/20 bg-emerald-500/10" : "border-red-500/20 bg-red-500/10"}`}>
          <p className="font-semibold text-white">
            {result.dry_run ? "Aperçu (aucune écriture)" : "Traitement terminé"}
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs text-zinc-300">
            <span>{result.total} analysés</span>
            <span>{result.processed} traités</span>
            <span className="text-emerald-300">{result.events_created} événements créés</span>
          </div>
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-amber-300">{result.errors.length} erreur(s)</summary>
              <ul className="mt-1 space-y-0.5">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-300 font-mono">{e}</li>
                ))}
              </ul>
            </details>
          )}
          {/* Dry run preview */}
          {result.dry_run && result.classifications && (
            <div className="mt-3 space-y-2">
              {result.classifications.map((c) => (
                <div key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-500">{c.sender ?? "?"}</span>
                    <Pill tone={kindTone(c.kind)}>{kindLabel(c.kind)}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 truncate">{c.text_sample}</p>
                  {c.cables.length > 0 && (
                    <p className="mt-1 font-mono text-xs text-sky-300">{c.cables.join(" · ")}</p>
                  )}
                  {c.note && <p className="mt-1 text-xs text-zinc-300 italic">{c.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Message list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />)}
        </div>
      ) : all.length === 0 ? (
        <EmptyState title="Aucun message Telegram" description="Les messages arrivent via le bridge Telegram → Supabase." icon="○" />
      ) : (
        <Section title="Messages récents" eyebrow="Telegram" count={all.length}>
          <div className="space-y-2">
            {all.slice(0, 30).map((msg) => {
              const cls = msg.classification;
              const kind = typeof cls?.event_kind === "string" ? cls.event_kind : null;
              const classifiedByAI = cls?.classified_by === "claude-ai";
              return (
                <article
                  key={msg.id}
                  className={`rounded-2xl border px-4 py-3 ${msg.processed ? "border-zinc-800 bg-zinc-900/60" : "border-amber-500/20 bg-amber-500/5"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-zinc-400">{msg.sender_name ?? "?"}</span>
                        <span className="text-xs text-zinc-600">
                          {new Date(msg.message_ts).toLocaleString("fr-FR", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        {classifiedByAI && kind && (
                          <Pill tone={kindTone(kind)}>{kindLabel(kind)}</Pill>
                        )}
                        {!msg.processed && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                            En attente
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-500 line-clamp-2">{msg.text}</p>
                      {msg.cable_refs.length > 0 && (
                        <p className="font-mono text-xs text-sky-400">
                          {msg.cable_refs.slice(0, 8).join(" · ")}
                          {msg.cable_refs.length > 8 && ` +${msg.cable_refs.length - 8}`}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Section>
      )}
    </Screen>
  );
}
