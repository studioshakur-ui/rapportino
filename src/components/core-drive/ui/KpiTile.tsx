// /src/components/core-drive/ui/KpiTile.jsx
import type { ReactNode } from "react";

export default function KpiTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label?: ReactNode;
  value?: ReactNode;
  hint?: ReactNode;
  tone?: string;
}) {
  const toneMap: Record<string, string> = {
    neutral: "text-slate-50",
    ok: "text-emerald-300",
    info: "text-sky-300",
    warn: "text-amber-300",
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneMap[tone] || toneMap.neutral}`}>
        {value}
      </div>
      {hint ? <div className="mt-1 text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}
