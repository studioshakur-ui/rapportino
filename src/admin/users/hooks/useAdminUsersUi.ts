// src/admin/users/hooks/useAdminUsersUi.ts

import { useMemo } from "react";
import type { ProfileRow } from "./useAdminUsersData";

export type RoleFilter = "ALL" | "CAPO" | "UFFICIO" | "MANAGER" | "DIREZIONE" | "ADMIN";

export const PAGE_SIZE = 25;

function safeLower(s: unknown): string {
  return String(s ?? "").toLowerCase();
}

export function useAdminUsersUi(args: { rows: ProfileRow[]; q: string; role: RoleFilter; page: number }) {
  const { rows, q, role, page } = args;

  const filtered = useMemo(() => {
    const qq = safeLower(q).trim();

    return (rows || []).filter((r) => {
      if (role !== "ALL" && r.app_role !== role) return false;
      if (!qq) return true;

      const hay =
        safeLower(r.email) +
        " " +
        safeLower(r.full_name) +
        " " +
        safeLower(r.display_name) +
        " " +
        safeLower(r.app_role) +
        " " +
        safeLower(r.default_costr) +
        " " +
        safeLower(r.default_commessa) +
        " " +
        safeLower((r.allowed_cantieri || []).join(" "));

      return hay.includes(qq);
    });
  }, [rows, q, role]);

  const totalPages = useMemo(() => {
    const n = Math.ceil(filtered.length / PAGE_SIZE);
    return Math.max(1, n);
  }, [filtered.length]);

  const clampedPage = useMemo(() => {
    return Math.min(Math.max(1, page), totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (clampedPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, clampedPage]);

  return {
    filtered,
    totalPages,
    page: clampedPage,
    pageRows,
  };
}