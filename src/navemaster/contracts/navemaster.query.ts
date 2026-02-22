// src/navemaster/contracts/navemaster.query.ts
import type { NavSeverity, NavStatus } from "./navemaster.types";

export type NavemasterView = "cockpit" | "alerts" | "diff";

export type CockpitSortKey = "codice" | "stato_nav" | "sezione" | "zona_da" | "zona_a" | "last_proof_at";
export type SortDir = "asc" | "desc";

export type CockpitFilters = {
  search?: string; // matches marcacavo (ilike)
  navStatus?: NavStatus | "ALL";
  zona?: string | "ALL";
  sezione?: string | "ALL";
  onlyWithInca?: boolean;
  onlyModified?: boolean;
  onlyNoProof?: boolean;
};

export type AlertsFilters = {
  severity?: NavSeverity | "ALL";
  rule?: string | "ALL";
  search?: string; // marcacavo
};

export type DiffFilters = {
  severity?: NavSeverity | "ALL";
  rule?: string | "ALL";
  search?: string; // marcacavo
};

export type Paging = {
  page: number; // 1-based
  pageSize: number;
};

export type CockpitQuery = {
  shipId: string;
  filters: CockpitFilters;
  sort: { key: CockpitSortKey; dir: SortDir };
  paging: Paging;
};

export type AlertsQuery = {
  shipId: string;
  filters: AlertsFilters;
  paging: Paging;
};

export type DiffQuery = {
  shipId: string;
  filters: DiffFilters;
  paging: Paging;
};
