// src/admin/shell/adminNav.ts

import type { Crumb } from "./adminUtils";
import type { AdminConsoleConfig } from "../AdminConsoleContext";

export type AdminMenuItem = {
  to: string;
  label: string;
  active: boolean;
};

export function buildAdminMenu(pathname: string): AdminMenuItem[] {
  const is = (p: string) => pathname.startsWith(p);
  return [
    { to: "/admin/users", label: "Utenti", active: is("/admin/users") },
    { to: "/admin/operators", label: "Operatori", active: is("/admin/operators") },
    { to: "/admin/perimetri", label: "Perimetri", active: is("/admin/perimetri") },
    { to: "/admin/catalogo", label: "Catalogo", active: is("/admin/catalogo") },
    { to: "/admin/planning", label: "Planning (overview)", active: is("/admin/planning") },
    { to: "/admin/assignments", label: "Assignments (Manager ↔ Capo)", active: is("/admin/assignments") || is("/admin/assegnazioni") || is("/admin/assignment") },
    { to: "/admin/audit", label: "Audit planning", active: is("/admin/audit") },
    { to: "/admin/core-drive", label: "CORE Drive", active: is("/admin/core-drive") || is("/admin/archive") },
  ];
}

function baseConfig(): AdminConsoleConfig {
  return {
    kicker: "ADMIN · CNCS / CORE",
    title: "Console Admin",
    breadcrumbs: [{ label: "Admin", to: "/admin/users" }],
    searchPlaceholder: "Cerca in Admin (⌘K / Ctrl+K)",
  };
}

export function defaultConsoleConfig(pathname: string): AdminConsoleConfig {
  const base = baseConfig();

  const crumbs = (labels: Array<Crumb>): Crumb[] => labels;

  if (pathname.startsWith("/admin/users")) {
    return {
      ...base,
      title: "Utenti",
      breadcrumbs: crumbs([{ label: "Admin", to: "/admin/users" }, { label: "Utenti" }]),
      searchPlaceholder: "Cerca utenti, email, ruolo…",
    };
  }
  if (pathname.startsWith("/admin/operators")) {
    return {
      ...base,
      title: "Operatori",
      breadcrumbs: crumbs([{ label: "Admin", to: "/admin/users" }, { label: "Operatori" }]),
      searchPlaceholder: "Cerca operatori, codici, ruoli…",
    };
  }
  if (pathname.startsWith("/admin/perimetri")) {
    return {
      ...base,
      title: "Perimetri",
      breadcrumbs: crumbs([{ label: "Admin", to: "/admin/users" }, { label: "Perimetri" }]),
      searchPlaceholder: "Cerca navi, operatori, perimetri…",
    };
  }
  if (pathname.startsWith("/admin/catalogo")) {
    return {
      ...base,
      title: "Catalogo",
      breadcrumbs: crumbs([{ label: "Admin", to: "/admin/users" }, { label: "Catalogo" }]),
      searchPlaceholder: "Cerca attività, categorie, sinonimi…",
    };
  }
  if (pathname.startsWith("/admin/planning")) {
    return {
      ...base,
      title: "Planning",
      breadcrumbs: crumbs([{ label: "Admin", to: "/admin/users" }, { label: "Planning" }]),
      searchPlaceholder: "Cerca piani, capi, manager, operatori…",
    };
  }
  if (pathname.startsWith("/admin/assignments") || pathname.startsWith("/admin/assegnazioni") || pathname.startsWith("/admin/assignment")) {
    return {
      ...base,
      title: "Manager ↔ Capo",
      breadcrumbs: crumbs([{ label: "Admin", to: "/admin/users" }, { label: "Manager ↔ Capo" }]),
      searchPlaceholder: "Cerca capi o manager…",
    };
  }
  if (pathname.startsWith("/admin/audit")) {
    return {
      ...base,
      title: "Audit planning",
      breadcrumbs: crumbs([{ label: "Admin", to: "/admin/users" }, { label: "Audit planning" }]),
      searchPlaceholder: "Cerca azioni, attori, plan_id…",
    };
  }
  if (pathname.startsWith("/admin/core-drive") || pathname.startsWith("/admin/archive")) {
    return {
      ...base,
      title: "CORE Drive",
      breadcrumbs: crumbs([{ label: "Admin", to: "/admin/users" }, { label: "CORE Drive" }]),
      searchPlaceholder: "Cerca in CORE Drive…",
    };
  }

  return base;
}
