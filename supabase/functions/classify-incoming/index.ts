// supabase/functions/classify-incoming/index.ts
// Classifie les incoming_messages non traités via OpenAI gpt-4o-mini.
// Crée core_events + cable_events pour chaque câble identifié.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, withCors } from "../_shared/cors.ts";
import { chatJSON, MODELS } from "../_shared/openai.ts";
import { authenticateCaller } from "../_shared/auth.ts";

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

type ProofSourceType =
  | "telegram_text"
  | "telegram_photo"
  | "ocr_photo"
  | "manual_validation"
  | "imported_note"
  | "system_inference";

interface StructuredProof {
  raw_text: string;
  source: string;
  source_type: ProofSourceType;
  author: string | null;
  timestamp: string;
  extracted_cable_codes: string[];
  extracted_equipment_codes: string[];
  extracted_eswbs: string[];
  detected_position: "partenza" | "arrivo" | "entrambi" | "sconosciuto";
  detected_status: string;
  confidence: number;
  confidence_reason: string;
  requires_human_validation: boolean;
  recommended_action: string;
  incoherence_reason: string | null;
  event_kind: string;
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

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function extractEquipmentCodes(text: string): string[] {
  return Array.from(new Set((text.match(/\b\d{12}\b/g) ?? []).map((item) => item.trim())));
}

function readStructuredProof(row: IncomingRow): StructuredProof | null {
  const classification = asObject(row.classification);
  const sourceType = getString(classification.source_type) as ProofSourceType | null;
  const detectedStatus = getString(classification.detected_status);
  if (!sourceType || !detectedStatus) return null;

  return {
    raw_text: row.text ?? "",
    source: getString(classification.source) ?? "telegram",
    source_type: sourceType,
    author: row.sender_name,
    timestamp: row.message_ts,
    extracted_cable_codes: getStringArray(classification.extracted_cable_codes).length > 0
      ? getStringArray(classification.extracted_cable_codes)
      : row.cable_refs,
    extracted_equipment_codes: getStringArray(classification.extracted_equipment_codes),
    extracted_eswbs: getStringArray(classification.extracted_eswbs),
    detected_position: (getString(classification.detected_position) as StructuredProof["detected_position"]) ?? "sconosciuto",
    detected_status: detectedStatus,
    confidence: typeof classification.confidence === "number" ? classification.confidence : 0.5,
    confidence_reason: getString(classification.confidence_reason) ?? "Classificazione esistente mantenuta",
    requires_human_validation: classification.requires_human_validation === true,
    recommended_action: getString(classification.recommended_action) ?? "mantieni da validare",
    incoherence_reason: getString(classification.incoherence_reason),
    event_kind: getString(classification.event_kind) ?? "CABLE_MENTION",
  };
}

function buildProofFromAi(msg: IncomingRow, cls: AIResult): StructuredProof {
  const text = msg.text ?? "";
  const lower = text.toLowerCase();
  const hasDeparture = /\bpartenza\b/.test(lower);
  const hasArrival = /\barrivo\b/.test(lower);
  const detectedPosition =
    hasDeparture && hasArrival ? "entrambi" :
    hasDeparture ? "partenza" :
    hasArrival ? "arrivo" :
    "sconosciuto";

  let detectedStatus = "Da validare";
  let recommendedAction = "mantieni da validare";
  let confidenceReason = "Classificazione OpenAI usata solo come supporto";

  if (cls.kind === "CABLE_MANCANTE") {
    detectedStatus = "Non trovato";
    recommendedAction = "ricontrolla in campo";
    confidenceReason = "Messaggio classificato come cavo mancante o non trovato";
  } else if (cls.kind === "CABLE_CORTO") {
    detectedStatus = "Da validare";
    recommendedAction = "ricontrolla in campo";
    confidenceReason = "Segnale di cavo corto, non sufficiente per chiudere";
  } else if (cls.kind === "CABLE_DA_CONTROLLARE") {
    detectedStatus = "Da validare";
    recommendedAction = "chiedi conferma al team";
    confidenceReason = "Messaggio da controllare o ambiguo";
  } else if (cls.kind === "CABLE_POSATO") {
    detectedStatus =
      detectedPosition === "entrambi" ? "Trovato a entrambi" :
      detectedPosition === "partenza" ? "Trovato a partenza" :
      detectedPosition === "arrivo" ? "Trovato a arrivo" :
      "Da validare";
    recommendedAction = "valida prova";
    confidenceReason = "Messaggio positivo, ma richiede comunque conferma del capo";
  }

  return {
    raw_text: text,
    source: "telegram",
    source_type: "telegram_text",
    author: msg.sender_name,
    timestamp: msg.message_ts,
    extracted_cable_codes: msg.cable_refs,
    extracted_equipment_codes: extractEquipmentCodes(text),
    extracted_eswbs: extractEquipmentCodes(text),
    detected_position: detectedPosition,
    detected_status: detectedStatus,
    confidence: Math.min(cls.confidence, 0.9),
    confidence_reason: confidenceReason,
    requires_human_validation: true,
    recommended_action: recommendedAction,
    incoherence_reason: null,
    event_kind: CABLE_KINDS.has(cls.kind) ? cls.kind : "CABLE_MENTION",
  };
}

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

