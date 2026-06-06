import { supabase } from "../../lib/supabaseClient";
import type { Json } from "../../types/supabase.generated";
import { mapIncaRowToNavemasterRow } from "./navemaster.mapping";
import type {
  NavemasterImportMeta,
  NavemasterImportWriteResult,
  NavemasterNormalizedRow,
  NavemasterWorkbookParseResult,
} from "./navemaster.types";

const NAVEMASTER_BUCKET = "navemaster";
const NAVEMASTER_PAGE_SIZE = 1000;
export const CORE_COMMAND_SHIP_ID = "cc000000-0000-0000-0000-000000000001";

export interface NavemasterImportRecord {
  id: string;
  file_name: string;
  file_path: string;
  imported_at: string;
  imported_by: string | null;
  is_active: boolean;
  ship_id: string;
  source_sha256: string | null;
  costr: string | null;
  commessa: string | null;
  note: string | null;
}

interface NavemasterRowRecord {
  marcacavo: string;
  ex_marca_cavo?: string | null;
  livello: string | null;
  tipologia: string | null;
  impianto: string | null;
  zona_da: string | null;
  zona_a: string | null;
  apparato_da: string | null;
  apparato_a: string | null;
  descrizione: string | null;
  stato_cavo: string | null;
  situazione_cavo_conit: string | null;
  sezione: string | null;
  payload: Record<string, unknown>;
}

function safe(value: string | null | undefined): string {
  return (value ?? "na").trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 64) || "na";
}

function isLegacyNavemasterScopeError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "42P01" && message.includes('capo_ship_assignments');
}

function toNavemasterScopeError(error: unknown): Error {
  if (isLegacyNavemasterScopeError(error)) {
    return new Error(
      "Navemaster bloqué par une policy legacy cassée. Appliquer la migration 20260606184150_navemaster_core_command_scope_fix.sql puis recharger.",
    );
  }

  if (error instanceof Error) return error;

  if (error && typeof error === "object" && "message" in error) {
    return new Error(String((error as { message?: unknown }).message ?? "Erreur Navemaster inconnue"));
  }

  return new Error("Erreur Navemaster inconnue");
}

