// /src/components/core-drive/ui/Badge.jsx
import type { ReactNode } from "react";

export default function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children?: ReactNode;
  tone?: string;
  className?: string;
}) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium";
  const map: Record<string, string> = {
    neutral: "border-slate-800 bg-slate-950/60 text-slate-200",
    ok: "border-emerald-700/60 bg-emerald-950/20 text-emerald-200",
    info: "border-sky-700/60 bg-sky-950/20 text-sky-200",
    warn: "border-amber-700/60 bg-amber-950/20 text-amber-200",
    danger: "border-rose-800/60 bg-rose-950/20 text-rose-200",
  };
  return <span className={`${base} ${map[tone] || map.neutral} ${className}`}>{children}</span>;
}
