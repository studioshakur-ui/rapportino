// src/admin/i18n.js
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
    ADMIN_TITLE: "Admin · Governance CORE",
    ADMIN_SUB: "Creazione account, controllo ruoli, perimetri, audit.",
    TAB_USERS: "Utenti",
    TAB_SETTINGS: "Impostazioni",
    LANG: "Lingua",
    LOGOUT: "Logout",
    SEARCH: "Cerca",
    ROLE: "Ruolo",
    COSTR: "COSTR",
    COMMESSA: "Commessa",
    CANTIERI: "Cantieri",
    RESET: "Reset",
    CREATE_USER: "Crea nuovo account",
    EMAIL: "Email",
    PASSWORD: "Password",
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
    OPEN: "Apri",
    NO_ROWS: "Nessun risultato.",
    PAGE: "Pagina",
    PREV: "Indietro",
    NEXT: "Avanti",
  },
  fr: {
    ADMIN_TITLE: "Admin · Gouvernance CORE",
    ADMIN_SUB: "Création comptes, contrôle rôles, périmètres, audit.",
    TAB_USERS: "Utilisateurs",
    TAB_SETTINGS: "Paramètres",
    LANG: "Langue",
    LOGOUT: "Déconnexion",
    SEARCH: "Rechercher",
    ROLE: "Rôle",
    COSTR: "COSTR",
    COMMESSA: "Commessa",
    CANTIERI: "Chantiers",
    RESET: "Reset",
    CREATE_USER: "Créer un compte",
    EMAIL: "Email",
    PASSWORD: "Mot de passe",
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
    OPEN: "Ouvrir",
    NO_ROWS: "Aucun résultat.",
    PAGE: "Page",
    PREV: "Précédent",
    NEXT: "Suivant",
  },
  en: {
    ADMIN_TITLE: "Admin · CORE Governance",
    ADMIN_SUB: "Account creation, role control, perimeters, audit.",
    TAB_USERS: "Users",
    TAB_SETTINGS: "Settings",
    LANG: "Language",
    LOGOUT: "Logout",
    SEARCH: "Search",
    ROLE: "Role",
    COSTR: "COSTR",
    COMMESSA: "Commessa",
    CANTIERI: "Yards",
    RESET: "Reset",
    CREATE_USER: "Create account",
    EMAIL: "Email",
    PASSWORD: "Password",
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
    OPEN: "Open",
    NO_ROWS: "No results.",
    PAGE: "Page",
    PREV: "Prev",
    NEXT: "Next",
  },
};
