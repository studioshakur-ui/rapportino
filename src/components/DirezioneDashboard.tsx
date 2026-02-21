// src/components/DirezioneDashboard.tsx
import type { ReactNode } from "react";
import DashboardDirezionePage from "../direzione/DashboardDirezionePage";

export type DirezioneDashboardProps = {
  isDark?: boolean;
  kpiModel?: unknown;
  verdictModel?: unknown;
  costr?: string;
  commessa?: string;
  windowFrom?: string;
  windowTo?: string;
  onResetFilters?: () => void;
  onChangeCostr?: (v: string) => void;
  onChangeCommessa?: (v: string) => void;
  onChangeWindowFrom?: (v: string) => void;
  onChangeWindowTo?: (v: string) => void;
  headerRight?: ReactNode;
};

export default function DirezioneDashboard(props: DirezioneDashboardProps) {
  return <DashboardDirezionePage {...(props as any)} />;
}
