// src/features/core-command/api/whatsappImports.api.ts
import { supabase } from "../../../lib/supabaseClient";
import type { WhatsAppImport, InsertWhatsAppImport } from "../types";

export async function listWhatsAppImports(limit = 50): Promise<WhatsAppImport[]> {
  const { data, error } = await supabase
    .from("whatsapp_imports")
    .select("*")
    .order("imported_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getWhatsAppImport(id: string): Promise<WhatsAppImport | null> {
  const { data, error } = await supabase
    .from("whatsapp_imports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createWhatsAppImport(payload: InsertWhatsAppImport): Promise<WhatsAppImport> {
  const { data, error } = await supabase
    .from("whatsapp_imports")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWhatsAppImportStatus(
  id: string,
  status: "draft" | "imported" | "failed",
  message_count?: number
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (message_count !== undefined) patch.message_count = message_count;
  const { error } = await supabase.from("whatsapp_imports").update(patch).eq("id", id);
  if (error) throw error;
}
