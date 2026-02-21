// src/components/direzione/kpiDetails/KpiHoursDetails.tsx
// Direzione (Direzione) — Drill-down KPI "Ore lavoro" basato su direzione_operator_facts_v1.

import { useMemo  } from "react";
import { useCoreI18n } from "../../../i18n/coreI18n";
import { KpiEmptyState, KpiMetaLine, KpiSection } from "./KpiDetailsCommon";
import { formatNumberIT } from "../../charts/coreChartTheme";

type HoursFactRow = {
  report_date?: string | null;
  ship_code?: string | null;
  ship_name?: string | null;
  operator_id?: string | null;
  tempo_hours?: number | string | null;
  unit?: string | null;
};

function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function KpiHoursDetails({
  hoursFacts = [],
  dateFrom,
  dateTo,
}: {
  hoursFacts?: HoursFactRow[];
  dateFrom: string;
  dateTo: string;
}): JSX.Element {
  const i18n = useCoreI18n();
  const t = i18n?.t ?? ((s: string) => s);

  const totalHours = useMemo(() => {
    return (hoursFacts || []).reduce((acc, r) => {
      const h = toNumber(r?.tempo_hours);
      return h > 0 ? acc + h : acc;
    }, 0);
  }, [hoursFacts]);

  const byShip = useMemo(() => {
    const m = new Map<string, { ship: string; hours: number; rows: number }>();
    (hoursFacts || []).forEach((r) => {
      const ship = (r?.ship_code || r?.ship_name || "—").toString().trim() || "—";
      const cur = m.get(ship) || { ship, hours: 0, rows: 0 };
      cur.hours += Math.max(0, toNumber(r?.tempo_hours));
      cur.rows += 1;
      m.set(ship, cur);
    });
    return Array.from(m.values()).sort((a, b) => b.hours - a.hours);
  }, [hoursFacts]);

  const unit = useMemo(() => {
    const u = (hoursFacts || []).find((r) => r?.unit)?.unit;
    return (u || "h").toString();
  }, [hoursFacts]);

  return (
    <div>
      <div className="text-[12px] text-slate-300/90">{t("DETAILS_ORE_SUB") || "Ore lavoro (facts)"}</div>

      <KpiSection title={t("DETAILS_RANGE") || "Finestra"}>
        <KpiMetaLine label={t("DIR_WINDOW") || "Finestra"} value={`${dateFrom} → ${dateTo}`} />
        <KpiMetaLine
          label={t("DETAILS_ORE_TOTAL") || "Totale"}
          value={`${formatNumberIT(totalHours, 2)} ${unit}`}
        />
      </KpiSection>

      <KpiSection title={t("MODAL_DETAILS") || "Dettagli"}>
        {!byShip.length ? (
          <KpiEmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  <th className="text-left py-2 pr-3">Nave</th>
                  <th className="text-right py-2 pr-3">Ore</th>
                  <th className="text-right py-2 pr-3">Righe</th>
                </tr>
              </thead>
              <tbody>
                {byShip.slice(0, 24).map((r) => (
                  <tr key={r.ship} className="border-t border-slate-800/60">
                    <td className="py-2 pr-3 text-slate-100">{r.ship}</td>
                    <td className="py-2 pr-3 text-right text-slate-200">{formatNumberIT(r.hours, 2)}</td>
                    <td className="py-2 pr-3 text-right text-slate-300">{r.rows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 text-[11px] text-slate-400">
          Fonte: <span className="font-mono">direzione_operator_facts_v1</span>. Questo KPI misura ore tokenizzate (facts),
          non ore &quot;stimate&quot;.
        </div>
      </KpiSection>
    </div>
  );
}

