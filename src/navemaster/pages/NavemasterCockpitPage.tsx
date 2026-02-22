// src/navemaster/pages/NavemasterCockpitPage.tsx
import { useEffect, useMemo, useState } from "react";
import FiltersBar from "../components/FiltersBar";
import CockpitTable from "../components/CockpitTable";
import RowDetailsPanel from "../components/RowDetailsPanel";
import EmptyState from "../components/EmptyState";
import { useNavemasterQuery } from "../hooks/useNavemasterQuery";
import type { CockpitQuery } from "../contracts/navemaster.query";
import { useI18n } from "../../i18n/coreI18n";
import KpiBar from "../components/KpiBar";
import { useNavemasterKpis } from "../hooks/useNavemasterKpis";
import { useNavemasterKpiSummary } from "../hooks/useNavemasterKpiSummary";
import { useNavemasterAlertCounts } from "../hooks/useNavemasterAlertCounts";

export default function NavemasterCockpitPage(props: { shipId: string | null; hasRun?: boolean | null; refreshKey?: number }): JSX.Element {
  const { shipId, hasRun, refreshKey } = props;
  const { t } = useI18n();

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const [filters, setFilters] = useState({
    search: "",
    navStatus: "ALL" as const,
    zona: "ALL" as const,
    sezione: "ALL" as const,
    onlyWithInca: false,
    onlyModified: false,
    onlyNoProof: false,
  });

  const q: CockpitQuery | null = useMemo(() => {
    if (!shipId) return null;
    return {
      shipId,
      filters,
      sort: { key: "codice", dir: "asc" },
      paging: { page, pageSize },
    };
  }, [shipId, filters, refreshKey, page, pageSize]);

  const { result, loading } = useNavemasterQuery(q);
  const { kpis } = useNavemasterKpis(shipId, refreshKey);
  const { summary } = useNavemasterKpiSummary(shipId, refreshKey);
  const { counts: alertCounts } = useNavemasterAlertCounts(shipId, refreshKey);

  const total = summary?.total ?? kpis.totalRows ?? null;
  const progressPct =
    summary?.progress_ratio != null && Number.isFinite(summary.progress_ratio)
      ? Math.round(summary.progress_ratio * 1000) / 10
      : null;
  const metriRef = summary?.metri_ref_sum ?? null;
  const metriPosati = summary?.metri_posati_sum ?? null;
  const deltaMetri = summary?.delta_sum ?? null;

  const signal = (() => {
    if (progressPct == null) return "DATA MISSING";
    if (progressPct >= 90) return "ON TRACK";
    if (progressPct >= 70) return "WATCH";
    return "CRITICAL";
  })();

  const insight = (() => {
    const p = kpis.byNavStatus.P ?? 0;
    const b = kpis.byNavStatus.B ?? 0;
    const r = kpis.byNavStatus.R ?? 0;
    const l = kpis.byNavStatus.L ?? 0;
    const t = kpis.byNavStatus.T ?? 0;
    if (b > 0) return "BLOCCO: presenza B in run attivo";
    if (r + l > 0) return "R/L presenti: verifica priorità";
    if (progressPct != null && progressPct < 70) return "Progress basso: focus su posa";
    if (t > 0) return "T presenti: monitorare ritardi";
    if (p > 0) return "Posa in corso: trend stabile";
    return "Dati incompleti o assenti";
  })();

  const kpisDisplay = summary
    ? {
        totalRows: summary.total ?? kpis.totalRows,
        byNavStatus: {
          P: summary.cnt_p ?? kpis.byNavStatus.P,
          R: summary.cnt_r ?? kpis.byNavStatus.R,
          T: summary.cnt_t ?? kpis.byNavStatus.T,
          B: summary.cnt_b ?? kpis.byNavStatus.B,
          E: summary.cnt_e ?? kpis.byNavStatus.E,
          L: summary.cnt_l ?? kpis.byNavStatus.L,
          NP: summary.cnt_np ?? kpis.byNavStatus.NP,
        },
        alertsBySeverity: alertCounts,
        diffBySeverity: kpis.diffBySeverity,
      }
    : kpis;

  // Reset selected row if it disappears
  useEffect(() => {
    if (!selectedRowId) return;
    if (!result.rows.some((r) => r.id === selectedRowId)) {
      setSelectedRowId(null);
    }
  }, [result.rows, selectedRowId]);

  useEffect(() => {
    if (selectedRowId) return;
    if (result.rows.length === 0) return;
    setSelectedRowId(result.rows[0].id);
  }, [result.rows, selectedRowId]);

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
    <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_560px] gap-4">
      <div className="space-y-3">
        <KpiBar kpis={kpisDisplay} />
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Run</div>
            <div className="mt-1 text-sm text-slate-100">{summary?.frozen_at ? new Date(summary.frozen_at).toLocaleString() : "—"}</div>
            <div className="mt-1 text-xs text-slate-500">verdict: {summary?.verdict ?? "—"}</div>
            <div className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-400">Signal</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{signal}</div>
            <div className="mt-2 text-xs text-slate-400">{insight}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Total</div>
            <div className="mt-1 text-2xl font-semibold text-slate-100">
              {total != null ? new Intl.NumberFormat().format(total) : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">cavi</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Progress</div>
            <div className="mt-1 text-2xl font-semibold text-slate-100">{progressPct != null ? `${progressPct}%` : "—"}</div>
            <div className="mt-1 text-xs text-slate-500">Σ posati / Σ ref</div>
            <div className="mt-3 h-2 rounded-full bg-slate-900/60 overflow-hidden">
              <div
                className="h-full bg-emerald-400/60 transition-all duration-700"
                style={{ width: `${Math.max(0, Math.min(100, progressPct ?? 0))}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Ref (m)</div>
            <div className="mt-1 text-2xl font-semibold text-slate-100">
              {metriRef != null ? new Intl.NumberFormat().format(metriRef) : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">baseline</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Posati (m)</div>
            <div className="mt-1 text-2xl font-semibold text-slate-100">
              {metriPosati != null ? new Intl.NumberFormat().format(metriPosati) : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">approved proofs</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Δ (m)</div>
            <div className="mt-1 text-2xl font-semibold text-slate-100">
              {deltaMetri != null ? new Intl.NumberFormat().format(deltaMetri) : "—"}
            </div>
            <div className="mt-1 text-xs text-slate-500">remaining</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {([
            ["P", kpisDisplay.byNavStatus.P],
            ["R", kpisDisplay.byNavStatus.R],
            ["L", kpisDisplay.byNavStatus.L],
            ["T", kpisDisplay.byNavStatus.T],
            ["B", kpisDisplay.byNavStatus.B],
            ["E", kpisDisplay.byNavStatus.E],
            ["NP", kpisDisplay.byNavStatus.NP],
          ] as const).map(([label, value]) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/30 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-200"
            >
              {label}
              <span className="text-slate-400">{value ?? 0}</span>
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "Tutti", patch: { navStatus: "ALL", onlyModified: false, onlyNoProof: false, onlyWithInca: false }, tone: "neutral" as const },
            { label: "Blocchi (B)", patch: { navStatus: "B" }, tone: "danger" as const },
            { label: "Modificati (*)", patch: { onlyModified: true }, tone: "warn" as const },
            { label: "No proof", patch: { onlyNoProof: true }, tone: "warn" as const },
            { label: "Posati (P)", patch: { navStatus: "P" }, tone: "ok" as const },
            { label: "Eliminati (E)", patch: { navStatus: "E" }, tone: "muted" as const },
            { label: "Ripresa (R/L)", patch: { navStatus: "R" }, tone: "info" as const },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setPage(1);
                setFilters((prev) => ({ ...prev, ...p.patch }));
              }}
              className={
                "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] transition " +
                (p.tone === "danger"
                  ? "border-rose-500/40 bg-rose-950/20 text-rose-200 hover:bg-rose-950/40"
                  : p.tone === "warn"
                    ? "border-amber-500/40 bg-amber-950/20 text-amber-200 hover:bg-amber-950/40"
                    : p.tone === "ok"
                      ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-950/40"
                      : p.tone === "info"
                        ? "border-sky-500/40 bg-sky-950/20 text-sky-200 hover:bg-sky-950/40"
                        : "border-slate-800 bg-slate-950/30 text-slate-200 hover:bg-slate-900/40")
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        <FiltersBar
          value={filters}
          onChange={(next) => {
            setPage(1);
            setFilters({
              search: next.search ?? "",
              navStatus: (next.navStatus ?? "ALL") as any,
              zona: (next.zona ?? "ALL") as any,
              sezione: (next.sezione ?? "ALL") as any,
              onlyWithInca: Boolean(next.onlyWithInca),
              onlyModified: Boolean(next.onlyModified),
              onlyNoProof: Boolean(next.onlyNoProof),
            });
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className={loading ? "animate-pulse" : ""}>
            {loading ? "loading…" : result.total !== null ? `${result.total} rows` : ""}
          </div>
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
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>
                page {page} / {Math.max(1, Math.ceil(result.total / pageSize))}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-800 bg-slate-950/30 px-2 py-1 text-[11px] text-slate-200 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => (result.hasMore ? p + 1 : p))}
                disabled={!result.hasMore}
                className="rounded-lg border border-slate-800 bg-slate-950/30 px-2 py-1 text-[11px] text-slate-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
        <CockpitTable rows={result.rows} selectedRowId={selectedRowId} onSelect={setSelectedRowId} />
      </div>
      <div className="2xl:sticky 2xl:top-4 h-fit">
        <RowDetailsPanel rowId={selectedRowId} />
      </div>
    </div>
  );
}
