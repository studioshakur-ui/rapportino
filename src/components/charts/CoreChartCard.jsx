// /src/components/charts/CoreChartCard.jsx
// CORE / CNCS — Chart Container Card (consistent layout for all charts)

import React from "react";
import { CORE_CHART_THEME } from "./coreChartTheme";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function CoreChartCard({
  title,
  subtitle,
  rightSlot,
  children,
  isDark = true,
  className = "",
}) {
  const card = cn(
    "rounded-2xl border bg-slate-950/70",
    isDark ? "border-slate-800" : "border-slate-200 bg-white",
    "p-4",
    className
  );

  const titleCls = cn(
    "text-[11px] uppercase tracking-[0.16em]",
    isDark ? "text-slate-500" : "text-slate-500"
  );

  const subtitleCls = cn(
    "mt-1 text-[12px]",
    isDark ? "text-slate-300" : "text-slate-700"
  );

  return (
    <section className={card} style={{ background: CORE_CHART_THEME.bg }}>
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
