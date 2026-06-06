// supabase/functions/parse-terrain-image/index.ts
// Lit les captures de liste envoyées sur Telegram avec GPT-4o Vision.
//
// Sémantique métier (corrigée): la COULEUR est PAR CELLULE et PAR APPARATO.
//   - Cellule APP-PARTENZA verte  => câble posé/raccordé SUR l'apparato de départ
//   - Cellule APP-ARRIVO verte    => câble posé/raccordé SUR l'apparato d'arrivée
//   - Rose => priorité sur cet apparato
//   - SITUAZIONE INCA reste la source de vérité du statut câble (on ne l'écrase pas).
//
// => On NE crée PAS de CABLE_POSATO automatique dans la liste.
//    La vision alimente uniquement le module Apparati (évolution terrain par
//    équipement) + vision_result pour relecture humaine.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, withCors } from "../_shared/cors.ts";

const IMAGE_BUCKET = "terrain-images";

type CellColor = "green" | "pink" | "none";

interface VisionRow {
  marca_pezzo:     string;
  app_partenza:    string | null;
  app_arrivo:      string | null;
  perimetro:       string | null;
  situazione_inca: string | null;
  marca_color:     CellColor;
  partenza_color:  CellColor;
  arrivo_color:    CellColor;
  note:            string | null;
}

interface VisionResult {
  list_number:  string | null;
  list_date:    string | null;
  rows:         VisionRow[];
  annotations:  string[];
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeCableCode(raw: string): string {
  const cleaned = (raw ?? "").trim().toUpperCase().replace(/[.\s]+/g, " ");
  const m = cleaned.match(/^([A-Z](?:\s*[A-Z]){0,4})\s*(\d{2,5})\s*([A-Z]?)$/);
  if (!m) return cleaned;
  const letters = m[1].replace(/\s+/g, "");
  return m[3] ? `${letters} ${m[2]} ${m[3]}` : `${letters} ${m[2]}`;
}

async function callVision(key: string, dataUrl: string): Promise<VisionResult> {
  const systemPrompt = [
    "Tu es un OCR expert de listes de cablage electrique (chantier Trieste, Italie).",
    "L'image est une capture d'une liste journaliere (tableau).",
    "Colonnes: LISTA, RISOLUZIONE LISTA, MARCA PEZZO, STATO COLLEGAMENTO,",
    "APP-PARTENZA, APP-ARRIVO, PERIMETRO, DATA PERIMETRO, SITUAZIONE INCA, NOTE.",
    "",
    "CODE COULEUR — CRITIQUE — analyse la couleur de fond de CHAQUE cellule SEPAREMENT.",
    "Pour chaque ligne, donne la couleur des 3 cellules MARCA PEZZO, APP-PARTENZA, APP-ARRIVO:",
    "- vert clair  => 'green'  (le cable a ete pose/raccorde SUR cet apparato precis)",
    "- rose/magenta => 'pink'  (priorite sur cet apparato)",
    "- blanc/aucune => 'none'",
    "Une cellule APP-PARTENZA peut etre verte alors que APP-ARRIVO est blanche: cela veut",
    "dire que le cable est raccorde cote depart mais pas encore cote arrivee. Sois precis.",
    "",
    "Recopie SITUAZIONE INCA exactement (ex: 'P','T','1','2','7' ou vide).",
    "Extrait AUSSI les annotations / texte libre hors tableau",
    "(ex: 'Cavi sistemati 06/06', 'C PC 004 da richiedere').",
    "",
    "Reponds en JSON strict:",
    "{",
    '  "list_number": "<numero ou null>",',
    '  "list_date": "<YYYY-MM-DD ou null>",',
    '  "rows": [',
    '    {"marca_pezzo":"C CS 503","app_partenza":"411001100001","app_arrivo":"415001120001",',
    '     "perimetro":"CMS","situazione_inca":"P",',
    '     "marca_color":"green","partenza_color":"green","arrivo_color":"none","note":null}',
    "  ],",
    '  "annotations": ["Cavi sistemati 06/06","C PC 004 da richiedere"]',
    "}",
    "Recopie les codes EXACTEMENT. Ne devine pas. Cellule vide => null.",
  ].join("\n");

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyse cette image de liste terrain. Pour chaque ligne donne la couleur de chaque cellule (marca, partenza, arrivo), le code INCA, plus les annotations." },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new Error(`OpenAI Vision ${resp.status}: ${err.slice(0, 150)}`);
  }

