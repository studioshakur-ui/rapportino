// /src/components/core-drive/coreDriveViews.js
// CORE Drive “Lens” system (CORE 1.0)
// - Un seul CORE Drive, présent dans tous les shells
// - Chaque shell applique une vue (scope + capacités + UX) sans dupliquer les pages

function safeUpper(v) {
  return String(v || "").trim().toUpperCase();
}

function startsWithPath(pathname, base) {
  const p = String(pathname || "");
  const b = String(base || "");
  return p === b || p.startsWith(b + "/");
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

export function resolveCoreDriveView({ pathname, appRole, currentShip }) {
  const role = safeUpper(appRole);
  const p = String(pathname || "");

  const isCapoShell = startsWithPath(p, "/app");
  const isUfficioShell = startsWithPath(p, "/ufficio");
  const isManagerShell = startsWithPath(p, "/manager");
  const isAdminShell = startsWithPath(p, "/admin");
  const isDirectionShell = startsWithPath(p, "/direction");
  const isDirectionUfficioView = startsWithPath(p, "/direction/ufficio-view");

  // CAPO: scope strict sur la nave courante
  if (isCapoShell) {
    const cantiere = firstNonEmpty(currentShip?.yard, currentShip?.code);
    return {
      id: "CAPO",
      kicker: "CORE Drive",
      title: "Centro documentale (scope CAPO)",
      badges: ["CAPO", cantiere ? `CANTIERE ${cantiere}` : "CANTIERE"],
      storage: { tabKey: "coreDrive.tab.CAPO" },
      tabs: [
        { key: "DOCS", label: "Documents" },
        { key: "RAPPORTINI_V1", label: "Storico Rapportini (v1)" },
      ],
      docs: {
        allowedViews: ["LIST", "TIMELINE"],
        defaultView: "LIST",
        showUpload: true,
        canDelete: false,
        canFreeze: false,
        initialFilters: {
          cantiere,
          origine: "CAPO",
        },
        lockedFilters: {
          cantiere: true,
          origine: true,
        },
        defaultOrigine: "CAPO",
        defaultCantiere: cantiere,
      },
    };
  }

  // ADMIN: full control
  if (isAdminShell || role === "ADMIN") {
    return {
      id: "ADMIN",
      kicker: "CORE Drive",
      title: "Centro documentale (Admin)",
      badges: ["ADMIN", "AUDIT"],
      storage: { tabKey: "coreDrive.tab.ADMIN" },
      tabs: [
        { key: "DOCS", label: "Documents" },
        { key: "RAPPORTINI_V1", label: "Storico Rapportini (v1)" },
      ],
      docs: {
        allowedViews: ["LIST", "TIMELINE", "COMPARE"],
        defaultView: "LIST",
        showUpload: true,
        canDelete: true,
        canFreeze: true,
        initialFilters: {},
        lockedFilters: {},
        defaultOrigine: "SYSTEM",
      },
    };
  }

  // Direction “Ufficio view” : lecture + origine verrouillée
  if (isDirectionUfficioView) {
    return {
      id: "DIREZIONE_UFFICIO_VIEW",
      kicker: "CORE Drive",
      title: "Vista Ufficio (lettura)",
      badges: ["DIREZIONE", "LETTURA"],
      storage: { tabKey: "coreDrive.tab.DIREZIONE_UFFICIO" },
      tabs: [
        { key: "DOCS", label: "Documents" },
        { key: "RAPPORTINI_V1", label: "Storico Rapportini (v1)" },
      ],
      docs: {
        allowedViews: ["LIST", "TIMELINE"],
        defaultView: "LIST",
        showUpload: false,
        canDelete: false,
        canFreeze: false,
        initialFilters: {
          origine: "UFFICIO",
        },
        lockedFilters: {
          origine: true,
        },
        defaultOrigine: "UFFICIO",
      },
    };
  }

  // Direction (général) : lecture soft
  if (isDirectionShell || role === "DIREZIONE") {
    return {
      id: "DIREZIONE",
      kicker: "CORE Drive",
      title: "Centro documentale (Direzione)",
      badges: ["DIREZIONE"],
      storage: { tabKey: "coreDrive.tab.DIREZIONE" },
      tabs: [
        { key: "DOCS", label: "Documents" },
        { key: "RAPPORTINI_V1", label: "Storico Rapportini (v1)" },
      ],
      docs: {
        allowedViews: ["LIST", "TIMELINE"],
        defaultView: "LIST",
        showUpload: false,
        canDelete: false,
        canFreeze: false,
        initialFilters: {},
        lockedFilters: {},
      },
    };
  }

  // Manager shell : opérationnel, mais UX simplifiée
  if (isManagerShell || role === "MANAGER") {
    return {
      id: "MANAGER",
      kicker: "CORE Drive",
      title: "Centro documentale (Manager)",
      badges: ["MANAGER"],
      storage: { tabKey: "coreDrive.tab.MANAGER" },
      tabs: [
        { key: "DOCS", label: "Documents" },
        { key: "RAPPORTINI_V1", label: "Storico Rapportini (v1)" },
      ],
      docs: {
        allowedViews: ["LIST", "TIMELINE"],
        defaultView: "LIST",
        showUpload: true,
        canDelete: true,
        canFreeze: false,
        initialFilters: {
          origine: "MANAGER",
        },
        lockedFilters: {
          // Manager peut filtrer librement si besoin ; origine pré-remplie mais pas lockée.
        },
        defaultOrigine: "MANAGER",
      },
    };
  }

  // Ufficio (default) : full UX
  if (isUfficioShell) {
    const isReadOnly = role === "DIREZIONE";
    return {
      id: isReadOnly ? "DIREZIONE_IN_UFFICIO" : "UFFICIO",
      kicker: "CORE Drive",
      title: isReadOnly ? "Ufficio (lettura)" : "Centro documentale (Ufficio)",
      badges: [role || "UFFICIO", isReadOnly ? "LETTURA" : "OPERATIVO"],
      storage: { tabKey: isReadOnly ? "coreDrive.tab.DIREZIONE_IN_UFFICIO" : "coreDrive.tab.UFFICIO" },
      tabs: [
        { key: "DOCS", label: "Documents" },
        { key: "RAPPORTINI_V1", label: "Storico Rapportini (v1)" },
      ],
      docs: {
        allowedViews: isReadOnly ? ["LIST", "TIMELINE"] : ["LIST", "TIMELINE", "COMPARE"],
        defaultView: "LIST",
        showUpload: !isReadOnly,
        canDelete: !isReadOnly,
        canFreeze: role === "UFFICIO" || role === "ADMIN",
        initialFilters: {},
        lockedFilters: {},
        defaultOrigine: role || "UFFICIO",
      },
    };
  }

  // Fallback safe
  return {
    id: "DEFAULT",
    kicker: "CORE Drive",
    title: "Centro documentale",
    badges: [role || "STAFF"],
    storage: { tabKey: "coreDrive.tab.DEFAULT" },
    tabs: [
      { key: "DOCS", label: "Documents" },
      { key: "RAPPORTINI_V1", label: "Storico Rapportini (v1)" },
    ],
    docs: {
      allowedViews: ["LIST", "TIMELINE"],
      defaultView: "LIST",
      showUpload: false,
      canDelete: false,
      canFreeze: false,
      initialFilters: {},
      lockedFilters: {},
    },
  };
}
