// src/navemaster/hooks/useNavemasterContext.ts
import { useMemo } from "react";

import { useAuth } from "../../auth/AuthProvider";
import type { AppRole } from "../contracts/navemaster.types";

export type NavemasterAccess = {
  role: AppRole | null;
  canRead: boolean;
  canImport: boolean; // ABD: UFFICIO + ADMIN
  isReadOnly: boolean; // CAPO + DIREZIONE are read-only
};

export function useNavemasterAccess(): NavemasterAccess {
  const { profile } = useAuth();
  const role = profile?.app_role ?? null;

  // B2: CAPO is read-only (scoped by RLS on navemaster_* tables).
  const canRead = role === "UFFICIO" || role === "DIREZIONE" || role === "ADMIN" || role === "MANAGER" || role === "CAPO";
  const canImport = role === "UFFICIO" || role === "ADMIN";
  const isReadOnly = canRead && !canImport;

  return useMemo(() => ({ role, canRead, canImport, isReadOnly }), [role, canRead, canImport, isReadOnly]);
}
