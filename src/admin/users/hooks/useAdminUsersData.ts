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

  /**
   * AUTH SIGNALS (SOURCE OF TRUTH FOR ACTIVITY)
   * Provided by ADMIN-only RPC: public.admin_list_users_v1
   */
  auth_created_at?: string | null;
  last_sign_in_at?: string | null;
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

  /**
   * Activity provenance (CNCS): whether auth.users signals are available.
   * - "RPC" means last_sign_in_at/auth_created_at are trustworthy.
   * - "FALLBACK" means we are listing profiles without auth activity signals.
   */
  const [activitySource, setActivitySource] = useState<
    | { mode: "RPC" }
    | { mode: "FALLBACK"; reason: "AUTH" | "NOT_SUPPORTED" | "NETWORK" | "UNKNOWN" }
  >({ mode: "FALLBACK", reason: "UNKNOWN" });

  const [lastPassword, setLastPassword] = useState<string | null>(null);
  const [lastPasswordEmail, setLastPasswordEmail] = useState<string | null>(null);

  const supportsDisabledAtRef = useRef<boolean | null>(null);
  const supportsAdminRpcRef = useRef<boolean | null>(null);

  function isAuthishRpcError(err: unknown): boolean {
    const e = err as PgRestishError;
    const code = String(e?.code ?? "");
    const msg = lower(e?.message ?? err);

    // Postgres invalid_authorization_specification / not authenticated
    if (code === "28000") return true;

    // common PostgREST auth shapes
    if (code.startsWith("PGRST") && msg.includes("not authenticated")) return true;
    if (msg.includes("not authenticated")) return true;
    if (msg.includes("jwt") && (msg.includes("expired") || msg.includes("invalid"))) return true;
    if (msg.includes("missing") && msg.includes("authorization")) return true;

    return false;
  }

  function isRpcNotSupportedError(err: unknown): boolean {
    const e = err as PgRestishError;
    const code = String(e?.code ?? "");
    const msg = lower(e?.message ?? err);

    // PostgREST "function not found" / schema cache mismatch
    if (code === "PGRST202") return true;
    if (msg.includes("could not find the function")) return true;
    if (msg.includes("function") && msg.includes("does not exist")) return true;
    if (msg.includes("schema cache") && (msg.includes("not found") || msg.includes("reload"))) return true;
    return false;
  }

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLastError(null);

    const selectWith =
      "id,email,full_name,display_name,app_role,default_costr,default_commessa,allowed_cantieri,must_change_password,created_at,updated_at,disabled_at";
    const selectWithout =
      "id,email,full_name,display_name,app_role,default_costr,default_commessa,allowed_cantieri,must_change_password,created_at,updated_at";

    try {
      // =========================================================
      // Preferred (CNCS-grade): AUTH-backed activity via RPC
      // - exposes auth.users.last_sign_in_at
      // - guarded server-side (ADMIN-only)
      // =========================================================
      if (supportsAdminRpcRef.current !== false) {
        // First try
        let rpc = await supabase.rpc("admin_list_users_v1", { p_q: null, p_role: null });

        // If auth-ish error, attempt a single silent refresh and retry once.
        if (rpc.error && isAuthishRpcError(rpc.error)) {
          try {
            await supabase.auth.refreshSession();
          } catch {
            // ignore
          }
          rpc = await supabase.rpc("admin_list_users_v1", { p_q: null, p_role: null });
        }

        if (!rpc.error) {
          const rpcRows = (rpc.data as unknown as ProfileRow[]) || [];
          supportsAdminRpcRef.current = true;
          // If RPC works, we can trust disabled_at presence (it is selected in the function).
          supportsDisabledAtRef.current = true;
          setActivitySource({ mode: "RPC" });

          // RPC ok but empty -> fallback to profiles to avoid false empty state
          if (rpcRows.length > 0) {
            setRows(rpcRows);
            setLoading(false);
            return;
          }
        } else {
          // IMPORTANT CNCS: never "brick" RPC after a transient auth/network error.
          if (isRpcNotSupportedError(rpc.error)) {
            supportsAdminRpcRef.current = false;
            setActivitySource({ mode: "FALLBACK", reason: "NOT_SUPPORTED" });
          } else if (isAuthishRpcError(rpc.error)) {
            setActivitySource({ mode: "FALLBACK", reason: "AUTH" });
          } else {
            setActivitySource({ mode: "FALLBACK", reason: "NETWORK" });
          }
        }
      }

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

      // If we got here without a prior explicit activitySource, declare fallback.
      setActivitySource((prev) => {
        if (prev.mode === "RPC") return prev;
        return prev.mode === "FALLBACK" ? prev : { mode: "FALLBACK", reason: "UNKNOWN" };
      });
    } catch (e: any) {
      console.error("[useAdminUsersData] loadUsers error:", e);
      setRows([]);
      setLastError(e?.message || String(e));
      setActivitySource({ mode: "FALLBACK", reason: "UNKNOWN" });
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

    activitySource,

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
