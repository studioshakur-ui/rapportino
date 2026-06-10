// supabase/functions/parse-terrain-image/index.ts
// Lit les captures de liste envoyées sur Telegram avec GPT-4o Vision.
//
// Sémantique métier (v3 — corrigée après analyse des vraies images):
//
// COULEUR SUR MARCA PEZZO = date de pose du câble, décodée via la légende
// en bas de l'image (ex: vert="Cavi sistemati 03/06", bleu="04/06", rose="05/06").
// => laid_date = YYYY-MM-DD si cellule colorée, null sinon.
//
// COULEUR SUR APP-PARTENZA / APP-ARRIVO = cet apparato est mis en évidence
// (priorité ou groupe de date). Tracké via partenza_highlighted/arrivo_highlighted.
//
// PRIORITÉ = colonne NOTE contient "PRIORITA" (ex: "PRIORITA' ASSOLUTA LATO RACK B").
// Ce n'est PAS la couleur qui indique la priorité.
//
// => On n'écrase pas SITUAZIONE INCA (source de vérité câble).
// => Vision alimente uniquement apparati_snapshots + vision_result pour relecture humaine.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, withCors } from "../_shared/cors.ts";
import { chatJSON, MODELS } from "../_shared/openai.ts";
import { authenticateCaller } from "../_shared/auth.ts";

const IMAGE_BUCKET = "terrain-images";

interface VisionRow {
  marca_pezzo:          string;
  laid_date:            string | null;   // YYYY-MM-DD si cellule MARCA colorée selon légende
  app_partenza:         string | null;
  app_arrivo:           string | null;
  perimetro:            string | null;
  situazione_inca:      string | null;
  partenza_highlighted: boolean;         // cellule APP-PARTENZA a un fond coloré
  arrivo_highlighted:   boolean;         // cellule APP-ARRIVO a un fond coloré
  priority_zone:        string | null;   // texte "PRIORITA ASSOLUTA…" de la colonne NOTE
  note:                 string | null;   // autres notes libres
}

interface ColorLegendEntry {
  color: string;
  date:  string;
}

interface VisionResult {
  list_number:  string | null;
  list_date:    string | null;
  color_legend: ColorLegendEntry[];
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

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));
}

