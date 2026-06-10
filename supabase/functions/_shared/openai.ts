// supabase/functions/_shared/openai.ts
// Appel OpenAI centralisé pour toutes les edge functions IA.
// Objectifs : déterminisme (temperature 0 par défaut), robustesse (retry + timeout),
// et gouvernance (modèles définis à un seul endroit).
//
// Les fonctions cron tournent sans humain devant l'écran : un appel qui pend ou
// un 429 transitoire ne doit jamais bloquer le batch ni perdre silencieusement
// des données.

export const MODELS = {
  vision:   "gpt-4o",        // OCR images terrain
  classify: "gpt-4o-mini",   // classification messages Telegram
  cockpit:  "gpt-4o-mini",   // assistant Q&A
} as const;

export interface ChatJSONOpts {
  apiKey: string;
  model: string;
  messages: unknown[];
  maxTokens?: number;
  temperature?: number;   // défaut 0 (extraction/classification = déterministe)
  timeoutMs?: number;     // défaut 45s
  retries?: number;       // défaut 2 (sur 429 / 5xx / réseau)
}

/**
 * Appelle l'API Chat Completions en mode JSON strict, avec timeout et retry
 * exponentiel sur les erreurs transitoires (429, 5xx, abort réseau).
 * Lève une erreur seulement après épuisement des tentatives.
 */
export async function chatJSON(opts: ChatJSONOpts): Promise<string> {
  const {
    apiKey, model, messages,
    maxTokens, temperature = 0, timeoutMs = 45_000, retries = 2,
  } = opts;

  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
          response_format: { type: "json_object" },
          messages,
        }),
      });

      // 429 / 5xx → erreurs transitoires : on retente
      if (resp.status === 429 || resp.status >= 500) {
        const body = await resp.text().catch(() => "");
        lastErr = new Error(`OpenAI ${resp.status}: ${body.slice(0, 150)}`);
        if (attempt < retries) { await backoff(attempt); continue; }
        throw lastErr;
      }
      // 4xx non transitoire (clé invalide, requête malformée) : inutile de retenter
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        throw new Error(`OpenAI ${resp.status}: ${body.slice(0, 150)}`);
      }

      const data = await resp.json();
      return data.choices?.[0]?.message?.content ?? "{}";
    } catch (e) {
      lastErr = e;
      // abort (timeout) ou erreur réseau : transitoire → retry
      const transient = e instanceof Error && (e.name === "AbortError" || /network|fetch/i.test(e.message));
      if (transient && attempt < retries) { await backoff(attempt); continue; }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error("OpenAI: échec inconnu");
}

function backoff(attempt: number): Promise<void> {
  // 0.8s, 1.6s, 3.2s …
  const ms = 800 * 2 ** attempt;
  return new Promise((r) => setTimeout(r, ms));
}
