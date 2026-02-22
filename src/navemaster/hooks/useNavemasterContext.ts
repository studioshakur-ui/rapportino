// src/navemaster/hooks/useNavemasterContext.ts
import { useMemo } from "react";
import { useAuth } from "../../auth/AuthProvider";
import type { AppRole } from "../contracts/navemaster.types";

export type NavemasterAccess = {
  role: AppRole | null;
  canRead: boolean;
  canImport: boolean; // ABD: UFFICIO + ADMIN
};

export function useNavemasterAccess(): NavemasterAccess {
  const { profile } = useAuth();
  const role = (profile?.app_role ?? null) as AppRole | null;

  const canRead = role === "UFFICIO" || role === "DIREZIONE" || role === "ADMIN";
  const canImport = role === "UFFICIO" || role === "ADMIN";

  return useMemo(() => ({ role, canRead, canImport }), [role, canRead, canImport]);
}