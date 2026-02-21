// src/admin/users/hooks/useAdminUsersPersist.ts

import { useEffect, useMemo, useState } from "react";

export type UsersPersistStateV1 = {
  q: string;
  role: string; // "ALL" | app_role
  page: number;
  selectedUserId: string | null;
};

const STORAGE_KEY = "core:admin:users-ui:v1";

function safeParse(raw: string | null): Partial<UsersPersistStateV1> | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    return obj as Partial<UsersPersistStateV1>;
  } catch {
    return null;
  }
}

function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  const i = Math.trunc(v);
  return Math.max(min, Math.min(max, i));
}

export function useAdminUsersPersist() {
  const initial = useMemo(() => {
    const parsed = safeParse(sessionStorage.getItem(STORAGE_KEY));
    return {
      q: typeof parsed?.q === "string" ? parsed.q : "",
      role: typeof parsed?.role === "string" ? parsed.role : "ALL",
      page: clampInt(parsed?.page, 1, 10_000, 1),
      selectedUserId: typeof parsed?.selectedUserId === "string" ? parsed.selectedUserId : null,
    } satisfies UsersPersistStateV1;
  }, []);

  const [q, setQ] = useState<string>(initial.q);
  const [role, setRole] = useState<string>(initial.role);
  const [page, setPage] = useState<number>(initial.page);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initial.selectedUserId);

  useEffect(() => {
    const snapshot: UsersPersistStateV1 = { q, role, page, selectedUserId };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // ignore
    }
  }, [q, role, page, selectedUserId]);

  return {
    q,
    setQ,
    role,
    setRole,
    page,
    setPage,
    selectedUserId,
    setSelectedUserId,
  };
}
