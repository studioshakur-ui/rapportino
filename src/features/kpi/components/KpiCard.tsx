// src/components/kpi/KpiCard.jsx
import type { ReactNode } from "react";
import { cn } from "../../../ui/cn";

export default function KpiCard({
  label,
  value,
  sub,
  tone = "neutral", // neutral | sky | emerald | fuchsia | rose
  onClick,
  isDark = true,
  hint,
}: {
  label?: ReactNode;
  value?: ReactNode;
  sub?: ReactNode;
  tone?: string;
  onClick?: () => void;
  isDark?: boolean;
  hint?: ReactNode;
}) {
  const toneBorder =
    tone === "sky"
      ? "border-sky-500/25"
      : tone === "emerald"
      ? "border-emerald-500/25"
      : tone === "fuchsia"
      ? "border-fuchsia-500/25"
      : tone === "rose"
      ? "border-rose-500/25"
      : "border-slate-700/50";

  const toneGlow =
    tone === "sky"
      ? "hover:shadow-[0_0_0_1px_rgba(56,189,248,0.14),0_14px_50px_rgba(56,189,248,0.12)]"
      : tone === "emerald"
      ? "hover:shadow-[0_0_0_1px_rgba(16,185,129,0.14),0_14px_50px_rgba(16,185,129,0.12)]"
      : tone === "fuchsia"
      ? "hover:shadow-[0_0_0_1px_rgba(217,70,239,0.14),0_14px_50px_rgba(217,70,239,0.12)]"
      : tone === "rose"
      ? "hover:shadow-[0_0_0_1px_rgba(244,63,94,0.14),0_14px_50px_rgba(244,63,94,0.12)]"
      : "hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_14px_50px_rgba(0,0,0,0.35)]";

  const card = (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 transition",
        isDark ? "bg-slate-950/55" : "bg-white",
        toneBorder,
        onClick ? "cursor-pointer" : "",
        onClick ? "hover:bg-slate-950/70" : "",
        onClick ? toneGlow : "",
        "group"
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      aria-label={typeof label === "string" ? label : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("text-[11px] uppercase tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600")}>
          {label}
        </div>
        {onClick ? (
          <div className={cn("text-[11px] tracking-[0.18em]", isDark ? "text-slate-500" : "text-slate-600")}>→</div>
        ) : null}
      </div>

      <div className={cn("mt-1 text-2xl font-semibold", isDark ? "text-slate-50" : "text-slate-900")}>{value}</div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <div className={cn("text-[11px]", isDark ? "text-slate-500" : "text-slate-600")}>{sub}</div>
        {hint && onClick ? (
          <div
            className={cn(
              "text-[10px] uppercase tracking-[0.18em] opacity-0 group-hover:opacity-100 transition",
              isDark ? "text-slate-400" : "text-slate-500"
            )}
          >
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  );

  return card;
}
