// src/features/core-command/api/ai.api.ts
// Appels aux edge functions IA (assistant + déclenchement manuel).
// Le cron déclenche classify/vision en continu ; ces appels permettent au capo
// de forcer une mise à jour immédiate ("bouton manuel").

import { supabase } from "../../../lib/supabaseClient";

export interface CockpitAnswer {
  summary: string;
  cables?: Array<{ code: string; status: string; note?: string }>;
  zones?: Array<{ name: string; pct: number; total: number; confirmed: number }>;
  alerts?: string[];
  suggestions?: string[];
  action_required?: boolean;
}

/** Pose une question en langage naturel à l'assistant chantier. */
export async function askCockpit(question: string): Promise<CockpitAnswer> {
  const { data, error } = await supabase.functions.invoke<CockpitAnswer>("ai-cockpit", {
    body: { question },
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Risposta vuota dall'assistente");
  return data;
}

export interface ClassifyResult {
  ok: boolean;
  total: number;
  processed: number;
  skipped?: number;
  events_created: number;
  errors?: string[];
}

/** Force la classification immédiate des messaggi Telegram non trattati. */
export async function classifyIncomingNow(): Promise<ClassifyResult> {
  const { data, error } = await supabase.functions.invoke<ClassifyResult>("classify-incoming", {
    body: { dry_run: false, limit: 100 },
  });
  if (error) throw new Error(error.message);
  return data ?? { ok: false, total: 0, processed: 0, events_created: 0 };
}

export interface VisionResult {
  ok: boolean;
  processed: number;
  snapshots_created: number;
  errors?: string[];
}

/** Force la lecture immédiate des images terrain non analysées. */
export async function parseTerrainImagesNow(): Promise<VisionResult> {
  const { data, error } = await supabase.functions.invoke<VisionResult>("parse-terrain-image", {
    body: { dry_run: false, limit: 10 },
  });
  if (error) throw new Error(error.message);
  return data ?? { ok: false, processed: 0, snapshots_created: 0 };
}
