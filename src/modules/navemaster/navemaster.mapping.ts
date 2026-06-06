import type { NavemasterNormalizedRow, NavemasterParsedRow } from "./navemaster.types";

const HEADER = {
  marcaCavo: "MARCACAVO",
  livello: "LIVELLO",
  codice: "CODICE",
  tipologia: "TIPOLOGIA",
  perimetro: "PERIMETRO",
  appPartenza: "APP_PARTENZA",
  appPartenzaLocale: "APP PARTENZA - LOCALE",
  descrizionePartenza: "DESCRIZIONE_PARTENZA",
  appArrivo: "APP_ARRIVO",
  appArrivoLocale: "APP ARRIVO - LOCALE",
  descrizioneArrivo: "DESCRIZIONE_ARRIVO",
  sitCavo: "SITCAVO",
  statoTec: "STATOTEC",
  statoCan: "STATOCAN",
  problematicheCavi: "PROBLEMATICHE CAVI PER CONSEGNA PERIMETRI",
  problematicheColl: "PROBLEMATICHE COLLEGAMENTI PER CONSEGNA PERIMETRI",
  noteSviluppo: "NOTE SVILUPPO",
  noteDcm: "NOTE DCM",
  noteConit: "NOTE CONIT",
  metriCalcolo: "METRATURA DI CALCOLO",
  metriDis: "METRIDIS",
  metriCan: "METRICAN",
  delta: "Δ",
  metriTaglio: "METRI_TAGLIO",
  disponibilita: "DISPONIBILITA MAGAZZINI FINCANTIERI 28/05/2026",
  dataPosa: "DATA_POSA ",
  settPosa: "SETT_POSA",
} as const;

function asText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

function asIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const text = asText(value);
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = asText(value);
  if (!text) return null;
  const normalized = text.replace(/\./g, "").replace(/,/g, ".");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeNavemasterCode(value: unknown): string | null {
  const text = asText(value);
  return text ? text.toUpperCase() : null;
}

export function isMeaningfulNavemasterRow(row: NavemasterParsedRow): boolean {
  const code = normalizeNavemasterCode(row.values[HEADER.marcaCavo]);
  if (!code) return false;
  if (["TOT. CAVI", "~", "MARCACAVO"].includes(code)) return false;
  return true;
}

export function mapIncaRowToNavemasterRow(row: NavemasterParsedRow): NavemasterNormalizedRow | null {
  if (!isMeaningfulNavemasterRow(row)) return null;

  const payload = Object.fromEntries(
    Object.entries(row.values).map(([key, value]) => {
      if (value instanceof Date && !Number.isNaN(value.getTime())) return [key, value.toISOString()];
      return [key, value ?? null];
    })
  );

  const descrizioneParts = [
    asText(row.values[HEADER.descrizionePartenza]),
    asText(row.values[HEADER.descrizioneArrivo]),
  ].filter(Boolean);

  const situazione = [
    asText(row.values[HEADER.statoTec]),
    asText(row.values[HEADER.statoCan]),
  ].filter(Boolean).join(" / ") || null;
  const exMarcaCavo = asText(row.values["EX MARCA CAVO"]);

  return {
    marcacavo: normalizeNavemasterCode(row.values[HEADER.marcaCavo])!,
    ex_marca_cavo: exMarcaCavo,
    livello: asText(row.values[HEADER.livello]),
    tipologia: asText(row.values[HEADER.tipologia]),
    impianto: asText(row.values[HEADER.perimetro]),
    zona_da: asText(row.values[HEADER.appPartenzaLocale]),
    zona_a: asText(row.values[HEADER.appArrivoLocale]),
    apparato_da: asText(row.values[HEADER.appPartenza]),
    apparato_a: asText(row.values[HEADER.appArrivo]),
    descrizione: descrizioneParts.length > 0 ? descrizioneParts.join(" → ") : null,
    stato_cavo: asText(row.values[HEADER.sitCavo]),
    situazione_cavo_conit: situazione,
    sezione: asText(row.values[HEADER.codice]),
    payload: {
      ...payload,
      situazione_cavo: asText(row.values[HEADER.sitCavo]),
      stato_tec: asText(row.values[HEADER.statoTec]),
      stato_sta: asText(row.values[HEADER.statoCan]),
      data_consegna_perimetro: asIsoDate(row.values["Data consegna perimetro"]),
      data_posa: asIsoDate(row.values[HEADER.dataPosa]),
      sett_posa: asText(row.values[HEADER.settPosa]),
      metri_calcolo: asNumber(row.values[HEADER.metriCalcolo]),
      metri_dis: asNumber(row.values[HEADER.metriDis]),
      metri_can: asNumber(row.values[HEADER.metriCan]),
      delta: asNumber(row.values[HEADER.delta]),
      metri_taglio: asNumber(row.values[HEADER.metriTaglio]),
      disponibilita_magazzini: asNumber(row.values[HEADER.disponibilita]),
      problematiche_cavi: asText(row.values[HEADER.problematicheCavi]),
      problematiche_collegamenti: asText(row.values[HEADER.problematicheColl]),
      note_sviluppo: asText(row.values[HEADER.noteSviluppo]),
      note_dcm: asText(row.values[HEADER.noteDcm]),
      note_conit: asText(row.values[HEADER.noteConit]),
      ex_marca_cavo: exMarcaCavo,
    },
  };
}
