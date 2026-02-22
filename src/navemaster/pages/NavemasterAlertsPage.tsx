// src/navemaster/pages/NavemasterAlertsPage.tsx
import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import { useNavemasterAlerts } from "../hooks/useNavemasterAlerts";
import type { AlertsQuery } from "../contracts/navemaster.query";
import { useI18n } from "../../i18n/coreI18n";
import { cardSurface, corePills } from "../../ui/designSystem";
import { formatIt } from "../contracts/navemaster.logic";
import { useNavemasterKpis } from "../hooks/useNavemasterKpis";

export default function NavemasterAlertsPage(props: { shipId: string | null; hasRun?: boolean | null; refreshKey?: number }): JSX.Element {
  const { shipId, hasRun, refreshKey } = props;
  const { t } = useI18n();

  const [severity, setSeverity] = useState<"ALL" | "CRITICAL" | "MAJOR" | "INFO">("ALL");
  const [rule, setRule] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const q: AlertsQuery | null = useMemo(() => {
    if (!shipId) return null;
    return {
      shipId,
      filters: { severity, rule, search },
      paging: { page, pageSize },
    };
  }, [shipId, severity, search, refreshKey, page, pageSize]);

  const { result, loading } = useNavemasterAlerts(q);
  const { kpis } = useNavemasterKpis(shipId, refreshKey);

  const triage = (() => {
    const crit = kpis.alertsBySeverity.CRITICAL ?? 0;
    const maj = kpis.alertsBySeverity.MAJOR ?? 0;
    if (crit > 0) return "CRITICAL presenti: triage immediato";
    if (maj > 0) return "MAJOR presenti: pianifica verifica";
    return "Nessun allarme critico";
  })();

  if (!shipId) return <EmptyState />;
  if (hasRun === false) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#050910] p-6">
        <div className="text-lg font-semibold text-slate-100">{t("NM_NO_RUN_TITLE")}</div>
        <div className="mt-2 text-sm text-slate-400">
          {t("NM_NO_RUN_BODY")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border border-slate-800 bg-[#050910] ${cardSurface(true)} p-4`}>
        <div className={corePills.kicker}>{t("NM_ALERTS_TITLE")}</div>

        <div className="mt-3 flex flex-col md:flex-row gap-3">
          <label className="flex flex-col gap-1 min-w-[220px]">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("NM_ALERTS_SEVERITY")}</div>
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value as any);
                setPage(1);
              }}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
            >
              <option value="ALL">TUTTI</option>
              <option value="CRITICAL">CRITICO</option>
              <option value="MAJOR">MAJOR</option>
              <option value="INFO">INFO</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 min-w-[220px]">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("NM_ALERTS_RULE")}</div>
            <select
              value={rule}
              onChange={(e) => {
                setRule(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
            >
              <option value="ALL">TUTTI</option>
              <option value="MISSING_IN_CORE">MISSING_IN_CORE</option>
              <option value="EXTRA_IN_CORE">EXTRA_IN_CORE</option>
              <option value="DUPLICATE_IN_INCA">DUPLICATE_IN_INCA</option>
              <option value="STATUS_CONFLICT">STATUS_CONFLICT</option>
              <option value="METRI_MISMATCH">METRI_MISMATCH</option>
              <option value="BLOCKED_IMPACT">BLOCKED_IMPACT</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 flex-1">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("NM_FILTER_SEARCH")}</div>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
              placeholder="1-1 N AH163…"
            />
          </label>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className={loading ? "animate-pulse" : ""}>
            {loading ? "caricamento…" : result.total !== null ? `${result.total} allarmi` : ""}
            {kpis.alertsBySeverity.CRITICAL != null ? ` · CRIT ${kpis.alertsBySeverity.CRITICAL}` : ""}
            {kpis.alertsBySeverity.MAJOR != null ? ` · MAJOR ${kpis.alertsBySeverity.MAJOR}` : ""}
            {kpis.alertsBySeverity.INFO != null ? ` · INFO ${kpis.alertsBySeverity.INFO}` : ""}
          </div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{triage}</div>
          {result.total !== null ? (
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1);
                  setPageSize(Number(e.target.value));
                }}
                className="rounded-lg border border-slate-800 bg-slate-950/30 px-2 py-1 text-[11px] text-slate-200"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>
                pagina {page} / {Math.max(1, Math.ceil(result.total / pageSize))}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-800 bg-slate-950/30 px-2 py-1 text-[11px] text-slate-200 disabled:opacity-50"
              >
                Prec
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => (result.hasMore ? p + 1 : p))}
                disabled={!result.hasMore}
                className="rounded-lg border border-slate-800 bg-slate-950/30 px-2 py-1 text-[11px] text-slate-200 disabled:opacity-50"
              >
                Succ
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {result.rows.map((a) => (
          <div key={a.id} className={`rounded-2xl border border-slate-800 bg-slate-950/30 ${cardSurface(true)} p-4`}>
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{a.severity}</div>
              <div className="text-xs text-slate-500">{formatIt(a.created_at)}</div>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-slate-100">{a.codice ?? a.codice_norm ?? "—"}</div>
              <div className="text-xs text-slate-500">·</div>
              <div className="text-sm text-slate-200">{a.type}</div>
            </div>
            <div className="mt-2 text-xs text-slate-400 font-mono overflow-auto">
              {JSON.stringify(a.evidence ?? {}, null, 0)}
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
