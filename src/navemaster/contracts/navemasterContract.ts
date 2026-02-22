// src/navemaster/contracts/navemasterContract.ts
// src/navemaster/contracts/navemasterContract.ts

export type NavStatus = "NP" | "P" | "T" | "R" | "L" | "B" | "E";

export type NavemasterRowV1 = {
  id: string;
  navemaster_import_id: string;
  codice: string;
  stato: NavStatus;
  metri_ref: number | null;
  metri_posati: number | null;
  delta_metri: number | null;
  descrizione?: string | null;
  impianto?: string | null;
  tipo?: string | null;
  sezione?: string | null;
  livello?: string | null;
  zona_da?: string | null;
  zona_a?: string | null;
  apparato_da?: string | null;
  apparato_a?: string | null;
  descrizione_da?: string | null;
  descrizione_a?: string | null;
  wbs?: string | null;
  created_at?: string;
};

export type NavemasterImportV1 = {
  id: string;
  ship_id: string;
  file_name: string;
  imported_by: string | null;
  imported_at: string;
  note: string | null;
};