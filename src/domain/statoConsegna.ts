import type { PerimetroCavoRow } from "../modules/navemaster/navemaster.types";

export type StatoConsegnaKey =
  | "da_posare"
  | "da_sistemare"
  | "pronto_coll"
  | "da_finire"
  | "consegnato"
  | "bloccato";

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
