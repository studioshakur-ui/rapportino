// src/modules/daily-lists/components/DailyListProgress.tsx
import type { DailyListSummary } from "../dailyLists.types";

interface Props {
  summary: DailyListSummary;
}

interface BarSegment { key: string; count: number; color: string; label: string; }

export default function DailyListProgress({ summary }: Props): JSX.Element {
  const { total, confirmed, likely_laid, to_verify, no_evidence, blocked, outside_inca } = summary;
  const done = confirmed + likely_laid;
  const pct  = total > 0 ? Math.round((done / total) * 100) : 0;

  const segments: BarSegment[] = [
    { key: "confirmed",    count: confirmed,    color: "bg-emerald-500", label: "Confirmé" },
    { key: "likely_laid",  count: likely_laid,  color: "bg-sky-400",     label: "Probable" },
    { key: "to_verify",    count: to_verify,    color: "bg-amber-400",   label: "À vérif." },
    { key: "no_evidence",  count: no_evidence,  color: "bg-zinc-600",    label: "Sans preuve" },
    { key: "blocked",      count: blocked,      color: "bg-red-500",     label: "Bloqué" },
    { key: "outside_inca", count: outside_inca, color: "bg-violet-400",  label: "Hors INCA" },
  ].filter((s) => s.count > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-4 flex-1 overflow-hidden rounded-full bg-zinc-800">
          {segments.map((s) => (
            <div
              key={s.key}
              title={`${s.label}: ${s.count}`}
              style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }}
              className={`${s.color} transition-all`}
            />
          ))}
        </div>
        <span className="w-12 text-right text-sm font-bold tabular-nums text-white">{pct}%</span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${s.color}`} />
            {s.label} <strong className="text-zinc-100">{s.count}</strong>
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1 text-xs text-zinc-500">
          total <strong className="text-zinc-300">{total}</strong>
        </span>
      </div>
    </div>
  );
}
