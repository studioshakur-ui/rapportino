// src/components/kpi/KpiCard.tsx
import type { ReactNode } from "react";
import { cn } from "../../../ui/cn";

export default function KpiCard({
  label,
  value,
  sub,
  tone = "neutral", // neutral | sky | emerald | fuchsia | rose
  onClick,
  hint,
}: {
  label?: ReactNode;
  value?: ReactNode;
  sub?: ReactNode;
  tone?: string;
  onClick?: () => void;
  hint?: ReactNode;
  isDark?: boolean;
}) {
  const toneClass =
    tone === "sky"
      ? "kpi-tone-sky"
      : tone === "emerald"
      ? "kpi-tone-emerald"
      : tone === "fuchsia"
      ? "kpi-tone-fuchsia"
      : tone === "rose"
      ? "kpi-tone-rose"
      : "kpi-tone-neutral";

  const card = (
    <div
      className={cn(
        "kpi-card",
        toneClass,
        onClick ? "kpi-card--interactive" : "",
        onClick ? "cursor-pointer" : "",
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
        <div className="text-[11px] uppercase tracking-[0.18em] theme-text-muted">
          {label}
        </div>
        {onClick ? (
          <div className="text-[11px] tracking-[0.18em] theme-text-muted">→</div>
        ) : null}
      </div>

      <div className="mt-1 text-[26px] font-bold theme-text">{value}</div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="text-[11px] theme-text-muted">{sub}</div>
        {hint && onClick ? (
          <div
            className="text-[10px] uppercase tracking-[0.18em] opacity-0 group-hover:opacity-100 transition theme-text-muted"
          >
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  );

  return card;
}
