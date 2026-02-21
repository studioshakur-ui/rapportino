// src/admin/AdminConsoleContext.tsx
import React, { createContext, useContext } from "react";

export type AdminBreadcrumb = {
  label: string;
  to?: string;
};

export type AdminSearchItem = {
  id: string;
  entity: string;
  title: string;
  subtitle?: string;
  route?: string;
  tokens?: string;
  updatedAt?: string | null;
  badge?: string;
  badgeTone?: "slate" | "emerald" | "amber" | "rose" | "sky";
};

export type AdminRecentItem = {
  id: string;
  title: string;
  subtitle?: string;
  route?: string;
  timeLabel?: string;
};

export type AdminConsoleConfig = {
  kicker?: string;
  title?: string;
  breadcrumbs?: AdminBreadcrumb[];
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  rightDrawer?: React.ReactNode;
};

export type AdminConsoleContextValue = {
  config: AdminConsoleConfig;
  setConfig: (patch: Partial<AdminConsoleConfig>) => void;
  resetConfig: () => void;
  registerSearchItems: (entity: string, items: AdminSearchItem[]) => void;
  clearSearchItems: (entity: string) => void;
  searchItems: AdminSearchItem[];
  recentItems: AdminRecentItem[];
  setRecentItems: (items: AdminRecentItem[]) => void;
};

export const AdminConsoleContext = createContext<AdminConsoleContextValue | null>(null);

export function useAdminConsole(): AdminConsoleContextValue {
  const ctx = useContext(AdminConsoleContext);
  if (!ctx) {
    throw new Error("useAdminConsole must be used within AdminConsoleContext");
  }
  return ctx;
}
