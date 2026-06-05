// src/modules/daily-lists/components/DailyListProgress.tsx
import type { DailyListSummary } from "../dailyLists.types";

interface Props {
  summary: DailyListSummary;
}

interface BarSegment { key: string; count: number; color: string; label: string; }

export default function DailyListProgress({ summary }: Props) {
  const { total, confirmed, likely_laid, to_verify, no_evidence, blocked, outside_inca } = summary;
  const done = confirmed + likely_laid;
  const pct  = total > 0 ? Math.round((done / total) * 100) : 0;

  const segments: BarSegment[] = [
    { key: "confirmed",    count: confirmed,    color: "bg-emerald-500", label: "Confirmé" },
    { key: "likely_laid",  count: likely_laid,  color: "bg-blue-400",    label: "Probable" },
    { key: "to_verify",    count: to_verify,    color: "bg-amber-400",   label: "À vérif." },
    { key: "no_evidence",  count: no_evidence,  color: "bg-zinc-300 dark:bg-zinc-600", label: "Sans preuve" },
    { key: "blocked",      count: blocked,      color: "bg-red-500",     label: "Bloqué" },
    { key: "outside_inca", count: outside_inca, color: "bg-purple-400",  label: "Hors INCA" },
  ].filter((s) => s.count > 0);

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-4 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex">
          {segments.map((s) => (
            <div
              key={s.key}
              title={`${s.label}: ${s.count}`}
              style={{ width: `${(s.count / total) * 100}%` }}
              className={`${s.color} transition-all`}
            />
          ))}
        </div>
        <span className="text-sm font-bold tabular-nums w-10 text-right">{pct}%</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            <span className={`inline-block w-2.5 h-2.5 rounded-sm ${s.color}`} />
            {s.label} <strong className="text-zinc-900 dark:text-zinc-100">{s.count}</strong>
          </span>
        ))}
        <span className="flex items-center gap-1 text-xs text-zinc-400 ml-auto">
          total <strong className="text-zinc-700 dark:text-zinc-300">{total}</strong>
        </span>
      </div>
    </div>
  );
}
