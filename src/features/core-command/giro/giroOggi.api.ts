import { formatCableDisplay } from "../../../core/cable/cableDisplay";
import { gestoFromLiveCavo, mancaFromLiveCavo, type GestoConsegnaKey, type LiveConsegnaCable } from "../../../domain/statoConsegna";
import { supabase } from "../../../lib/supabaseClient";
import { listRecentImports } from "../../../modules/daily-lists/dailyLists.repo";

interface IncaLiveRow extends LiveConsegnaCable {
  codice: string;
  descrizione_da: string | null;
  descrizione_a: string | null;
  apparato_da: string | null;
  apparato_a: string | null;
}

interface GiroItemRow {
  id: string;
  cable_code_raw: string;
  cable_code_normalized: string;
  note: string | null;
  app_partenza: string | null;
  app_arrivo: string | null;
  situazione_inca: string | null;
  stato_collegamento: string | null;
  inca_cavi: IncaLiveRow | IncaLiveRow[] | null;
}

export interface GiroOggiItem {
  id: string;
  codice: string;
  displayCodice: string;
  gesto: GestoConsegnaKey;
  manca: string;
  note: string | null;
  apparatoDa: string | null;
  apparatoA: string | null;
  descrizioneDa: string | null;
  descrizioneA: string | null;
}

export interface GiroOggiView {
  importId: string;
  fileName: string;
  listDate: string | null;
  importedAt: string;
  items: GiroOggiItem[];
  consegnati: number;
}

export async function loadGiroOggi(): Promise<GiroOggiView | null> {
  const [latestImport] = await listRecentImports(1);
  if (!latestImport) return null;

  const { data, error } = await supabase
    .from("daily_list_items")
    .select(`
      id,
      cable_code_raw,
      cable_code_normalized,
      note,
      app_partenza,
      app_arrivo,
      situazione_inca,
      stato_collegamento,
      inca_cavi!daily_list_items_inca_cavo_id_fkey (
        codice,
        situazione,
        sist_partenza,
        sist_arrivo,
        collegato,
        descrizione_da,
        descrizione_a,
        apparato_da,
        apparato_a
      )
    `)
    .eq("import_id", latestImport.id)
    .order("cable_code_normalized", { ascending: true });

  if (error) throw error;

  const items = ((data ?? []) as unknown as GiroItemRow[])
    .map(toGiroItem)
    .filter((item): item is GiroOggiItem => item !== null);

  return {
    importId: latestImport.id,
    fileName: latestImport.file_name,
    listDate: latestImport.list_date,
    importedAt: latestImport.imported_at,
    items,
    consegnati: items.filter((item) => item.gesto === "consegnato").length,
  };
}

function toGiroItem(row: GiroItemRow): GiroOggiItem | null {
  const live = Array.isArray(row.inca_cavi) ? row.inca_cavi[0] ?? null : row.inca_cavi;
  const codice = live?.codice || row.cable_code_raw || row.cable_code_normalized;
  if (codice.includes("*")) return null;

  const stato: LiveConsegnaCable = live ?? {
    situazione: row.situazione_inca,
    sist_partenza: null,
    sist_arrivo: null,
    collegato: row.stato_collegamento,
  };

  return {
    id: row.id,
    codice,
    displayCodice: formatCableDisplay(codice),
    gesto: gestoFromLiveCavo(stato),
    manca: live ? mancaFromLiveCavo(stato) : "verificare corrispondenza INCA",
    note: row.note?.trim() || null,
    apparatoDa: live?.apparato_da ?? row.app_partenza,
    apparatoA: live?.apparato_a ?? row.app_arrivo,
    descrizioneDa: live?.descrizione_da ?? null,
    descrizioneA: live?.descrizione_a ?? null,
  };
}