  const data = await resp.json();
  const text: string = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(text);
  return {
    list_number: parsed.list_number ?? null,
    list_date:   parsed.list_date ?? null,
    rows:        Array.isArray(parsed.rows) ? parsed.rows : [],
    annotations: Array.isArray(parsed.annotations) ? parsed.annotations : [],
  };
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
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) return json(401, { error: "Invalid session" });

    const body    = await req.json().catch(() => ({}));
    const dryRun  = body.dry_run === true;
    const limit   = Math.min(Number(body.limit ?? 5), 10);
    const oneId   = typeof body.message_id === "string" ? body.message_id : null;

    let q = admin
      .from("incoming_messages")
      .select("id, sender_name, message_ts, image_path")
      .not("image_path", "is", null)
      .order("message_ts", { ascending: false });
    q = oneId ? q.eq("id", oneId) : q.eq("vision_processed", false).limit(limit);

    const { data: rows, error: fErr } = await q;
    if (fErr) return json(500, { error: fErr.message });
    if (!rows || rows.length === 0) return json(200, { ok: true, processed: 0, message: "Aucune image à analyser" });

    const results: any[] = [];
    let snapshotsCreated = 0;
    const errors: string[] = [];

    for (const msg of rows) {
      try {
        const { data: blob, error: dErr } = await admin.storage.from(IMAGE_BUCKET).download(msg.image_path);
        if (dErr || !blob) { errors.push(`download ${msg.id}: ${dErr?.message}`); continue; }

        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        const chunk = 8192;
        for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        const b64    = btoa(binary);
        const ext    = (msg.image_path.split(".").pop() ?? "jpeg").toLowerCase();
        const mime   = ext === "jpg" ? "jpeg" : ext;
        const dataUrl = `data:image/${mime};base64,${b64}`;

        const vision = await callVision(openaiKey, dataUrl);
        const allCodes = vision.rows.map((r) => normalizeCableCode(r.marca_pezzo)).filter(Boolean);

        // ── Apparati: la couleur de la cellule APP indique l'état SUR cet apparato ──
        const eqMap: Record<string, { total: number; posati: number; priorita: number; states: any[] }> = {};
        const addEq = (eq: string | null, color: CellColor, code: string, perimetro: string | null, sit: string | null) => {
          if (!eq) return;
          const k = String(eq).trim().toUpperCase();
          if (!k) return;
          if (!eqMap[k]) eqMap[k] = { total: 0, posati: 0, priorita: 0, states: [] };
          eqMap[k].total++;
          if (color === "green") eqMap[k].posati++;
          if (color === "pink")  eqMap[k].priorita++;
          eqMap[k].states.push({ code, color, perimetro, sit_inca: sit });
        };
        for (const r of vision.rows) {
          const code = normalizeCableCode(r.marca_pezzo);
          addEq(r.app_partenza, r.partenza_color ?? "none", code, r.perimetro, r.situazione_inca);
          addEq(r.app_arrivo,   r.arrivo_color   ?? "none", code, r.perimetro, r.situazione_inca);
        }

        const posatiTotal   = vision.rows.filter((r) => r.marca_color === "green" || r.partenza_color === "green" || r.arrivo_color === "green").length;
        const priorityTotal = vision.rows.filter((r) => r.marca_color === "pink"  || r.partenza_color === "pink"  || r.arrivo_color === "pink").length;

        results.push({
          message_id:  msg.id,
          sender:      msg.sender_name,
          rows_found:  vision.rows.length,
          apparati:    Object.keys(eqMap).length,
          posato:      posatiTotal,
          priority:    priorityTotal,
          annotations: vision.annotations,
          sample:      vision.rows.slice(0, 8),
        });

        if (dryRun) continue;

        for (const [eq, v] of Object.entries(eqMap)) {
          const { error: snErr } = await admin.from("apparati_snapshots").insert({
            equipment_code:    eq,
            source_message_id: msg.id,
            occurred_at:       msg.message_ts,
            total_cables:      v.total,
            posati:            v.posati,
            priorita:          v.priorita,
            cable_states:      v.states,
            note:              vision.annotations.join(" · ") || null,
          });
          if (!snErr) snapshotsCreated++;
        }

        // On enrichit cable_refs + on archive la lecture vision, SANS toucher au
        // statut câble de la liste (SIT INCA reste la source de vérité).
        await admin.from("incoming_messages").update({
          vision_processed: true,
          vision_result: {
            list_number:  vision.list_number,
            list_date:    vision.list_date,
            rows_count:   vision.rows.length,
            apparati:     Object.keys(eqMap).length,
            posato:       posatiTotal,
            priority:     priorityTotal,
            annotations:  vision.annotations,
            rows:         vision.rows,
            parsed_at:    new Date().toISOString(),
          },
          cable_refs: allCodes,
        }).eq("id", msg.id);

      } catch (e) {
        errors.push(`msg ${msg.id}: ${String(e)}`);
      }
    }

    return json(200, {
      ok:                true,
      dry_run:           dryRun,
      processed:         results.length,
      snapshots_created: snapshotsCreated,
      results,
      errors: errors.slice(0, 20),
    });
  }),
);