async function callVision(key: string, dataUrl: string): Promise<VisionResult> {
  const systemPrompt = [
    "Tu es un OCR expert de listes de cablage electrique (chantier Trieste, Italie).",
    "L'image est une capture d'une liste journaliere (tableau).",
    "Colonnes: LISTA, RISOLUZIONE LISTA, MARCA PEZZO, STATO COLLEGAMENTO,",
    "APP-PARTENZA, APP-ARRIVO, PERIMETRO, DATA PERIMETRO, SITUAZIONE INCA, NOTE.",
    "",
    "=== ETAPE 1 — LEGENDE DES COULEURS (en bas de la page) ===",
    "Cherche les rectangles/taches de couleur avec du texte (ex: 'Cavi sistemati 03/06').",
    "Chaque couleur = une date de pose des cables. Construis color_legend:",
    "  [{\"color\":\"vert\",\"date\":\"2026-06-03\"},{\"color\":\"bleu ciel\",\"date\":\"2026-06-04\"},{\"color\":\"rose\",\"date\":\"2026-06-05\"}]",
    "Si aucune legende visible => color_legend=[].",
    "",
    "=== ETAPE 2 — LIGNES DU TABLEAU ===",
    "Pour chaque ligne de cable:",
    "- marca_pezzo: code exact (ex: 'C CS 503', 'I RS 001', 'W TI 034')",
    "- laid_date: si la cellule MARCA PEZZO a un fond COLORE (pas blanc), identifie la couleur,",
    "  cherche-la dans color_legend, retourne la date YYYY-MM-DD correspondante.",
    "  Si fond blanc/transparent ou aucune legende => null.",
    "- app_partenza: code exact 12 chiffres ou null",
    "- app_arrivo: code exact 12 chiffres ou null",
    "- partenza_highlighted: true si la cellule APP-PARTENZA a un fond colore (rose, bleu, vert, etc.)",
    "- arrivo_highlighted: true si la cellule APP-ARRIVO a un fond colore (rose, bleu, vert, etc.)",
    "- perimetro: valeur exacte ou null",
    "- situazione_inca: valeur exacte (P, T, 1, 2, 7...) ou null. Recopie exactement.",
    "- priority_zone: si la colonne NOTE contient le mot 'PRIORITA' => recopie le texte complet",
    "  (ex: 'PRIORITA ASSOLUTA LATO RACK B DATA CENTER C1'), sinon null",
    "- note: autres textes libres de la colonne NOTE (hors PRIORITA), null si vide",
    "",
    "=== ETAPE 3 — ANNOTATIONS LIBRES ===",
    "Texte hors tableau (ex: 'C PC 004 da richiedere', 'cavo corto da cambiare').",
    "Ne pas inclure les legendes de couleur dans annotations.",
    "",
    "REGLES IMPORTANTES:",
    "- Ne confonds pas le fond blanc normal avec une couleur de cellule.",
    "- Recopie les codes EXACTEMENT (ex: '411001100001', pas '41100110001').",
    "- Cellule vide => null. Ne devine pas.",
    "- Les couleurs de fond peuvent etre: vert clair, vert vif, bleu ciel, bleu roi,",
    "  rose/magenta, jaune, orange. Blanc = pas de couleur.",
    "",
    "JSON strict:",
    "{",
    "  \"list_number\": \"<numero ou null>\",",
    "  \"list_date\": \"<YYYY-MM-DD ou null>\",",
    "  \"color_legend\": [{\"color\":\"vert\",\"date\":\"2026-06-03\"},{\"color\":\"bleu ciel\",\"date\":\"2026-06-04\"}],",
    "  \"rows\": [",
    "    {\"marca_pezzo\":\"C CS 503\",\"laid_date\":\"2026-06-05\",",
    "     \"app_partenza\":\"411001100001\",\"app_arrivo\":\"415001120001\",",
    "     \"partenza_highlighted\":false,\"arrivo_highlighted\":true,",
    "     \"perimetro\":\"CMS\",\"situazione_inca\":\"P\",",
    "     \"priority_zone\":\"PRIORITA ASSOLUTA LATO RACK B DATA CENTER C1\",\"note\":null}",
    "  ],",
    "  \"annotations\": [\"C PC 004 da richiedere\"]",
    "}",
  ].join("\n");

  // temperature 0 (défaut) : la lecture d'un tableau doit être reproductible ;
  // retry + timeout 60s intégrés (la vision est plus lente, le cron est sans humain).
  const text = await chatJSON({
    apiKey: key,
    model: MODELS.vision,
    maxTokens: 4096,
    timeoutMs: 60_000,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyse cette liste terrain. Etape 1: lis la legende des couleurs en bas. Etape 2: pour chaque ligne, detecte la couleur de fond de MARCA PEZZO et mappe-la sur la legende pour obtenir laid_date. Detecte aussi les APP-PARTENZA/APP-ARRIVO colores et le texte PRIORITA dans NOTE.",
          },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      },
    ],
  });
  const parsed = JSON.parse(text);
  return {
    list_number:  parsed.list_number ?? null,
    list_date:    parsed.list_date ?? null,
    color_legend: Array.isArray(parsed.color_legend) ? parsed.color_legend : [],
    rows:         Array.isArray(parsed.rows) ? parsed.rows : [],
    annotations:  Array.isArray(parsed.annotations) ? parsed.annotations : [],
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

    // Auth : cron (service-role) en mode système, ou bouton manuel (JWT user).
    const auth = await authenticateCaller(req, supabaseUrl, anonKey, serviceKey);
    if (!auth.ok) return json(auth.status, { error: auth.error });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const body   = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;
    const limit  = Math.min(Number(body.limit ?? 5), 10);
    const oneId  = typeof body.message_id === "string" ? body.message_id : null;

    let q = admin
      .from("incoming_messages")
      .select("id, sender_name, message_ts, image_path, classification")
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
        const b64     = btoa(binary);
        const ext     = (msg.image_path.split(".").pop() ?? "jpeg").toLowerCase();
        const mime    = ext === "jpg" ? "jpeg" : ext;
        const dataUrl = `data:image/${mime};base64,${b64}`;

        const vision = await callVision(openaiKey, dataUrl);
        const allCodes = vision.rows.map((r) => normalizeCableCode(r.marca_pezzo)).filter(Boolean);
        const equipmentCodes = uniqueStrings(
          vision.rows.flatMap((row) => [row.app_partenza, row.app_arrivo])
        );
        const isLowConfidence = vision.rows.length > 0 && allCodes.length > 0 && allCodes.length < Math.ceil(vision.rows.length / 2);
        const ocrStatus = vision.rows.length === 0
          ? "OCR fallito"
          : allCodes.length === 0
            ? "Cavo non riconosciuto"
            : isLowConfidence
              ? "Bassa confidenza"
              : "OCR riuscito";
        const confidence = vision.rows.length === 0
          ? 0.2
          : allCodes.length === 0
            ? 0.35
            : isLowConfidence
              ? 0.48
            : Math.min(0.82, 0.5 + Math.min(allCodes.length, 4) * 0.08);
        const confidenceReason = vision.rows.length === 0
          ? "Nessuna riga leggibile nella foto"
          : allCodes.length === 0
            ? "OCR completato ma senza codice cavo affidabile"
            : isLowConfidence
              ? "OCR parziale: alcune righe lette ma non abbastanza per fidarsi"
            : "Codici cavo ed apparati letti dalla foto, verifica umana ancora richiesta";
        const recommendedAction = allCodes.length === 0
          ? "associa a cavo"
          : "valida prova";
        const classificationPatch = {
          source_type: "ocr_photo",
          event_kind: "CABLE_MENTION",
          detected_position: "sconosciuto",
          detected_status: ocrStatus === "OCR riuscito" ? "Da validare" : ocrStatus,
          confidence,
          confidence_reason: confidenceReason,
          requires_human_validation: true,
          recommended_action: recommendedAction,
          extracted_cable_codes: allCodes,
          extracted_equipment_codes: equipmentCodes,
          extracted_eswbs: equipmentCodes,
          ocr_status: ocrStatus,
          incoherence_reason: null,
        };

        // Cables posés = MARCA PEZZO colorée (laid_date non null)
        const posatiTotal   = vision.rows.filter((r) => r.laid_date !== null).length;
        // Priorité = NOTE contient "PRIORITA"
        const priorityTotal = vision.rows.filter((r) => r.priority_zone !== null).length;

        // ── Apparati: per-equipment tracking ──────────────────────────────
        const eqMap: Record<string, { total: number; posati: number; priorita: number; states: any[] }> = {};

        const addEq = (
          eq:          string | null,
          laidDate:    string | null,
          isPriority:  boolean,
          code:        string,
          highlighted: boolean,
          perimetro:   string | null,
          sit:         string | null,
          pzone:       string | null,
        ) => {
          if (!eq) return;
          const k = String(eq).trim().toUpperCase();
          if (!k) return;
          if (!eqMap[k]) eqMap[k] = { total: 0, posati: 0, priorita: 0, states: [] };
          eqMap[k].total++;
          if (laidDate)   eqMap[k].posati++;
          if (isPriority) eqMap[k].priorita++;
          eqMap[k].states.push({ code, laid_date: laidDate, highlighted, perimetro, sit_inca: sit, priority_zone: pzone });
        };

        for (const r of vision.rows) {
          const code       = normalizeCableCode(r.marca_pezzo);
          const isPriority = r.priority_zone !== null;
          addEq(r.app_partenza, r.laid_date, isPriority, code, r.partenza_highlighted ?? false, r.perimetro, r.situazione_inca, r.priority_zone);
          addEq(r.app_arrivo,   r.laid_date, isPriority, code, r.arrivo_highlighted   ?? false, r.perimetro, r.situazione_inca, r.priority_zone);
        }

        results.push({
          message_id:  msg.id,
          sender:      msg.sender_name,
          rows_found:  vision.rows.length,
          apparati:    Object.keys(eqMap).length,
          posato:      posatiTotal,
          priority:    priorityTotal,
          color_legend: vision.color_legend,
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

        await admin.from("incoming_messages").update({
          vision_processed: true,
          classification: {
            ...((msg.classification && typeof msg.classification === "object") ? msg.classification : {}),
            ...classificationPatch,
          },
          vision_result: {
            list_number:  vision.list_number,
            list_date:    vision.list_date,
            color_legend: vision.color_legend,
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
