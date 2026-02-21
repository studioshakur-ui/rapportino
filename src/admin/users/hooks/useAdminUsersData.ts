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

function isMissingColumnError(msg: string, col: string): boolean {
  const m = lower(msg);
  return m.includes("does not exist") && m.includes(`column`) && m.includes(col);
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

/**
 * Appel direct aux Edge Functions via fetch natif.
 *
 * Pourquoi : supabase.functions.invoke() déclenche un preflight OPTIONS que
 * Supabase gateway rejette avec 405 si le header apikey est absent de la
 * requête OPTIONS elle-même. En appelant fetch directement avec
 * Content-Type: application/json + Authorization + apikey, le browser
 * considère la requête comme "simple" (pas de preflight) et Supabase
 * l'accepte directement.
 */
async function invokeAdminFunction(
  name: string,
  body: unknown,
  accessToken: string
): Promise<Record<string, unknown>> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    throw new Error(
      (data?.error as string | undefined) || `HTTP ${res.status}`
    );
  }

  return data;
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("No active session");
  return session.access_token;
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
        const msg = error.message || String(error);
        if (preferWith && isMissingColumnError(msg, "disabled_at")) {
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
    } catch (e: unknown) {
      console.error("[useAdminUsersData] loadUsers error:", e);
      setRows([]);
      setLastError((e as Error)?.message || String(e));
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

      const token = await getAccessToken();
      const data = await invokeAdminFunction("admin-create-user", body, token);

      if (!data?.ok) throw new Error((data?.error as string) || "Create user failed");

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

      const token = await getAccessToken();
      const data = await invokeAdminFunction(
        "admin-set-password",
        { user_id: userId },
        token
      );

      if (!data?.ok) throw new Error((data?.error as string) || "Set password failed");

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

      const token = await getAccessToken();
      const data = await invokeAdminFunction(
        "admin-delete-user",
        { user_id: userId, mode: "suspend", reason: reason || "Admin suspend" },
        token
      );

      if (!data?.ok) throw new Error((data?.error as string) || "Suspend failed");
      await loadUsers();
      return data;
    },
    [loadUsers]
  );

  const hardDeleteUser = useCallback(
    async (userId: string, reason?: string) => {
      setLastError(null);

      const token = await getAccessToken();
      const data = await invokeAdminFunction(
        "admin-delete-user",
        { user_id: userId, mode: "hard_delete", reason: reason || "Admin hard delete" },
        token
      );

      if (!data?.ok) throw new Error((data?.error as string) || "Hard delete failed");
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
    hardDeleteUser,

    lastPassword,
    lastPasswordEmail,

    supportsDisabledAt,
    parseCsv,
  };
}
