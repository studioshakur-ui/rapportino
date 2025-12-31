// src/navemaster/contracts/navemasterContract.js
// NAVEMASTER — Front Contract (100% JS, Safety-Critical)
//
// Doctrine:
// - Statuts canoniques: P, R, T, B, E, NP
// - NP = seul état "unknown"
// - Jamais de régression
// - Jamais d'action sans certitude
// - P est terminal fort (toute proposition INCA != P => conflit critique)

export const NAV_STATUS = /** @type {const} */ ({
  P: "P",
  R: "R",
  T: "T",
  B: "B",
  E: "E",
  NP: "NP",
});

export const NAV_STATUS_LABEL_IT = /** @type {const} */ ({
  P: "Posato",
  R: "Richiesta taglio",
  T: "Tagliato",
  B: "Bloccato",
  E: "Eliminato",
  NP: "Non posato",
});

export const NAV_STATUS_RANK = /** @type {const} */ ({
  P: 600,
  T: 500,
  R: 400,
  B: 300,
  E: 200,
  NP: 100,
});

/**
 * @param {string|null|undefined} x
 * @returns {"P"|"R"|"T"|"B"|"E"|"NP"}
 */
export function navStatusFromText(x) {
  const v = String(x ?? "").trim().toUpperCase();
  if (v === "P") return "P";
  if (v === "R") return "R";
  if (v === "T") return "T";
  if (v === "B") return "B";
  if (v === "E") return "E";
  if (v === "NP") return "NP";
  return "NP";
}

/**
 * @param {"P"|"R"|"T"|"B"|"E"|"NP"} fromS
 * @param {"P"|"R"|"T"|"B"|"E"|"NP"} toS
 */
export function isRegression(fromS, toS) {
  return NAV_STATUS_RANK[toS] < NAV_STATUS_RANK[fromS];
}

// View contract (DB): public.navemaster_cockpit_v1
// Keep this JSDoc in sync with SQL view columns.
/**
 * @typedef {Object} NavemasterCockpitRow
 * @property {string} ship_id
 * @property {string} navemaster_import_id
 * @property {string} navemaster_row_id
 * @property {string} marcacavo
 * @property {string|null} descrizione
 * @property {string|null} stato_cavo
 * @property {string|null} situazione_cavo_conit
 * @property {string|null} livello
 * @property {string|null} sezione
 * @property {string|null} tipologia
 * @property {string|null} zona_da
 * @property {string|null} zona_a
 * @property {string|null} apparato_da
 * @property {string|null} apparato_a
 * @property {string|null} impianto
 * @property {Object} nav_payload
 * @property {string|null} inca_cavo_id
 * @property {string|null} inca_file_id
 * @property {string|null} situazione_inca
 * @property {number|null} metri_teo_inca
 * @property {number|null} metri_dis_inca
 * @property {string|null} inca_updated_at
 * @property {"P"|"R"|"T"|"B"|"E"|"NP"} nav_status
 * @property {"P"|"R"|"T"|"B"|"E"|"NP"} inca_status
 * @property {"P"|"R"|"T"|"B"|"E"|"NP"} effective_status
 * @property {boolean} is_conflict_p_vs_inca
 * @property {boolean} is_changed_vs_inca
 */

/**
 * Column specification for a column picker (promoted + payload view).
 * @typedef {Object} ColumnSpec
 * @property {string} key
 * @property {string} label
 * @property {"promoted"|"payload"} kind
 * @property {boolean} defaultVisible
 */

export const DEFAULT_COLUMN_PRESETS = /** @type {const} */ ({
  TERRAIN: {
    name: "Terrain",
    columns: [
      "marcacavo",
      "effective_status",
      "nav_status",
      "inca_status",
      "is_conflict_p_vs_inca",
      "zona_da",
      "zona_a",
      "apparato_da",
      "apparato_a",
    ],
  },
  UFFICIO: {
    name: "Ufficio",
    columns: [
      "marcacavo",
      "effective_status",
      "nav_status",
      "inca_status",
      "metri_teo_inca",
      "metri_dis_inca",
      "is_changed_vs_inca",
      "livello",
      "sezione",
      "tipologia",
      "impianto",
    ],
  },
  DIREZIONE: {
    name: "Direzione",
    columns: [
      "marcacavo",
      "effective_status",
      "is_conflict_p_vs_inca",
      "is_changed_vs_inca",
      "metri_teo_inca",
      "metri_dis_inca",
      "impianto",
    ],
  },
});

export const UX_DOCTRINE = /** @type {const} */ ({
  noTatonneJamais: true,
  noRegression: true,
  noActionWithoutCertainty: true,
  pIsTerminalStrong: true,
  hubIsLight: true,
  cockpitIsFullscreen: true,
  drawerShowsFullPayload: true,
});
