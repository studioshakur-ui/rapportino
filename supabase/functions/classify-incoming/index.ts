// supabase/functions/classify-incoming/index.ts
// Classifie les incoming_messages non traités via OpenAI gpt-4o-mini.
// Crée core_events + cable_events pour chaque câble identifié.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, withCors } from "../_shared/cors.ts";

interface IncomingRow {
  id: string;
  sender_name: string | null;
  message_ts: string;
  message_type: string | null;
  text: string | null;
  cable_refs: string[];
  classification: Record<string, unknown>;
}

interface AIResult {
  id: string;
  kind: string;
  confidence: number;
  note: string | null;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CABLE_KINDS = new Set([
  "CABLE_POSATO",
  "CABLE_SFILATO",
  "CABLE_LASATO",
  "CABLE_CORTO",
  "CABLE_MANCANTE",
  "CABLE_DA_CONTROLLARE",
  "CABLE_MENTION",
]);

async function callOpenAI(key: string, batch: IncomingRow[]): Promise<AIResult[]> {
  const msgList = batch
    .map((m) => {
      const refs = m.cable_refs.length > 0
        ? `\nCodes câbles déjà extraits: ${m.cable_refs.join(", ")}`
        : "";
      const txt = (m.text ?? "").slice(0, 400);
      return `ID: ${m.id}\nAuteur: ${m.sender_name ?? "?"}\nType: ${m.message_type ?? "text"}\nTexte: ${txt}${refs}`;
    })
    .join("\n---\n");

  const systemPrompt = `Tu es un assistant d'analyse de messages de chantier câblage électrique (Trieste, Italie).
Messages d'ouvriers sur Telegram. Langue principale: italien, parfois mélangé français/bengali.

Classifie chaque message parmi ces types EXCLUSIVEMENT:
- CABLE_POSATO   : câble posé/tiré/terminé (posato, fatto, finito, 100%, ok après liste de câbles, tirato, completato)
- CABLE_SFILATO  : câble retiré (sfilato, espilato, tolto)
- CABLE_CORTO    : câble trop court (corto, manca metri, non arriva, poco)
- CABLE_MANCANTE : câble manquant/à trouver (manca, non trovato, da trovare, cerca)
- CABLE_DA_CONTROLLARE : à vérifier/erreur (sbagliato, controllare, problema, errore, ricontrollare)
- CABLE_MENTION  : mention de câble sans action précise (liste seule sans indicateur d'état)
- GENERAL_MESSAGE: message social sans action terrain (salutations, oui/non, émojis seuls, remerciements, "ciao", "grazie", "ok", "okay", photos seules, #today, test)

Règles critiques:
1. Liste de câbles + "100%" ou "ok" ou "fatto" ou "finito" → CABLE_POSATO
2. Liste de câbles seule SANS indicateur d'état → CABLE_MENTION
3. "sbagliato" (erreur commise) → CABLE_DA_CONTROLLARE
4. "da trovare" / "non trovato" → CABLE_MANCANTE
5. Message purement social (ciao, grazie, 👍, 🙄, test, #today) → GENERAL_MESSAGE
6. Photo seule → GENERAL_MESSAGE
7. note = résumé EN FRANÇAIS de l'action terrain, null si GENERAL_MESSAGE

Réponds en JSON valide uniquement, format:
{"results":[{"id":"<exact_uuid>","kind":"<KIND>","confidence":<0.0-1.0>,"note":<"phrase"|null>}]}`;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: `Messages à analyser:\n${msgList}` },
      ],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "(unreadable)");
    throw new Error(`OpenAI API ${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = await resp.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(text);
  return (parsed.results ?? []) as AIResult[];
}

serve(
  withCors(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY");
    const openaiKey   = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json(500, { ok: false, error: "Missing Supabase env vars" });
    }
    if (!openaiKey) {
      return json(500, { ok: false, error: "OPENAI_API_KEY not configured in Supabase secrets" });
    }

    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader) return json(401, { ok: false, error: "Missing Authorization header" });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const admin = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: `Bearer ${serviceKey}` } },
      auth: { persistSession: false },
    });

    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) return json(401, { ok: false, error: "Invalid session" });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;
    const limit  = Math.min(Number(body.limit ?? 50), 100);

    const { data: rows, error: fetchErr } = await admin
      .from("incoming_messages")
      .select("id, sender_name, message_ts, message_type, text, cable_refs, classification")
      .eq("processed", false)
      .not("text", "is", null)
      .order("message_ts", { ascending: true })
      .limit(limit);

    if (fetchErr) return json(500, { ok: false, error: fetchErr.message });

    const messages: IncomingRow[] = (rows ?? [])
      .filter((r: any) => r.text && r.text.trim().length > 0)
      .map((r: any) => ({
        id:             r.id,
        sender_name:    r.sender_name ?? null,
        message_ts:     r.message_ts,
        message_type:   r.message_type ?? null,
        text:           r.text,
        cable_refs:     Array.isArray(r.cable_refs) ? r.cable_refs : [],
        classification: (r.classification && typeof r.classification === "object") ? r.classification : {},
      }));

    if (messages.length === 0) {
      return json(200, { ok: true, processed: 0, events_created: 0, message: "No unprocessed messages" });
    }

    // Batch OpenAI calls — 10 messages per call
    const BATCH_SIZE = 10;
    const allResults: AIResult[] = [];
    const apiErrors: string[] = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      try {
        const results = await callOpenAI(openaiKey, batch);
        allResults.push(...results);
      } catch (e) {
        apiErrors.push(String(e));
        for (const m of batch) {
          allResults.push({ id: m.id, kind: "GENERAL_MESSAGE", confidence: 0.1, note: null });
        }
      }
    }

    const resultMap = new Map<string, AIResult>();
    for (const r of allResults) resultMap.set(r.id, r);

    if (dryRun) {
      return json(200, {
        ok: true,
        dry_run: true,
        total: messages.length,
        classifications: messages.map((m) => ({
          id:          m.id,
          sender:      m.sender_name,
          text_sample: (m.text ?? "").slice(0, 80),
          cables:      m.cable_refs,
          ...resultMap.get(m.id),
        })),
        api_errors: apiErrors,
      });
    }

    let eventsCreated  = 0;
    let processedCount = 0;
    const writeErrors: string[] = [];

    for (const msg of messages) {
      const cls = resultMap.get(msg.id) ?? {
        id: msg.id, kind: "GENERAL_MESSAGE", confidence: 0.2, note: null,
      };
      const kind = CABLE_KINDS.has(cls.kind) ? cls.kind : "GENERAL_MESSAGE";
      const cableRefs = msg.cable_refs;
      let firstCoreEventId: string | null = null;

      try {
        if (CABLE_KINDS.has(kind) && kind !== "GENERAL_MESSAGE") {
          for (const cableCode of cableRefs) {
            const { data: ce, error: ceErr } = await admin
              .from("core_events")
              .insert({
                event_type:            kind,
                occurred_at:           msg.message_ts,
                source:                "telegram",
                source_message_id:     msg.id,
                cable_code_raw:        cableCode,
                cable_code_normalized: cableCode,
                confidence:            cls.confidence,
                raw_text:              msg.text,
                validation_status:     "pending",
                payload:               { sender: msg.sender_name, classified_by: "openai-gpt4o-mini" },
              })
              .select("id")
              .single();

            if (ceErr || !ce?.id) {
              writeErrors.push(`core_events for ${cableCode}: ${ceErr?.message}`);
              continue;
            }

            if (!firstCoreEventId) firstCoreEventId = ce.id;

            const noteText = cls.note
              ? `${msg.sender_name ?? ""}: ${cls.note}`
              : (msg.sender_name ?? null);

            const { error: evErr } = await admin.from("cable_events").insert({
              core_event_id:     ce.id,
              cable_code:        cableCode,
              event_kind:        kind,
              occurred_at:       msg.message_ts,
              source_message_id: msg.id,
              confidence:        cls.confidence,
              note:              noteText,
            });

            if (evErr) {
              writeErrors.push(`cable_events for ${cableCode}: ${evErr.message}`);
            } else {
              eventsCreated++;
            }
          }
        }

        const mergedClassification = {
          ...msg.classification,
          event_kind:    kind,
          confidence:    cls.confidence,
          note:          cls.note,
          classified_by: "openai-gpt4o-mini",
          classified_at: new Date().toISOString(),
        };

        const updatePayload: Record<string, unknown> = {
          processed:      true,
          classification: mergedClassification,
        };
        if (firstCoreEventId) updatePayload.core_event_id = firstCoreEventId;

        await admin
          .from("incoming_messages")
          .update(updatePayload)
          .eq("id", msg.id);

        processedCount++;
      } catch (e) {
        writeErrors.push(`msg ${msg.id}: ${String(e)}`);
      }
    }

    return json(200, {
      ok:             true,
      total:          messages.length,
      processed:      processedCount,
      events_created: eventsCreated,
      errors:         [...apiErrors, ...writeErrors].slice(0, 20),
    });
  }),
);
