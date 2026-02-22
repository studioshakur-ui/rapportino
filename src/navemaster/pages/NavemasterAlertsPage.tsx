// src/navemaster/pages/NavemasterAlertsPage.tsx
import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import { useNavemasterAlerts } from "../hooks/useNavemasterAlerts";
import type { AlertsQuery } from "../contracts/navemaster.query";
import { useI18n } from "../../i18n/coreI18n";
import { cardSurface, corePills } from "../../ui/designSystem";
import { formatIt } from "../contracts/navemaster.logic";

export default function NavemasterAlertsPage(props: { shipId: string | null }): JSX.Element {
  const { shipId } = props;
  const { t } = useI18n();

  const [severity, setSeverity] = useState<"ALL" | "CRITICAL" | "MAJOR" | "INFO">("ALL");
  const [search, setSearch] = useState<string>("");

  const q: AlertsQuery | null = useMemo(() => {
    if (!shipId) return null;
    return {
      shipId,
      filters: { severity, search },
      paging: { page: 1, pageSize: 80 },
    };
  }, [shipId, severity, search]);

  const { result, loading } = useNavemasterAlerts(q);

  if (!shipId) return <EmptyState />;

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border border-slate-800 bg-[#050910] ${cardSurface(true)} p-4`}>
        <div className={corePills.kicker}>{t("NM_ALERTS_TITLE")}</div>

        <div className="mt-3 flex flex-col md:flex-row gap-3">
          <label className="flex flex-col gap-1 min-w-[220px]">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("NM_ALERTS_SEVERITY")}</div>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
            >
              <option value="ALL">ALL</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="MAJOR">MAJOR</option>
              <option value="INFO">INFO</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 flex-1">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("NM_FILTER_SEARCH")}</div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
              placeholder="1-1 N AH163…"
            />
          </label>
        </div>

        <div className="mt-2 text-xs text-slate-500">{loading ? "loading…" : result.total !== null ? `${result.total} alerts` : ""}</div>
      </div>

      <div className="space-y-2">
        {result.rows.map((a) => (
          <div key={a.id} className={`rounded-2xl border border-slate-800 bg-slate-950/30 ${cardSurface(true)} p-4`}>
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{a.severity}</div>
              <div className="text-xs text-slate-500">{formatIt(a.created_at)}</div>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-slate-100">{a.marcacavo}</div>
              <div className="text-xs text-slate-500">·</div>
              <div className="text-sm text-slate-200">{a.rule}</div>
            </div>
            <div className="mt-2 text-xs text-slate-400 font-mono overflow-auto">
              {JSON.stringify(a.meta ?? {}, null, 0)}
            </div>
          </div>
        ))}
        {result.rows.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-10">—</div>
        ) : null}
      </div>
    </div>
  );
}
