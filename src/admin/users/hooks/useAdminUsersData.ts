// src/admin/users/hooks/useAdminUsersData.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export type AppRole = "CAPO" | "UFFICIO" | "MANAGER" | "DIREZIONE" | "ADMIN";

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  app_role: AppRole | null;
  default_costr: string | null;
  default_commessa: string | null;
  allowed_cantieri: string[] | null;
  must_change_password?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  disabled_at?: string | null;
};

type CreateUserPayload = {
  email: string;
  app_role: AppRole;
  full_name?: string;
  display_name?: string;
  default_costr?: string | null;
  default_commessa?: string | null;
  allowed_cantieri?: string[] | null;
};

function lower(s: unknown): string {
  return String(s ?? "").toLowerCase();
}

type PgRestishError = {
  code?: string | null;
  message?: string | null;
  details?: unknown;
  hint?: unknown;
};

/**
 * Robust detection of missing-column errors across PostgREST / supabase-js variants.
 *
 * We MUST be tolerant because environments may lag migrations (preview/prod/local).
 */
function isMissingColumnError(err: unknown, col: string): boolean {
  const e = err as PgRestishError;
  const code = String(e?.code ?? "");
  const msg = lower(e?.message ?? err);

  // Postgres undefined_column
  if (code === "42703") return msg.includes(col);

  // Typical message: "column profiles.disabled_at does not exist"
  return msg.includes("does not exist") && msg.includes("column") && msg.includes(col);
}

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseCsv(raw: string): string[] | null {
  const s = raw.trim();
  if (!s) return null;
  const arr = s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return arr.length ? arr : null;
}

export function useAdminUsersData() {
  const [loading, setLoading] = useState<boolean>(true);
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const [lastPassword, setLastPassword] = useState<string | null>(null);
  const [lastPasswordEmail, setLastPasswordEmail] = useState<string | null>(null);

  const supportsDisabledAtRef = useRef<boolean | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLastError(null);

    const selectWith =
      "id,email,full_name,display_name,app_role,default_costr,default_commessa,allowed_cantieri,must_change_password,created_at,updated_at,disabled_at";
    const selectWithout =
      "id,email,full_name,display_name,app_role,default_costr,default_commessa,allowed_cantieri,must_change_password,created_at,updated_at";

    try {
      const preferWith = supportsDisabledAtRef.current !== false;
      const { data, error } = await supabase
        .from("profiles")
        .select(preferWith ? selectWith : selectWithout)
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) {
        if (preferWith && isMissingColumnError(error, "disabled_at")) {
          supportsDisabledAtRef.current = false;
          const retry = await supabase
            .from("profiles")
            .select(selectWithout)
            .order("created_at", { ascending: false })
            .limit(2000);
          if (retry.error) throw retry.error;
          setRows((retry.data as unknown as ProfileRow[]) || []);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (preferWith) supportsDisabledAtRef.current = true;
      setRows((data as unknown as ProfileRow[]) || []);
    } catch (e: any) {
      console.error("[useAdminUsersData] loadUsers error:", e);
      setRows([]);
      setLastError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const createUser = useCallback(
    async (payload: CreateUserPayload) => {
      setLastError(null);
      setLastPassword(null);
      setLastPasswordEmail(null);

      const body: CreateUserPayload = {
        ...payload,
        email: normEmail(payload.email),
      };

      const { data, error } = await supabase.functions.invoke("admin-create-user", { body });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Create user failed");

      if (data?.password) {
        setLastPassword(String(data.password));
        setLastPasswordEmail(String(data.email || body.email));
      }

      await loadUsers();
      return data;
    },
    [loadUsers]
  );

  const setPassword = useCallback(
    async (userId: string) => {
      setLastError(null);
      setLastPassword(null);
      setLastPasswordEmail(null);

      const { data, error } = await supabase.functions.invoke("admin-set-password", { body: { user_id: userId } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Set password failed");

      if (data?.password) setLastPassword(String(data.password));
      if (data?.email) setLastPasswordEmail(String(data.email));

      await loadUsers();
      return data;
    },
    [loadUsers]
  );

  const suspendUser = useCallback(
    async (userId: string, reason?: string) => {
      setLastError(null);
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId, mode: "suspend", reason: reason || "Admin suspend" },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Suspend failed");
      await loadUsers();
      return data;
    },
    [loadUsers]
  );

  const reactivateUser = useCallback(
    async (userId: string, reason?: string) => {
      setLastError(null);
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId, mode: "reactivate", reason: reason || "Admin reactivate" },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Reactivate failed");
      await loadUsers();
      return data;
    },
    [loadUsers]
  );

  const hardDeleteUser = useCallback(
    async (userId: string, reason?: string) => {
      setLastError(null);
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId, mode: "hard_delete", reason: reason || "Admin hard delete" },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Hard delete failed");
      await loadUsers();
      return data;
    },
    [loadUsers]
  );

  const supportsDisabledAt = useMemo(() => supportsDisabledAtRef.current === true, [rows]);

  return {
    loading,
    rows,
    lastError,
    loadUsers,

    createUser,
    setPassword,
    suspendUser,
    reactivateUser,
    hardDeleteUser,

    lastPassword,
    lastPasswordEmail,

    supportsDisabledAt,
    parseCsv,
  };
}
