// src/components/charts/CoreChartCard.tsx
// CORE / CNCS — Chart Container Card (typed) — light-safe

import React from "react";

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export type CoreChartCardProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  isDark?: boolean;
  className?: string;
};

export default function CoreChartCard({
  title,
  subtitle,
  rightSlot,
  children,
  isDark = true,
  className = "",
}: CoreChartCardProps): JSX.Element {
  // IMPORTANT:
  // We do NOT hardcode bg-slate-* anymore.
  // Charts must be coherent in Light (panel/panel2) and never look like “dark pasted inside”.
  const card = cn("theme-scope theme-panel theme-border theme-shadow-1", "rounded-2xl p-4", className);

  const titleCls = cn("text-[11px] uppercase tracking-[0.16em]", "theme-text-muted");
  const subtitleCls = cn("mt-1 text-[12px]", isDark ? "text-slate-300" : "theme-text-muted");

  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          {title ? <div className={titleCls}>{title}</div> : null}
          {subtitle ? <div className={subtitleCls}>{subtitle}</div> : null}
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
      {children}
    </section>
  );
}