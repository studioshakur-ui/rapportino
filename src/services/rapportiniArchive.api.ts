// /src/services/rapportiniArchive.api.ts
import { supabase } from "../lib/supabaseClient";

/**
 * Strongly-typed shape for the archive_rapportini_v1 view as used by UI.
 * Keep fields optional because DB views can vary and old data may be incomplete.
 */
export type ArchiveRapportinoV1 = {
  id?: string | null;
  rapportino_id?: string | null;

  // date fields
  data?: string | null; // expected ISO date/time string (often YYYY-MM-DD or full ISO)
  created_at?: string | null;

  // identity/scope
  ship_id?: string | null;
  capo_id?: string | null;
  capo_name?: string | null;

  // business fields
  commessa?: string | null;
  costr?: string | null;
  status?: string | null;

  totale_prodotto?: number | string | null;

  note?: string | null;

  // allow forwards compatibility without breaking strict typing
  [k: string]: unknown;
};

export type ArchiveRapportinoRowV1 = {
  id?: string | null;
  rapportino_id?: string | null;
  row_index?: number | null;

  categoria?: string | null;
  descrizione?: string | null;
  operatori?: string | null;
  tempo?: string | null;

  previsto?: number | string | null;
  prodotto?: number | string | null;

  note?: string | null;

  [k: string]: unknown;
};

export type ArchiveRapportinoCavoV1 = {
  id?: string | null;
  rapportino_id?: string | null;
  row_index?: number | null;

  codice?: string | null;
  descrizione?: string | null;
  metri_teo?: number | string | null;
  metri_dis?: number | string | null;
  situazione?: string | null;

  note?: string | null;

  [k: string]: unknown;
};

function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function normalizeRapportinoV1(r: ArchiveRapportinoV1): ArchiveRapportinoV1 {
  // normalize only fields used by UI logic
  const out: ArchiveRapportinoV1 = { ...r };
  const fallbackProdotto =
    (r as any)?.totale_prodotto ??
    (r as any)?.prodotto_totale ??
    (r as any)?.prodotto_tot ??
    (r as any)?.totale_prodotto_calc ??
    0;
  out.totale_prodotto = toNumber(fallbackProdotto);
  // keep data as string, UI parses it when needed
  return out;
}

/**
 * Legacy compat export (expected by CoreDriveRapportiniV1)
 * Supports CAPO personal view via capoId filter.
 */
export async function loadRapportiniArchiveV1({
  capoId,
  limit = 2000,
}: {
  capoId?: string | null;
  limit?: number;
}): Promise<ArchiveRapportinoV1[]> {
  let q = supabase.from("archive_rapportini_v1").select("*").order("data", { ascending: false }).limit(limit);

  if (capoId) q = q.eq("capo_id", capoId);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data || []) as ArchiveRapportinoV1[];
  return rows.map(normalizeRapportinoV1);
}

/**
 * Ship-scoped listing (used in other Core Drive parts)
 */
export async function listArchiveRapportini({
  shipId,
  limit = 200,
}: {
  shipId: string;
  limit?: number;
}): Promise<ArchiveRapportinoV1[]> {
  if (!shipId) return [];
  const { data, error } = await supabase
    .from("archive_rapportini_v1")
    .select("*")
    .eq("ship_id", shipId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  const rows = (data || []) as ArchiveRapportinoV1[];
  return rows.map(normalizeRapportinoV1);
}

export async function listArchiveRapportinoRows({
  rapportinoId,
  limit = 2000,
}: {
  rapportinoId: string;
  limit?: number;
}): Promise<ArchiveRapportinoRowV1[]> {
  if (!rapportinoId) return [];
  const { data, error } = await supabase
    .from("archive_rapportino_rows_v1")
    .select("*")
    .eq("rapportino_id", rapportinoId)
    .order("row_index", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ArchiveRapportinoRowV1[];
}

export async function listArchiveRapportinoCavi({
  rapportinoId,
  limit = 2000,
}: {
  rapportinoId: string;
  limit?: number;
}): Promise<ArchiveRapportinoCavoV1[]> {
  if (!rapportinoId) return [];
  const { data, error } = await supabase
    .from("archive_rapportino_cavi_v1")
    .select("*")
    .eq("rapportino_id", rapportinoId)
    .order("row_index", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ArchiveRapportinoCavoV1[];
}
