import type { PerimetroCavoRow } from "../modules/navemaster/navemaster.types";

export type StatoConsegnaKey =
  | "da_posare"
  | "da_sistemare"
  | "pronto_coll"
  | "da_finire"
  | "consegnato"
  | "bloccato";

export type GestoConsegnaKey = Exclude<StatoConsegnaKey, "bloccato">;

export interface LiveConsegnaCable {
  situazione: string | null;
  sist_partenza: string | null;
  sist_arrivo: string | null;
  collegato: string | null;
}

export const STATO_CONSEGNA: Record<StatoConsegnaKey, { label: string; varCSS: `--${string}` }> = {
  da_posare: { label: "Da posare", varCSS: "--stato-posa" },
  da_sistemare: { label: "Da sistemare", varCSS: "--stato-sistemato" },
  pronto_coll: { label: "Pronto da collegare", varCSS: "--stato-collegato" },
  da_finire: { label: "Da finire", varCSS: "--stato-collegato" },
  consegnato: { label: "Consegnato", varCSS: "--stato-consegnato" },
  bloccato: { label: "Bloccato", varCSS: "--stato-bloccato" },
};

export function statoFromCavo(row: Pick<PerimetroCavoRow, "stage" | "bloccato" | "collegato">): StatoConsegnaKey {
  if (row.bloccato || row.stage === "bloccato") return "bloccato";
  if (row.collegato === "C") return "consegnato";
  if (row.stage === "da_posare") return "da_posare";
  if (row.stage === "da_sistemare") return "da_sistemare";
  if (row.stage === "pronto_coll") return "pronto_coll";
  return "da_finire";
}

export function gestoFromLiveCavo(row: LiveConsegnaCable): GestoConsegnaKey {
  if (row.collegato === "C") return "consegnato";
  if (row.situazione !== "P") return "da_posare";

  const sistemato = isSistemato(row);
  if (row.collegato === "1" || row.collegato === "2") return "da_finire";
  if (!sistemato) return "da_sistemare";
  return "pronto_coll";
}

export function mancaFromLiveCavo(row: LiveConsegnaCable): string {
  if (row.collegato === "C") return "consegnato";
  if (row.situazione !== "P") return "posare";

  const sistemato = isSistemato(row);
  const partenzaOk = row.sist_partenza === "OK";
  const arrivoOk = row.sist_arrivo === "OK";
  if (!sistemato && !partenzaOk && !arrivoOk) return "sistemare partenza e arrivo";
  if (!sistemato && !partenzaOk) return "sistemare partenza";
  if (!sistemato && !arrivoOk) return "sistemare arrivo";
  if (row.collegato === "1") return "collegare arrivo";
  if (row.collegato === "2") return "collegare partenza";
  return "collegare partenza e arrivo";
}

function isSistemato(row: LiveConsegnaCable): boolean {
  return (row.sist_partenza === "OK" && row.sist_arrivo === "OK") || row.collegato === "C";
}
