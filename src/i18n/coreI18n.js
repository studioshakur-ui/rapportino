// src/i18n/coreI18n.js
export const LANGS = ["it", "fr", "en"];

export function getInitialLang() {
  if (typeof window === "undefined") return "it";
  try {
    const saved = window.localStorage.getItem("core-lang");
    if (saved && LANGS.includes(saved)) return saved;
  } catch {
    // ignore
  }
  return "it";
}

export function setLangStorage(lang) {
  try {
    window.localStorage.setItem("core-lang", lang);
  } catch {
    // ignore
  }
}

function interpolate(template, params) {
  const s = (template ?? "").toString();
  if (!params || typeof params !== "object") return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v == null ? "" : String(v);
  });
}

export function createTranslator({ lang = "it", warnMissing = true } = {}) {
  const active = LANGS.includes(lang) ? lang : "it";
  const dict = DICT[active] || DICT.it;

  return (key, params) => {
    const has = Object.prototype.hasOwnProperty.call(dict, key);
    const base =
      (has ? dict[key] : undefined) ??
      (DICT.it?.[key] ?? key);

    if (warnMissing && key && base === key && typeof window !== "undefined") {
      // dev-only: avoid noisy logs in prod builds (best effort)
      try {
        const isDev =
          (typeof import.meta !== "undefined" &&
            import.meta.env &&
            import.meta.env.DEV) ||
          (typeof process !== "undefined" &&
            process.env &&
            process.env.NODE_ENV !== "production");
        if (isDev) console.warn(`[i18n] Missing key "${key}" for lang="${active}"`);
      } catch {
        // ignore
      }
    }

    return interpolate(base, params);
  };
}

export const t = (lang, key, params) => {
  const tr = createTranslator({ lang, warnMissing: true });
  return tr(key, params);
};

