// src/modules/inca/api.ts
import { supabase } from "../../core/supabase";
import type { IncaCavo } from "../../core/db/types";

const COLS =
  "id, inca_file_id, marca_cavo, codice, stato_cantiere, situazione_cavo, situazione, metri_teo, metri_dis, metri_sit_cavo, metri_posati_teorici, metri_totali, zona_da, zona_a, apparato_da, apparato_a";

export async function searchCavi(query: string, limit = 50): Promise<IncaCavo[]> {
  let q = supabase.from("inca_cavi").select(COLS).limit(limit);
  const term = query.trim();
  if (term) {
    q = q.or(
      `marca_cavo.ilike.%${term}%,codice.ilike.%${term}%,zona_da.ilike.%${term}%,zona_a.ilike.%${term}%`
    );
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as IncaCavo[];
}

export type IncaSituation = {
  theoretical: number; // mètres théoriques
  posed: number; // mètres posés
  remaining: number; // restants
  situazione: string | null;
};

// situazione INCA : L | T | P | R | B | E.  P/T = posé/terminé.
const POSED_SITUAZIONI = ["P", "T"];

export function computeSituation(cavo: IncaCavo): IncaSituation {
  const theoretical = cavo.metri_teo ?? cavo.metri_dis ?? 0;
  const sit = (cavo.situazione ?? cavo.stato_cantiere ?? "").trim().toUpperCase();
  const isPosed = POSED_SITUAZIONI.includes(sit);
  const posed =
    cavo.metri_posati_teorici ?? (isPosed ? (cavo.metri_sit_cavo ?? theoretical) : 0);
  const remaining = Math.max(0, theoretical - posed);
  return { theoretical, posed, remaining, situazione: cavo.situazione ?? cavo.stato_cantiere };
}