async function uploadNavemasterFile(file: File, meta: NavemasterImportMeta): Promise<{ bucket: string; path: string }> {
  const date = new Date().toISOString().slice(0, 10);
  const path = `imports/${safe(meta.costr)}/${safe(meta.commessa)}/${date}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(NAVEMASTER_BUCKET).upload(path, file, { upsert: false });
  if (error) throw new Error(`Upload Navemaster échoué: ${error.message}`);
  return { bucket: NAVEMASTER_BUCKET, path };
}

export async function getActiveNavemasterImport(shipId = CORE_COMMAND_SHIP_ID): Promise<NavemasterImportRecord | null> {
  const { data, error } = await supabase
    .from("navemaster_imports")
    .select("id,file_name,file_path,imported_at,imported_by,is_active,ship_id,source_sha256,costr,commessa,note")
    .eq("ship_id", shipId)
    .eq("is_active", true)
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw toNavemasterScopeError(error);
  return data as NavemasterImportRecord | null;
}

export async function listNavemasterArchives(shipId = CORE_COMMAND_SHIP_ID): Promise<NavemasterImportRecord[]> {
  const { data, error } = await supabase
    .from("navemaster_imports")
    .select("id,file_name,file_path,imported_at,imported_by,is_active,ship_id,source_sha256,costr,commessa,note")
    .eq("ship_id", shipId)
    .order("imported_at", { ascending: false })
    .limit(30);
  if (error) throw toNavemasterScopeError(error);
  return (data ?? []) as NavemasterImportRecord[];
}

export async function listNavemasterRowsByImport(importId: string): Promise<NavemasterNormalizedRow[]> {
  const rows: NavemasterRowRecord[] = [];

  for (let offset = 0; ; offset += NAVEMASTER_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("navemaster_rows")
      .select("marcacavo,livello,tipologia,impianto,zona_da,zona_a,apparato_da,apparato_a,descrizione,stato_cavo,situazione_cavo_conit,sezione,payload")
      .eq("navemaster_import_id", importId)
      .order("marcacavo", { ascending: true })
      .range(offset, offset + NAVEMASTER_PAGE_SIZE - 1);

    if (error) throw toNavemasterScopeError(error);

    const page = (data ?? []) as NavemasterRowRecord[];
    rows.push(...page);

    if (page.length < NAVEMASTER_PAGE_SIZE) break;
  }

  return rows.map((row) => ({
    ...row,
    ex_marca_cavo: row.ex_marca_cavo ?? (row.payload.ex_marca_cavo != null ? String(row.payload.ex_marca_cavo) : null),
    payload: (row.payload ?? {}) as Record<string, unknown>,
  }));
}

export async function createNavemasterImport(file: File, parsed: NavemasterWorkbookParseResult): Promise<NavemasterImportWriteResult> {
  const existingActive = await getActiveNavemasterImport(parsed.meta.shipId);
  if (existingActive?.source_sha256 && existingActive.source_sha256 === parsed.meta.sourceSha256) {
    return {
      status: "skipped",
      importId: existingActive.id,
      previousImportId: existingActive.id,
      rowCount: parsed.rows.length,
      reason: "Même fichier déjà actif",
    };
  }

  const normalizedRows = parsed.rows
    .map(mapIncaRowToNavemasterRow)
    .filter((row): row is NavemasterNormalizedRow => Boolean(row));

  if (normalizedRows.length === 0) {
    throw new Error("Aucune ligne Navemaster exploitable trouvée dans l'onglet INCA");
  }

  const upload = await uploadNavemasterFile(file, parsed.meta);

  const { data: insertedImport, error: importError } = await supabase
    .from("navemaster_imports")
    .insert({
      ship_id: parsed.meta.shipId,
      file_name: parsed.meta.fileName,
      file_path: upload.path,
      file_bucket: upload.bucket,
      source_sha256: parsed.meta.sourceSha256,
      imported_at: parsed.meta.importedAt,
      is_active: false,
      costr: parsed.meta.costr,
      commessa: parsed.meta.commessa,
      note: parsed.meta.title,
    })
    .select("id")
    .single();

  if (importError || !insertedImport) throw toNavemasterScopeError(importError ?? new Error("Création navemaster_import impossible"));

  const rowPayloads = normalizedRows.map((row) => ({
    navemaster_import_id: insertedImport.id,
    marcacavo: row.marcacavo,
    livello: row.livello,
    tipologia: row.tipologia,
    impianto: row.impianto,
    zona_da: row.zona_da,
    zona_a: row.zona_a,
    apparato_da: row.apparato_da,
    apparato_a: row.apparato_a,
    descrizione: row.descrizione,
    stato_cavo: row.stato_cavo,
    situazione_cavo_conit: row.situazione_cavo_conit,
    sezione: row.sezione,
    payload: row.payload as Json,
  }));

  for (let index = 0; index < rowPayloads.length; index += 500) {
    const batch = rowPayloads.slice(index, index + 500);
    const { error } = await supabase.from("navemaster_rows").insert(batch);
    if (error) throw new Error(`Insertion navemaster_rows échouée: ${error.message}`);
  }

  if (existingActive) {
    const { error } = await supabase.from("navemaster_imports").update({ is_active: false }).eq("id", existingActive.id);
    if (error) throw toNavemasterScopeError(error);
  }

  const { error: activateError } = await supabase.from("navemaster_imports").update({ is_active: true }).eq("id", insertedImport.id);
  if (activateError) throw toNavemasterScopeError(activateError);

  return {
    status: "created",
    importId: insertedImport.id,
    previousImportId: existingActive?.id ?? null,
    rowCount: normalizedRows.length,
  };
}