const DICT = {
  it: {
    LANG: "Lingua",
    LOGOUT: "Logout",
    SHELL_ROLE: "Ruolo",
    SHELL_EXPAND: "Espandi menu",
    SHELL_COLLAPSE: "Riduci menu",
    SHELL_CONNECTION: "Connessione",

    ADMIN_TITLE: "Admin · Governance CORE",
    ADMIN_SUB: "Creazione account, controllo ruoli, perimetri, audit.",
    TAB_USERS: "Utenti",
    TAB_SETTINGS: "Impostazioni",
    TAB_PERIMETERS: "Perimetri",

    SEARCH: "Cerca",
    ROLE: "Ruolo",
    RESET: "Reset",
    CREATE_USER: "Crea nuovo account",
    EMAIL: "Email",
    FULL_NAME: "Nome completo",
    DISPLAY_NAME: "Display name",
    DEFAULT_COSTR: "Default COSTR",
    DEFAULT_COMMESSA: "Default Commessa",
    ALLOWED_CANTIERI: "Cantieri autorizzati (CSV)",
    SUBMIT_CREATE: "Crea account",
    CREATING: "Creazione in corso…",
    CREATED_OK: "Account creato.",
    CREATE_FAIL: "Creazione fallita",
    USERS_LIST: "Elenco utenti",
    ID: "ID",
    NAME: "Nome",
    ACTIONS: "Azioni",
    COPY: "Copia",
    NO_ROWS: "Nessun risultato.",
    PAGE: "Pagina",
    PREV: "Indietro",
    NEXT: "Avanti",

    PERIM_TITLE: "Perimetri · Ship · Manager · Squadre",
    PERIM_SUB: "Governa il perimetro: assegna Manager ai cantieri e gestisci le squadre (ship_operators).",
    PERIM_SELECT_SHIP: "Cantiere",
    PERIM_SCOPE: "Perimetro",
    PERIM_SCOPE_HINT: "Seleziona un cantiere da gestire (admin).",
    PERIM_MANAGERS: "Manager assegnati",
    PERIM_ADD_MANAGER: "Aggiungi manager (email)",
    PERIM_REMOVE: "Rimuovi",
    PERIM_ADD: "Aggiungi",
    PERIM_LOADING: "Caricamento…",
    PERIM_NO_SHIPS: "Nessun cantiere trovato",
    PERIM_NO_MANAGERS: "Nessun manager assegnato",
    PERIM_OPS: "Squadre operative",
    PERIM_OPS_HINT: "Operai collegati al cantiere selezionato.",
    PERIM_ADD_OP: "Aggiunta rapida",
    PERIM_ADD_OP_TITLE: "Aggiungi operaio",
    PERIM_ADD_OP_HINT: "Inserimento manuale (senza account). Collegato al cantiere selezionato.",
    PERIM_OP_NAME: "Nome",
    PERIM_OP_ROLE: "Ruolo (opzionale)",
    PERIM_STATUS: "Stato",
    PERIM_ACTIVE: "Attivo",
    PERIM_INACTIVE: "Disattivo",

    MANAGER_SHELL_TITLE: "Manager",
    MANAGER_KICKER: "MANAGER · CNCS / CORE",
    MANAGER_TAB_DASHBOARD: "Dashboard",
    MANAGER_TAB_ASSIGNMENTS: "Assegnazioni",
    MANAGER_TAB_DRIVE: "CORE Drive",
    MANAGER_TAB_ANALYTICS: "Analytics",

    COMMON_LOADING: "Caricamento…",
    COMMON_ERROR: "Errore",
    COMMON_CLOSE: "Chiudi",
    COMMON_NO_DATA: "Nessun dato",

    KPI_OPPROD_TITLE: "KPI Operatori · Indice di produttività (Previsto)",
    KPI_OPPROD_KICKER: "CNCS / CORE",
    KPI_OPPROD_DESC:
      "Indice canonico (intervallo): Σ(realizzato_alloc) / Σ(previsto_eff), con previsto_eff = previsto × (ore/8). Famiglia = categoria + descrizione.",
    KPI_OPPROD_WINDOW: "Intervallo",
    KPI_OPPROD_SELECTION: "Selezione",
    KPI_OPPROD_SELECT_FILTERED: "Seleziona filtrati",
    KPI_OPPROD_CLEAR: "Svuota",
    KPI_OPPROD_SHOW_DETAILS: "Mostra dettagli",
    KPI_OPPROD_HIDE_DETAILS: "Nascondi dettagli",
    KPI_OPPROD_SELECTED_N: "Selezionati: {n}",
    KPI_OPPROD_SCOPE_ACTIVE: "Scope attivo: {scope}",
    KPI_OPPROD_SCOPE_CAPO_NOTE:
      "Nota: filtro CAPO richiede capo_id nelle view v2 (non attivo finché non esposto).",
    KPI_OPPROD_OPERATORS: "Operatori",
    KPI_OPPROD_OPERATORS_HINT: "Seleziona la lista su cui calcolare i KPI.",
    KPI_OPPROD_OPERATORS_DERIVED: "La lista è derivata dai dati nell’intervallo corrente.",
    KPI_OPPROD_SEARCH_PLACEHOLDER: "Cerca operatore…",
    KPI_OPPROD_TOTAL_IN_RANGE: "Totale in range: {n}",

    KPI_OPPROD_KPI_SELECTED: "Operai selezionati",
    KPI_OPPROD_KPI_SELECTED_SUB: "Lista attiva",
    KPI_OPPROD_KPI_HOURS: "Σ Ore (indicizzate)",
    KPI_OPPROD_KPI_HOURS_SUB: "Solo linee QUANTITATIVE MT/PZ con previsto",
    KPI_OPPROD_KPI_PREV: "Σ Previsto eff.",
    KPI_OPPROD_KPI_PREV_SUB: "previsto × (ore/8)",
    KPI_OPPROD_KPI_INDEX: "Indice (globale)",
    KPI_OPPROD_KPI_INDEX_SUB: "Σreal / Σprev",

    KPI_OPPROD_RESULTS: "Risultati",
    KPI_OPPROD_RESULTS_SUB: "Indice globale per operatore (clicca per dettagli).",
    KPI_OPPROD_ROWS: "Righe: {n}",

    KPI_OPPROD_TABLE_OPERATOR: "Operatore",
    KPI_OPPROD_TABLE_HOURS: "Σ Ore",
    KPI_OPPROD_TABLE_PREV: "Σ Prev",
    KPI_OPPROD_TABLE_REAL: "Σ Real",
    KPI_OPPROD_TABLE_INDEX: "Indice",
    KPI_OPPROD_TABLE_DAYS: "Giorni",

    KPI_OPPROD_EMPTY: "Nessun dato. Seleziona operatori oppure allarga l’intervallo.",
    KPI_OPPROD_LOADING_LIST: "Caricamento lista…",
    KPI_OPPROD_NO_OPERATOR: "Nessun operatore trovato",

    KPI_OPPROD_TOTAL_SELECTION: "Totale selezione",

    KPI_OPPROD_MODAL_TITLE: "Dettaglio operatore",
    KPI_OPPROD_MODAL_FAMILIES: "Dettaglio famiglie",
    KPI_OPPROD_MODAL_TIME: "Tempo",
    KPI_OPPROD_MODAL_SUMMARY: "Sintesi",
    KPI_OPPROD_MODAL_NO_FAMILIES: "Nessuna famiglia indicizzabile nell’intervallo.",
    KPI_OPPROD_MODAL_TIME_TOTAL: "Ore totali (tutte le righe)",
    KPI_OPPROD_MODAL_TIME_INDEXED: "Ore indicizzate (MT/PZ con previsto)",
    KPI_OPPROD_MODAL_TIME_NON_INDEXED: "Ore non indicizzate",
  },

  fr: {
    LANG: "Langue",
    LOGOUT: "Déconnexion",
    SHELL_ROLE: "Rôle",
    SHELL_EXPAND: "Déployer le menu",
    SHELL_COLLAPSE: "Réduire le menu",
    SHELL_CONNECTION: "Connexion",

    ADMIN_TITLE: "Admin · Gouvernance CORE",
    ADMIN_SUB: "Création comptes, contrôle rôles, périmètres, audit.",
    TAB_USERS: "Utilisateurs",
    TAB_SETTINGS: "Paramètres",
    TAB_PERIMETERS: "Périmètres",

    SEARCH: "Rechercher",
    ROLE: "Rôle",
    RESET: "Reset",
    CREATE_USER: "Créer un compte",
    EMAIL: "Email",
    FULL_NAME: "Nom complet",
    DISPLAY_NAME: "Nom affiché",
    DEFAULT_COSTR: "COSTR par défaut",
    DEFAULT_COMMESSA: "Commessa par défaut",
    ALLOWED_CANTIERI: "Chantiers autorisés (CSV)",
    SUBMIT_CREATE: "Créer",
    CREATING: "Création…",
    CREATED_OK: "Compte créé.",
    CREATE_FAIL: "Échec de création",
    USERS_LIST: "Liste des comptes",
    ID: "ID",
    NAME: "Nom",
    ACTIONS: "Actions",
    COPY: "Copier",
    NO_ROWS: "Aucun résultat.",
    PAGE: "Page",
    PREV: "Précédent",
    NEXT: "Suivant",

    PERIM_TITLE: "Périmètres · Ship · Manager · Équipes",
    PERIM_SUB: "Gouvernance périmètre : assigner des Managers aux chantiers et gérer les équipes (ship_operators).",
    PERIM_SELECT_SHIP: "Chantier",
    PERIM_SCOPE: "Périmètre",
    PERIM_SCOPE_HINT: "Sélectionne un chantier à administrer.",
    PERIM_MANAGERS: "Managers assignés",
    PERIM_ADD_MANAGER: "Ajouter un manager (email)",
    PERIM_REMOVE: "Retirer",
    PERIM_ADD: "Ajouter",
    PERIM_LOADING: "Chargement…",
    PERIM_NO_SHIPS: "Aucun chantier trouvé",
    PERIM_NO_MANAGERS: "Aucun manager assigné",
    PERIM_OPS: "Équipes opérationnelles",
    PERIM_OPS_HINT: "Ouvriers liés au chantier sélectionné.",
    PERIM_ADD_OP: "Ajout rapide",
    PERIM_ADD_OP_TITLE: "Ajouter un ouvrier",
    PERIM_ADD_OP_HINT: "Ajout manuel (sans compte). Relié au chantier sélectionné.",
    PERIM_OP_NAME: "Nom",
    PERIM_OP_ROLE: "Rôle (optionnel)",
    PERIM_STATUS: "Statut",
    PERIM_ACTIVE: "Actif",
    PERIM_INACTIVE: "Inactif",

    MANAGER_SHELL_TITLE: "Manager",
    MANAGER_KICKER: "MANAGER · CNCS / CORE",
    MANAGER_TAB_DASHBOARD: "Tableau de bord",
    MANAGER_TAB_ASSIGNMENTS: "Affectations",
    MANAGER_TAB_DRIVE: "CORE Drive",
    MANAGER_TAB_ANALYTICS: "Analytique",

    COMMON_LOADING: "Chargement…",
    COMMON_ERROR: "Erreur",
    COMMON_CLOSE: "Fermer",
    COMMON_NO_DATA: "Aucune donnée",

    KPI_OPPROD_TITLE: "KPI Opérateurs · Indice de productivité (Prévu)",
    KPI_OPPROD_KICKER: "CNCS / CORE",
    KPI_OPPROD_DESC:
      "Indice canonique (intervalle) : Σ(réalisé_alloc) / Σ(prévu_eff), avec prévu_eff = prévu × (heures/8). Famille = catégorie + description.",
    KPI_OPPROD_WINDOW: "Intervalle",
    KPI_OPPROD_SELECTION: "Sélection",
    KPI_OPPROD_SELECT_FILTERED: "Sélectionner filtrés",
    KPI_OPPROD_CLEAR: "Vider",
    KPI_OPPROD_SHOW_DETAILS: "Afficher détails",
    KPI_OPPROD_HIDE_DETAILS: "Masquer détails",
    KPI_OPPROD_SELECTED_N: "Sélectionnés : {n}",
    KPI_OPPROD_SCOPE_ACTIVE: "Scope actif : {scope}",
    KPI_OPPROD_SCOPE_CAPO_NOTE:
      "Note : le filtre CAPO nécessite capo_id dans les vues v2 (inactif tant que non exposé).",
    KPI_OPPROD_OPERATORS: "Opérateurs",
    KPI_OPPROD_OPERATORS_HINT: "Sélectionne la liste sur laquelle calculer les KPI.",
    KPI_OPPROD_OPERATORS_DERIVED: "La liste provient des données dans l’intervalle courant.",
    KPI_OPPROD_SEARCH_PLACEHOLDER: "Rechercher un opérateur…",
    KPI_OPPROD_TOTAL_IN_RANGE: "Total dans l’intervalle : {n}",

    KPI_OPPROD_KPI_SELECTED: "Opérateurs sélectionnés",
    KPI_OPPROD_KPI_SELECTED_SUB: "Liste active",
    KPI_OPPROD_KPI_HOURS: "Σ Heures (indexées)",
    KPI_OPPROD_KPI_HOURS_SUB: "Uniquement lignes QUANTITATIVE MT/PZ avec prévu",
    KPI_OPPROD_KPI_PREV: "Σ Prévu eff.",
    KPI_OPPROD_KPI_PREV_SUB: "prévu × (heures/8)",
    KPI_OPPROD_KPI_INDEX: "Indice (global)",
    KPI_OPPROD_KPI_INDEX_SUB: "Σréel / Σprévu",

    KPI_OPPROD_RESULTS: "Résultats",
    KPI_OPPROD_RESULTS_SUB: "Indice global par opérateur (clique pour détails).",
    KPI_OPPROD_ROWS: "Lignes : {n}",

    KPI_OPPROD_TABLE_OPERATOR: "Opérateur",
    KPI_OPPROD_TABLE_HOURS: "Σ Heures",
    KPI_OPPROD_TABLE_PREV: "Σ Prévu",
    KPI_OPPROD_TABLE_REAL: "Σ Réel",
    KPI_OPPROD_TABLE_INDEX: "Indice",
    KPI_OPPROD_TABLE_DAYS: "Jours",

    KPI_OPPROD_EMPTY: "Aucune donnée. Sélectionne des opérateurs ou élargis l’intervalle.",
    KPI_OPPROD_LOADING_LIST: "Chargement de la liste…",
    KPI_OPPROD_NO_OPERATOR: "Aucun opérateur trouvé",

    KPI_OPPROD_TOTAL_SELECTION: "Total sélection",

    KPI_OPPROD_MODAL_TITLE: "Détail opérateur",
    KPI_OPPROD_MODAL_FAMILIES: "Détail familles",
    KPI_OPPROD_MODAL_TIME: "Temps",
    KPI_OPPROD_MODAL_SUMMARY: "Synthèse",
    KPI_OPPROD_MODAL_NO_FAMILIES: "Aucune famille indexable sur l’intervalle.",
    KPI_OPPROD_MODAL_TIME_TOTAL: "Heures totales (toutes lignes)",
    KPI_OPPROD_MODAL_TIME_INDEXED: "Heures indexées (MT/PZ avec prévu)",
    KPI_OPPROD_MODAL_TIME_NON_INDEXED: "Heures non indexées",
  },

  en: {
    LANG: "Language",
    LOGOUT: "Logout",
    SHELL_ROLE: "Role",
    SHELL_EXPAND: "Expand menu",
    SHELL_COLLAPSE: "Collapse menu",
    SHELL_CONNECTION: "Connection",

    ADMIN_TITLE: "Admin · CORE Governance",
    ADMIN_SUB: "Account creation, role control, perimeters, audit.",
    TAB_USERS: "Users",
    TAB_SETTINGS: "Settings",
    TAB_PERIMETERS: "Perimeters",

    SEARCH: "Search",
    ROLE: "Role",
    RESET: "Reset",
    CREATE_USER: "Create account",
    EMAIL: "Email",
    FULL_NAME: "Full name",
    DISPLAY_NAME: "Display name",
    DEFAULT_COSTR: "Default COSTR",
    DEFAULT_COMMESSA: "Default Commessa",
    ALLOWED_CANTIERI: "Allowed shipyards (CSV)",
    SUBMIT_CREATE: "Create",
    CREATING: "Creating…",
    CREATED_OK: "Account created.",
    CREATE_FAIL: "Create failed",
    USERS_LIST: "Users list",
    ID: "ID",
    NAME: "Name",
    ACTIONS: "Actions",
    COPY: "Copy",
    NO_ROWS: "No results.",
    PAGE: "Page",
    PREV: "Prev",
    NEXT: "Next",

    PERIM_TITLE: "Perimeters · Shipyard · Manager · Crews",
    PERIM_SUB: "Perimeter governance: assign Managers to shipyards and manage crews (ship_operators).",
    PERIM_SELECT_SHIP: "Shipyard",
    PERIM_SCOPE: "Perimeter",
    PERIM_SCOPE_HINT: "Select a shipyard to administer (admin).",
    PERIM_MANAGERS: "Assigned managers",
    PERIM_ADD_MANAGER: "Add manager (email)",
    PERIM_REMOVE: "Remove",
    PERIM_ADD: "Add",
    PERIM_LOADING: "Loading…",
    PERIM_NO_SHIPS: "No shipyards found",
    PERIM_NO_MANAGERS: "No manager assigned",
    PERIM_OPS: "Operational crews",
    PERIM_OPS_HINT: "Operators linked to the selected shipyard.",
    PERIM_ADD_OP: "Quick add",
    PERIM_ADD_OP_TITLE: "Add operator",
    PERIM_ADD_OP_HINT: "Manual insert (no account). Linked to selected shipyard.",
    PERIM_OP_NAME: "Name",
    PERIM_OP_ROLE: "Role (optional)",
    PERIM_STATUS: "Status",
    PERIM_ACTIVE: "Active",
    PERIM_INACTIVE: "Inactive",

    MANAGER_SHELL_TITLE: "Manager",
    MANAGER_KICKER: "MANAGER · CNCS / CORE",
    MANAGER_TAB_DASHBOARD: "Dashboard",
    MANAGER_TAB_ASSIGNMENTS: "Assignments",
    MANAGER_TAB_DRIVE: "CORE Drive",
    MANAGER_TAB_ANALYTICS: "Analytics",

    COMMON_LOADING: "Loading…",
    COMMON_ERROR: "Error",
    COMMON_CLOSE: "Close",
    COMMON_NO_DATA: "No data",

    KPI_OPPROD_TITLE: "Operators KPI · Productivity Index (Previsto)",
    KPI_OPPROD_KICKER: "CNCS / CORE",
    KPI_OPPROD_DESC:
      "Canonical index (range): Σ(real_alloc) / Σ(prev_eff), with prev_eff = previsto × (hours/8). Family = category + description.",
    KPI_OPPROD_WINDOW: "Range",
    KPI_OPPROD_SELECTION: "Selection",
    KPI_OPPROD_SELECT_FILTERED: "Select filtered",
    KPI_OPPROD_CLEAR: "Clear",
    KPI_OPPROD_SHOW_DETAILS: "Show details",
    KPI_OPPROD_HIDE_DETAILS: "Hide details",
    KPI_OPPROD_SELECTED_N: "Selected: {n}",
    KPI_OPPROD_SCOPE_ACTIVE: "Active scope: {scope}",
    KPI_OPPROD_SCOPE_CAPO_NOTE:
      "Note: CAPO filtering requires capo_id in v2 views (inactive until exposed).",
    KPI_OPPROD_OPERATORS: "Operators",
    KPI_OPPROD_OPERATORS_HINT: "Select the list used to compute KPIs.",
    KPI_OPPROD_OPERATORS_DERIVED: "List is derived from data within the current range.",
    KPI_OPPROD_SEARCH_PLACEHOLDER: "Search operator…",
    KPI_OPPROD_TOTAL_IN_RANGE: "Total in range: {n}",

    KPI_OPPROD_KPI_SELECTED: "Selected operators",
    KPI_OPPROD_KPI_SELECTED_SUB: "Active list",
    KPI_OPPROD_KPI_HOURS: "Σ Hours (indexed)",
    KPI_OPPROD_KPI_HOURS_SUB: "Only QUANTITATIVE MT/PZ with previsto",
    KPI_OPPROD_KPI_PREV: "Σ Prev eff.",
    KPI_OPPROD_KPI_PREV_SUB: "previsto × (hours/8)",
    KPI_OPPROD_KPI_INDEX: "Index (global)",
    KPI_OPPROD_KPI_INDEX_SUB: "Σreal / Σprev",

    KPI_OPPROD_RESULTS: "Results",
    KPI_OPPROD_RESULTS_SUB: "Global index per operator (click for details).",
    KPI_OPPROD_ROWS: "Rows: {n}",

    KPI_OPPROD_TABLE_OPERATOR: "Operator",
    KPI_OPPROD_TABLE_HOURS: "Σ Hours",
    KPI_OPPROD_TABLE_PREV: "Σ Prev",
    KPI_OPPROD_TABLE_REAL: "Σ Real",
    KPI_OPPROD_TABLE_INDEX: "Index",
    KPI_OPPROD_TABLE_DAYS: "Days",

    KPI_OPPROD_EMPTY: "No data. Select operators or widen the range.",
    KPI_OPPROD_LOADING_LIST: "Loading list…",
    KPI_OPPROD_NO_OPERATOR: "No operator found",

    KPI_OPPROD_TOTAL_SELECTION: "Selection total",

    KPI_OPPROD_MODAL_TITLE: "Operator details",
    KPI_OPPROD_MODAL_FAMILIES: "Families detail",
    KPI_OPPROD_MODAL_TIME: "Time",
    KPI_OPPROD_MODAL_SUMMARY: "Summary",
    KPI_OPPROD_MODAL_NO_FAMILIES: "No indexable family in the selected range.",
    KPI_OPPROD_MODAL_TIME_TOTAL: "Total hours (all rows)",
    KPI_OPPROD_MODAL_TIME_INDEXED: "Indexed hours (MT/PZ with previsto)",
    KPI_OPPROD_MODAL_TIME_NON_INDEXED: "Non-indexed hours",
  },
};
