// src/modules/_ui/kit.tsx
// Primitives UI partagées par les modules (premium, theme-aware, mobile-first).
import type { ReactNode } from "react";
import { useTheme } from "../../hooks/useTheme";

export function useSurface() {
  const { effective } = useTheme();
  const isDark = effective === "dark";
  return {
    isDark,
    card: isDark
      ? "rounded-2xl border border-slate-800 bg-slate-900/60"
      : "rounded-2xl border border-slate-200 bg-white",
    subtle: isDark ? "text-slate-400" : "text-slate-500",
    chip: isDark
      ? "rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-xs"
      : "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs",
    input: isDark
      ? "w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm outline-none focus:border-sky-500"
      : "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500",
    btn: isDark
      ? "rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-medium hover:bg-slate-700/60"
      : "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100",
    btnPrimary:
      "rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50",
  };
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}): JSX.Element {
  const { subtle } = useSurface();
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className={`text-sm ${subtle}`}>{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  unit,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  tone?: "neutral" | "sky" | "emerald" | "amber" | "rose";
}): JSX.Element {
  const { card, subtle } = useSurface();
  const toneText: Record<string, string> = {
    neutral: "",
    sky: "text-sky-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
  };
  return (
    <div className={`${card} p-4`}>
      <div className={`text-[11px] uppercase tracking-[0.18em] ${subtle}`}>{label}</div>
      <div className={`mt-1 text-3xl font-bold ${toneText[tone]}`}>
        {value}
        {unit && <span className="ml-1 text-base font-medium">{unit}</span>}
      </div>
      {hint && <div className={`mt-1 text-xs ${subtle}`}>{hint}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }): JSX.Element {
  const { card } = useSurface();
  return <div className={`${card} ${className}`}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }): JSX.Element {
  const { subtle } = useSurface();
  return <div className={`py-10 text-center text-sm ${subtle}`}>{children}</div>;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "sky" | "emerald" | "amber" | "rose";
}): JSX.Element {
  const tones: Record<string, string> = {
    neutral: "bg-slate-500/15 text-slate-400",
    sky: "bg-sky-500/15 text-sky-400",
    emerald: "bg-emerald-500/15 text-emerald-400",
    amber: "bg-amber-500/15 text-amber-500",
    rose: "bg-rose-500/15 text-rose-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
