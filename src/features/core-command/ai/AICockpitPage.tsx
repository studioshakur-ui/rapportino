// src/features/core-command/ai/AICockpitPage.tsx
// Cockpit IA métier — questions terrain en langage naturel, réponses structurées.
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import { Pill } from "../../../components/command-ui";

interface Message {
  role: "user" | "assistant";
  content: string;
  data?: CockpitAnswer;
  ts: number;
}

interface CockpitAnswer {
  summary: string;
  cables?: Array<{ code: string; status: string; note?: string }>;
  zones?:  Array<{ name: string; pct: number; total: number; confirmed: number }>;
  alerts?: string[];
  suggestions?: string[];
  action_required?: boolean;
}

const QUICK_QUERIES = [
  "Quels câbles sont bloqués ou en retard ?",
  "Donne-moi un résumé de l'avancement d'aujourd'hui.",
  "Quelles zones sont à 0% d'avancement ?",
  "Quels câbles n'ont aucune preuve terrain ?",
  "Y a-t-il des câbles manquants ou trop courts signalés ?",
  "Quels sont les équipements critiques à surveiller ?",
];

async function askCockpit(question: string): Promise<CockpitAnswer> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Non authentifié");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const resp = await fetch(`${supabaseUrl}/functions/v1/ai-cockpit`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ question }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Erreur réseau" }));
    throw new Error(err.error ?? `HTTP ${resp.status}`);
  }
  return resp.json();
}

function statusTone(status: string): "emerald" | "amber" | "red" | "blue" | "neutral" {
  if (status === "confirmed_field" || status === "CABLE_POSATO") return "emerald";
  if (status === "to_verify" || status === "CABLE_DA_CONTROLLARE" || status === "CABLE_CORTO") return "amber";
  if (status === "blocked" || status === "CABLE_MANCANTE" || status === "missing") return "red";
  if (status === "likely_laid" || status === "CABLE_SFILATO") return "blue";
  return "neutral";
}

function statusLabel(status: string): string {
  const m: Record<string, string> = {
    confirmed_field:       "Confirmé",
    likely_laid:           "Probable",
    to_verify:             "À vérifier",
    no_evidence:           "Sans preuve",
    missing:               "Manquant",
    blocked:               "Bloqué",
    CABLE_POSATO:          "Posé",
    CABLE_SFILATO:         "Retiré",
    CABLE_CORTO:           "Trop court",
    CABLE_MANCANTE:        "Manquant",
    CABLE_DA_CONTROLLARE:  "À vérifier",
  };
  return m[status] ?? status.replace(/_/g, " ");
}

export default function AICockpitPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setError(null);
    const userMsg: Message = { role: "user", content: question.trim(), ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const answer = await askCockpit(question.trim());
      const asstMsg: Message = {
        role: "assistant",
        content: answer.summary,
        data: answer,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, asstMsg]);
    } catch (e) {
      setError(String(e));
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex h-[calc(100vh-48px)] md:h-screen flex-col bg-gray-50">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-base font-bold text-gray-900">IA Cockpit chantier</h1>
          <p className="text-xs text-gray-500">Posez des questions sur l'avancement terrain en langage naturel</p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null); }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100"
            >
              Effacer
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            OpenAI GPT-4o
          </span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">

        {/* Welcome */}
        {messages.length === 0 && !loading && (
          <div className="mx-auto max-w-2xl pt-6">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-semibold text-blue-900">Bienvenue dans le Cockpit IA</p>
              <p className="mt-1 text-sm text-blue-700 leading-relaxed">
                Je connais votre chantier : les câbles de la liste du jour, leur avancement par zone, les signaux Telegram des ouvriers, et les problèmes détectés.
                Posez votre question ci-dessous ou choisissez une requête rapide.
              </p>
            </div>

            {/* Quick queries */}
            <div className="mt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Requêtes rapides</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {QUICK_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message thread */}
        {messages.map((msg) => (
          <div key={msg.ts} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" ? (
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm text-white shadow-sm">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[90%] space-y-3">
                {/* Main answer */}
                <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-sm text-gray-800 leading-relaxed">{msg.content}</p>
                </div>

                {/* Structured data */}
                {msg.data && (
                  <>
                    {/* Alerts */}
                    {msg.data.action_required && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">Action requise</p>
                        {msg.data.alerts?.map((a, i) => (
                          <p key={i} className="text-sm text-red-700">• {a}</p>
                        ))}
                      </div>
                    )}

                    {/* Cable table */}
                    {msg.data.cables && msg.data.cables.length > 0 && (
                      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Câbles ({msg.data.cables.length})</p>
                        </div>
                        <table className="w-full border-collapse text-sm">
                          <thead className="border-b border-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Câble</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Statut</th>
                              <th className="hidden px-3 py-2 text-left text-xs font-semibold text-gray-500 sm:table-cell">Note</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {msg.data.cables.slice(0, 20).map((c) => (
                              <tr
                                key={c.code}
                                onClick={() => navigate(`/command/cable/${encodeURIComponent(c.code)}`)}
                                className="cursor-pointer hover:bg-blue-50/40 transition"
                              >
                                <td className="px-3 py-2 font-mono text-sm font-semibold text-gray-900">{c.code}</td>
                                <td className="px-3 py-2">
                                  <Pill tone={statusTone(c.status)}>{statusLabel(c.status)}</Pill>
                                </td>
                                <td className="hidden px-3 py-2 text-xs text-gray-500 sm:table-cell">{c.note ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {msg.data.cables.length > 20 && (
                          <p className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                            + {msg.data.cables.length - 20} câbles supplémentaires
                          </p>
                        )}
                      </div>
                    )}

                    {/* Zone progress */}
                    {msg.data.zones && msg.data.zones.length > 0 && (
                      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Avancement par zone</p>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {msg.data.zones.map((z) => {
                            const zPct = z.total > 0 ? Math.round((z.confirmed / z.total) * 100) : 0;
                            return (
                              <div key={z.name} className="flex items-center gap-3 px-4 py-2.5">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-gray-800 truncate">{z.name}</span>
                                    <span className="text-xs text-gray-500 shrink-0">{z.confirmed}/{z.total}</span>
                                  </div>
                                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                    <div
                                      style={{ width: `${zPct}%` }}
                                      className={`h-full rounded-full ${zPct === 0 ? "bg-gray-200" : zPct < 50 ? "bg-amber-400" : zPct < 80 ? "bg-blue-500" : "bg-emerald-500"}`}
                                    />
                                  </div>
                                </div>
                                <Pill tone={zPct >= 80 ? "emerald" : zPct >= 50 ? "blue" : zPct > 0 ? "amber" : "red"}>
                                  {zPct}%
                                </Pill>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    {msg.data.suggestions && msg.data.suggestions.length > 0 && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Suggestions</p>
                        <ul className="space-y-1">
                          {msg.data.suggestions.map((s, i) => (
                            <li key={i} className="text-sm text-gray-600">→ {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center">
                <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
                <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
                <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
                <span className="ml-2 text-xs text-gray-400">Analyse en cours…</span>
              </div>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="border-t border-gray-200 bg-white p-3 sm:p-4">
        {messages.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_QUERIES.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={loading}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
              >
                {q.length > 40 ? q.slice(0, 38) + "…" : q}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
            placeholder="Posez une question sur l'avancement, les câbles, les zones…"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40"
            aria-label="Envoyer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-gray-400">Entrée pour envoyer · Maj+Entrée pour saut de ligne</p>
      </div>
    </div>
  );
}
