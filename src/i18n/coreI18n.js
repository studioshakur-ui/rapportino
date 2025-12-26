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

export const t = (lang, key) => {
  const dict = DICT[lang] || DICT.it;
  return dict[key] ?? (DICT.it[key] ?? key);
};

const DICT = {
  it: {
    // Common shell
    LANG: "Lingua",
    LOGOUT: "Logout",
    SHELL_ROLE: "Ruolo",
    SHELL_EXPAND: "Espandi menu",
    SHELL_COLLAPSE: "Riduci menu",
    SHELL_CONNECTION: "Connessione",

    // Admin
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
    ALLOWED_CANTIERI: "Allowed cantieri (CSV)",
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

    // Admin Perimeters
    PERIM_TITLE: "Perimetri · Ship · Manager · Squadre",
    PERIM_SUB:
      "Governa il perimetro: assegna Manager ai cantieri e gestisci le squadre (ship_operators).",
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

    // Manager (shell labels)
    MANAGER_SHELL_TITLE: "Manager",
    MANAGER_KICKER: "MANAGER · CNCS / CORE",
    MANAGER_TAB_DASHBOARD: "Dashboard",
    MANAGER_TAB_ASSIGNMENTS: "Assegnazioni",
    MANAGER_TAB_DRIVE: "CORE Drive",
    MANAGER_TAB_ANALYTICS: "Analytics",
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
    PERIM_SUB:
      "Gouvernance périmètre : assigner des Managers aux chantiers et gérer les équipes (ship_operators).",
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
    ALLOWED_CANTIERI: "Allowed yards (CSV)",
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

    PERIM_TITLE: "Perimeters · Ship · Manager · Crews",
    PERIM_SUB:
      "Perimeter governance: assign Managers to ships and manage crews (ship_operators).",
    PERIM_SELECT_SHIP: "Ship",
    PERIM_SCOPE: "Perimeter",
    PERIM_SCOPE_HINT: "Select a ship to administer (admin).",
    PERIM_MANAGERS: "Assigned managers",
    PERIM_ADD_MANAGER: "Add manager (email)",
    PERIM_REMOVE: "Remove",
    PERIM_ADD: "Add",
    PERIM_LOADING: "Loading…",
    PERIM_NO_SHIPS: "No ships found",
    PERIM_NO_MANAGERS: "No manager assigned",
    PERIM_OPS: "Operational crews",
    PERIM_OPS_HINT: "Operators linked to the selected ship.",
    PERIM_ADD_OP: "Quick add",
    PERIM_ADD_OP_TITLE: "Add operator",
    PERIM_ADD_OP_HINT: "Manual insert (no account). Linked to selected ship.",
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
  },
};
