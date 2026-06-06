// supabase/functions/ai-cockpit/index.ts
// Cockpit IA métier — répond à des questions terrain en langage naturel.
// Contexte: liste journalière active, câble_events, incoming_messages récents.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, withCors } from "../_shared/cors.ts";

interface CockpitAnswer {
  summary: string;
  cables?: Array<{ code: string; status: string; note?: string }>;
  zones?:  Array<{ name: string; pct: number; total: number; confirmed: number }>;
  alerts?: string[];
  suggestions?: string[];
  action_required?: boolean;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(
  withCors(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey     = Deno.env.get("SUPABASE_ANON_KEY");
    const openaiKey   = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) return json(500, { error: "Missing Supabase env" });
    if (!openaiKey) return json(500, { error: "OPENAI_API_KEY not configured" });

    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader) return json(401, { error: "Missing Authorization" });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) return json(401, { error: "Invalid session" });

    const body = await req.json().catch(() => ({}));
    const question: string = (body.question ?? "").trim().slice(0, 500);
    if (!question) return json(400, { error: "Question manquante" });

    // ── Fetch context from DB ──────────────────────────────────────────────

    // 1. Latest daily list import
    const { data: latestImport } = await admin
      .from("daily_list_imports")
      .select("id, file_name, list_date, rows_count, status")
      .order("imported_at", { ascending: false })
      .limit(1)
      .single();

    // 2. List items with computed status (if import exists)
    let listItems: any[] = [];
    if (latestImport?.id) {
      const { data: items } = await admin
        .from("daily_list_items_with_status")
        .select("cable_code_normalized, perimetro, computed_status, last_event_at, last_actor, last_message")
        .eq("import_id", latestImport.id)
        .limit(500);
      listItems = items ?? [];
    }

    // 3. Recent cable events (last 48h)
    const since48h = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: recentEvents } = await admin
      .from("cable_events")
      .select("cable_code, event_kind, occurred_at, note, confidence")
      .gte("occurred_at", since48h)
      .order("occurred_at", { ascending: false })
      .limit(100);

    // 4. Recent unprocessed / problematic incoming messages
    const { data: recentMessages } = await admin
      .from("incoming_messages")
      .select("sender_name, text, cable_refs, classification, processed, message_ts")
      .order("message_ts", { ascending: false })
      .limit(30);

    // ── Build context summary ───────────────────────────────────────────────

    const statusCounts = { confirmed_field: 0, likely_laid: 0, to_verify: 0, no_evidence: 0, blocked: 0, missing: 0, outside_inca: 0 };
    const zoneMap: Record<string, { total: number; confirmed: number }> = {};

    for (const item of listItems) {
      const s = item.computed_status ?? "no_evidence";
      if (s in statusCounts) (statusCounts as any)[s]++;
      const zone = item.perimetro ?? "Inconnu";
      if (!zoneMap[zone]) zoneMap[zone] = { total: 0, confirmed: 0 };
      zoneMap[zone].total++;
      if (s === "confirmed_field" || s === "likely_laid") zoneMap[zone].confirmed++;
    }

    const total     = listItems.length;
    const done      = statusCounts.confirmed_field + statusCounts.likely_laid;
    const pct       = total > 0 ? Math.round((done / total) * 100) : 0;
    const noProof   = listItems.filter((i) => i.computed_status === "no_evidence");
    const toVerify  = listItems.filter((i) => i.computed_status === "to_verify");
    const blocked   = listItems.filter((i) => i.computed_status === "blocked" || i.computed_status === "missing");
    const zeroZones = Object.entries(zoneMap).filter(([, v]) => v.confirmed === 0 && v.total > 0).map(([n, v]) => ({ name: n, ...v }));

    // Cable events summary
    const eventsByKind: Record<string, number> = {};
    for (const ev of recentEvents ?? []) {
      eventsByKind[ev.event_kind] = (eventsByKind[ev.event_kind] ?? 0) + 1;
    }

    // Recent messages summary
    const unprocessedMessages = (recentMessages ?? []).filter((m) => !m.processed).length;
    const problematicCodes = (recentEvents ?? [])
      .filter((e) => e.event_kind === "CABLE_MANCANTE" || e.event_kind === "CABLE_CORTO" || e.event_kind === "CABLE_DA_CONTROLLARE")
      .map((e) => e.cable_code)
      .slice(0, 20);

    const contextText = `
=== CONTEXTE CHANTIER (${new Date().toLocaleString("fr-FR")}) ===

LISTE ACTIVE: ${latestImport ? `${latestImport.file_name} (${latestImport.list_date ?? "date ??"})` : "Aucune liste importée"}
TOTAL CABLES: ${total} | AVANCEMENT: ${pct}% (${done} confirmés)
- Confirmés: ${statusCounts.confirmed_field}
- Probables (Telegram/WA): ${statusCounts.likely_laid}
- À vérifier: ${statusCounts.to_verify}
- Sans preuve terrain: ${statusCounts.no_evidence}
- Bloqués/Manquants: ${statusCounts.blocked + statusCounts.missing}
- Zones à 0%: ${zeroZones.length} (${zeroZones.slice(0, 5).map((z) => z.name).join(", ")})

CÂBLES SANS PREUVE (premiers 20): ${noProof.slice(0, 20).map((i) => i.cable_code_normalized).join(", ") || "aucun"}
CÂBLES BLOQUÉS: ${blocked.slice(0, 10).map((i) => i.cable_code_normalized).join(", ") || "aucun"}
CÂBLES À VÉRIFIER: ${toVerify.slice(0, 10).map((i) => i.cable_code_normalized).join(", ") || "aucun"}

ÉVÉNEMENTS TERRAIN (48h): ${JSON.stringify(eventsByKind)}
CÂBLES PROBLÉMATIQUES (Telegram/48h): ${problematicCodes.join(", ") || "aucun"}
MESSAGES ENTRANTS NON CLASSIFIÉS: ${unprocessedMessages}

ZONES D'AVANCEMENT:
${Object.entries(zoneMap).slice(0, 20).map(([name, v]) => {
  const zpct = v.total > 0 ? Math.round((v.confirmed / v.total) * 100) : 0;
  return `  ${name}: ${zpct}% (${v.confirmed}/${v.total})`;
}).join("\n")}
`;

    // ── Call OpenAI ────────────────────────────────────────────────────────

    const systemPrompt = `Tu es l'IA Cockpit d'un chantier de cablage electrique (Trieste, Italie).
Tu aides le chef de chantier a prendre des decisions operationnelles en temps reel.
Le chantier pose des cables electriques dans un batiment industriel.
Les cables sont identifies par des codes (ex: "CCS 102", "N AH 173").
Le suivi se fait via des listes journalieres (PDF/Excel) et des messages Telegram des ouvriers.

Tu DOIS repondre en JSON valide avec cette structure:
{
  "summary": "<reponse principale en 2-4 phrases, directe et actionnable>",
  "cables": [{"code": "<code>", "status": "<statut>", "note": "<note optionnelle>"}],
  "zones": [{"name": "<zone>", "pct": <0-100>, "total": <n>, "confirmed": <n>}],
  "alerts": ["<alerte urgente>"],
  "suggestions": ["<suggestion actionnable>"],
  "action_required": <true si urgence, false sinon>
}

Regles:
- summary: toujours present, jamais vide, en francais, direct comme un contremaître
- cables: inclure uniquement si pertinent pour la question (liste de cables concernes)
- zones: inclure si la question porte sur l'avancement par zone
- alerts: uniquement si problemes urgents detectes
- suggestions: 2-3 suggestions concretes et actionnables
- action_required: true si des cables sont bloques, manquants ou si zones a 0%
- Status valides: confirmed_field, likely_laid, to_verify, no_evidence, blocked, missing, CABLE_POSATO, CABLE_MANCANTE, CABLE_CORTO, CABLE_DA_CONTROLLARE`;

    const userContent = `${contextText}\n\nQUESTION DU CHEF DE CHANTIER:\n${question}`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 1200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userContent },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return json(502, { error: `OpenAI ${resp.status}: ${errText.slice(0, 100)}` });
    }

    const aiData = await resp.json();
    const rawText: string = aiData.choices?.[0]?.message?.content ?? "{}";

    let answer: CockpitAnswer;
    try {
      answer = JSON.parse(rawText);
    } catch {
      answer = { summary: rawText, action_required: false };
    }

    // Enrich zones from DB if missing
    if (!answer.zones || answer.zones.length === 0) {
      const questionLower = question.toLowerCase();
      if (questionLower.includes("zone") || questionLower.includes("perimetre") || questionLower.includes("avancement")) {
        answer.zones = Object.entries(zoneMap)
          .map(([name, v]) => ({ name, pct: v.total > 0 ? Math.round((v.confirmed / v.total) * 100) : 0, total: v.total, confirmed: v.confirmed }))
          .sort((a, b) => a.pct - b.pct)
          .slice(0, 15);
      }
    }

    return json(200, answer);
  }),
);
