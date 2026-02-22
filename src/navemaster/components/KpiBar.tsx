// src/navemaster/components/KpiBar.tsx
import { useI18n } from "../../i18n/coreI18n";
import type { KpiCounters } from "../contracts/navemaster.types";
import { corePills } from "../../ui/designSystem";

function Tile(props: { label: string; value: string; hint?: string }): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
      <div className={corePills.kicker}>{props.label}</div>
      <div className="text-2xl font-semibold mt-1 text-slate-100">{props.value}</div>
      {props.hint ? <div className="text-xs text-slate-400 mt-1">{props.hint}</div> : null}
    </div>
  );
}

function fmt(n: number | null): string {
  if (typeof n !== "number") return "—";
  return String(n);
}

export default function KpiBar(props: { kpis: KpiCounters; loading?: boolean }): JSX.Element {
  const { kpis } = props;
  const { t } = useI18n();

  const total = fmt(kpis.totalRows);
  const nav = kpis.byNavStatus;
  const alerts = kpis.alertsBySeverity;
  const diff = kpis.diffBySeverity;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <Tile label={t("NM_KPI_TOTAL")} value={total} hint={`${t("NM_KPI_NAV_STATUS")}: P ${fmt(nav.P)} · R ${fmt(nav.R)} · T ${fmt(nav.T)} · B ${fmt(nav.B)} · E ${fmt(nav.E)} · NP ${fmt(nav.NP)}`} />
      <Tile label={t("NM_KPI_ALERTS")} value={`CRIT ${fmt(alerts.CRITICAL)}`} hint={`MAJOR ${fmt(alerts.MAJOR)} · INFO ${fmt(alerts.INFO)}`} />
      <Tile label={t("NM_KPI_DIFF")} value={`CRIT ${fmt(diff.CRITICAL)}`} hint={`MAJOR ${fmt(diff.MAJOR)} · INFO ${fmt(diff.INFO)}`} />
      <Tile label="INCA" value="—" hint="(join live: situazione/metri/date)" />
    </div>
  );
}
