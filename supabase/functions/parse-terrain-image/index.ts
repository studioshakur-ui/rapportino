// supabase/functions/parse-terrain-image/index.ts
// Lit les captures de liste envoyées sur Telegram avec GPT-4o Vision.
// Couleur verte = câble posé, rose = priorité. Extrait le tableau + annotations,
// met à jour la liste (cable_events) et alimente le module Apparati.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, withCors } from "../_shared/cors.ts";

const IMAGE_BUCKET = "terrain-images";

interface VisionRow {
  marca_pezzo:     string;
  app_partenza:    string | null;
  app_arrivo:      string | null;
  perimetro:       string | null;
  situazione_inca: string | null;
  state:           "posato" | "priority" | "none";
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

// Normalise "C CS 503" → "CCS 503" (même logique que le parser de liste)
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
    "L'image est une capture d'une liste journaliere (tableau) ou une photo terrain.",
    "Colonnes typiques: LISTA, RISOLUZIONE LISTA, MARCA PEZZO, STATO COLLEGAMENTO,",
    "APP-PARTENZA, APP-ARRIVO, PERIMETRO, DATA PERIMETRO, SITUAZIONE INCA, NOTE.",
    "",
    "CODE COULEUR CRITIQUE (regarde la couleur de fond de chaque cellule):",
    "- Cellule VERTE (vert clair) = cable POSE/installe => state: 'posato'",
    "- Cellule ROSE/MAGENTA = PRIORITE ou probleme => state: 'priority'",
    "- Cellule blanche/sans couleur => state: 'none'",
    "Le code couleur peut etre sur la cellule MARCA PEZZO, APP-PARTENZA ou APP-ARRIVO.",
    "Si MARCA PEZZO est vert => le cable est pose. Si rose => priorite.",
    "",
    "Extrait AUSSI les annotations manuscrites ou texte libre hors tableau",
    "(ex: 'Cavi sistemati 06/06', 'C PC 004 da richiedere').",
    "",
    "Reponds en JSON strict:",
    "{",
    '  "list_number": "<numero liste ou null>",',
    '  "list_date": "<YYYY-MM-DD ou null>",',
    '  "rows": [',
    '    {"marca_pezzo":"C CS 503","app_partenza":"411001100001","app_arrivo":"415001120001","perimetro":"CMS","situazione_inca":"P","state":"posato","note":null}',
    "  ],",
    '  "annotations": ["Cavi sistemati 06/06","C PC 004 da richiedere"]',
    "}",
    "Recopie les codes EXACTEMENT comme lus. Ne devine pas. Si une cellule est vide, met null.",
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
            { type: "text", text: "Analyse cette image de liste terrain. Extrait toutes les lignes avec leur etat couleur, plus les annotations." },
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

    // Fetch target messages (with an unparsed image)
    let q = admin
      .from("incoming_messages")
      .select("id, sender_name, message_ts, image_path, cable_refs, classification")
      .not("image_path", "is", null)
      .order("message_ts", { ascending: false });
    q = oneId ? q.eq("id", oneId) : q.eq("vision_processed", false).limit(limit);

    const { data: rows, error: fErr } = await q;
    if (fErr) return json(500, { error: fErr.message });
    if (!rows || rows.length === 0) return json(200, { ok: true, processed: 0, message: "Aucune image à analyser" });

    const results: any[] = [];
    let eventsCreated = 0;
    let snapshotsCreated = 0;
    const errors: string[] = [];