  // temperature 0 (défaut chatJSON) : la classification doit être déterministe ;
  // retry + timeout intégrés (le cron tourne sans humain devant l'écran).
  const text = await chatJSON({
    apiKey: key,
    model: MODELS.classify,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: `Messages à analyser:\n${msgList}` },
    ],
  });
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

    // Auth : cron (service-role) en mode système, ou bouton manuel (JWT user).
    const auth = await authenticateCaller(req, supabaseUrl, anonKey, serviceKey);
    if (!auth.ok) return json(auth.status, { ok: false, error: auth.error });

    const admin = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: `Bearer ${serviceKey}` } },
      auth: { persistSession: false },
    });

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
    // Messages dont l'appel API a échoué (après retries) : on NE les marque PAS
    // processed → le prochain run cron les reprendra. Sans ça, un vrai
    // "CCS 102 posato" reçu pendant un hoquet OpenAI serait perdu pour toujours.
    const failedIds = new Set<string>();

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      try {
        const results = await callOpenAI(openaiKey, batch);
        allResults.push(...results);
      } catch (e) {
        apiErrors.push(String(e));
        for (const m of batch) failedIds.add(m.id);
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
    let skippedCount   = 0;
    const writeErrors: string[] = [];

    for (const msg of messages) {
      // Échec API → on laisse processed=false pour le prochain run cron.
      if (failedIds.has(msg.id)) { skippedCount++; continue; }

      const cls = resultMap.get(msg.id) ?? {
        id: msg.id, kind: "GENERAL_MESSAGE", confidence: 0.2, note: null,
      };
      const existingProof = readStructuredProof(msg);
      const aiProof = buildProofFromAi(msg, cls);
      const effectiveProof = existingProof ?? aiProof;
      const kind = CABLE_KINDS.has(effectiveProof.event_kind) ? effectiveProof.event_kind : "GENERAL_MESSAGE";
      const cableRefs = msg.cable_refs;
      let firstCoreEventId: string | null = null;

      try {
        if (!existingProof && CABLE_KINDS.has(kind) && kind !== "GENERAL_MESSAGE" && cableRefs.length > 0) {
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
                confidence:            effectiveProof.confidence,
                raw_text:              msg.text,
                validation_status:     "pending",
                payload:               {
                  sender: msg.sender_name,
                  classified_by: "openai-gpt4o-mini",
                  proof: { ...effectiveProof, extracted_cable_codes: [cableCode] },
                },
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
              confidence:        effectiveProof.confidence,
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
          ...effectiveProof,
          event_kind:    kind,
          confidence:    effectiveProof.confidence,
          note:          cls.note,
          classified_by: "openai-gpt4o-mini",
          classified_at: new Date().toISOString(),
          ai_support_only: true,
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
      mode:           auth.mode,
      total:          messages.length,
      processed:      processedCount,
      skipped:        skippedCount,   // API échouée → repris au prochain run cron
      events_created: eventsCreated,
      errors:         [...apiErrors, ...writeErrors].slice(0, 20),
    });
  }),
);