    for (const msg of rows) {
      try {
        // Download image bytes → base64 data URL
        const { data: blob, error: dErr } = await admin.storage.from(IMAGE_BUCKET).download(msg.image_path);
        if (dErr || !blob) { errors.push(`download ${msg.id}: ${dErr?.message}`); continue; }

        const bytes  = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64    = btoa(binary);
        const ext    = (msg.image_path.split(".").pop() ?? "jpeg").toLowerCase();
        const mime   = ext === "jpg" ? "jpeg" : ext;
        const dataUrl = `data:image/${mime};base64,${b64}`;

        const vision = await callVision(openaiKey, dataUrl);

        const posatoCodes  = vision.rows.filter((r) => r.state === "posato").map((r) => normalizeCableCode(r.marca_pezzo)).filter(Boolean);
        const priorityCodes = vision.rows.filter((r) => r.state === "priority").map((r) => normalizeCableCode(r.marca_pezzo)).filter(Boolean);
        const allCodes     = vision.rows.map((r) => normalizeCableCode(r.marca_pezzo)).filter(Boolean);

        results.push({
          message_id:  msg.id,
          sender:      msg.sender_name,
          rows_found:  vision.rows.length,
          posato:      posatoCodes.length,
          priority:    priorityCodes.length,
          annotations: vision.annotations,
          sample:      vision.rows.slice(0, 8),
        });

        if (dryRun) continue;

        // ── Write CABLE_POSATO events for green cables ──────────────────────
        for (const code of posatoCodes) {
          const { data: ce, error: ceErr } = await admin
            .from("core_events")
            .insert({
              event_type:            "CABLE_POSATO",
              occurred_at:           msg.message_ts,
              source:                "telegram-vision",
              source_message_id:     msg.id,
              cable_code_raw:        code,
              cable_code_normalized: code,
              confidence:            0.85,
              validation_status:     "pending",
              raw_text:              `Image liste: ${code} marqué posé (vert)`,
              payload:               { sender: msg.sender_name, classified_by: "gpt-4o-vision", state: "posato" },
            })
            .select("id").single();
          if (ceErr || !ce) { errors.push(`core_events ${code}: ${ceErr?.message}`); continue; }

          const { error: evErr } = await admin.from("cable_events").insert({
            core_event_id:     ce.id,
            cable_code:        code,
            event_kind:        "CABLE_POSATO",
            occurred_at:       msg.message_ts,
            source_message_id: msg.id,
            confidence:        0.85,
            note:              `${msg.sender_name ?? "Terrain"}: posé (image liste)`,
          });
          if (evErr) { errors.push(`cable_events ${code}: ${evErr.message}`); continue; }
          eventsCreated++;

          // Link to daily list items carrying this code
          const { data: items } = await admin
            .from("daily_list_items")
            .select("id, import_id")
            .eq("cable_code_normalized", code)
            .limit(200);
          if (items && items.length > 0) {
            await admin.from("daily_list_item_events").insert(
              items.map((it: any) => ({
                import_id:             it.import_id,
                daily_list_item_id:    it.id,
                cable_code_normalized: code,
                cable_event_id:        ce.id,
                core_event_id:         ce.id,
                source_type:           "cable_event",
                event_kind:            "CABLE_POSATO",
                occurred_at:           msg.message_ts,
                actor_label:           msg.sender_name ?? "Terrain",
                raw_note:              "Image liste (vision)",
                confidence:            0.85,
                progress_percent:      100,
              })),
            );
          }
        }

        // ── Apparati snapshots — évolution terrain par équipement ───────────
        const eqMap: Record<string, { total: number; posati: number; priorita: number; states: any[] }> = {};
        for (const r of vision.rows) {
          const code = normalizeCableCode(r.marca_pezzo);
          for (const eq of [r.app_partenza, r.app_arrivo]) {
            if (!eq) continue;
            const k = eq.trim().toUpperCase();
            if (!eqMap[k]) eqMap[k] = { total: 0, posati: 0, priorita: 0, states: [] };
            eqMap[k].total++;
            if (r.state === "posato")   eqMap[k].posati++;
            if (r.state === "priority") eqMap[k].priorita++;
            eqMap[k].states.push({ code, state: r.state, perimetro: r.perimetro });
          }
        }
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

        // ── Update incoming_messages with the vision result ─────────────────
        await admin.from("incoming_messages").update({
          vision_processed: true,
          vision_result: {
            list_number: vision.list_number,
            list_date:   vision.list_date,
            rows_count:  vision.rows.length,
            posato:      posatoCodes,
            priority:    priorityCodes,
            annotations: vision.annotations,
            parsed_at:   new Date().toISOString(),
          },
          cable_refs: allCodes,
          processed:  true,
        }).eq("id", msg.id);

      } catch (e) {
        errors.push(`msg ${msg.id}: ${String(e)}`);
      }
    }

    return json(200, {
      ok:                true,
      dry_run:           dryRun,
      processed:         results.length,
      events_created:    eventsCreated,
      snapshots_created: snapshotsCreated,
      results,
      errors: errors.slice(0, 20),
    });
  }),
);
