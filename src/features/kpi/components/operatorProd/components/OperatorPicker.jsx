// src/components/kpi/operatorProd/components/OperatorPicker.jsx
import React, { useMemo } from "react";
import { useI18n } from "../../../../../i18n/I18nProvider";
import { cn } from "../utils/kpiUi";
import { uniq } from "../utils/kpiHelpers";

export function OperatorPicker({
  isDark,
  loading,
  error,
  scope,

  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,

  showCostrCommessaFilters,
  lockCostr = false,
  lockCommessa = false,
  costrFilter,
  setCostrFilter,
  commessaFilter,
  setCommessaFilter,
  costrOptions,
  commessaOptions,

  operatorsCount,
  filteredOperators,
  search,
  setSearch,

  selectedIds,
  setSelectedIds,
}) {
  const { t } = useI18n();

  const cardBase = cn(
    "rounded-2xl border px-4 py-3 relative overflow-hidden",
    isDark ? "border-slate-700/70 bg-slate-950/55" : "border-slate-200 bg-white",
    isDark
      ? "before:absolute before:inset-0 before:bg-[radial-gradient(70%_70%_at_30%_0%,rgba(56,189,248,0.10),transparent_60%)] before:pointer-events-none"
      : ""
  );

  const smallInput = cn(
    "rounded-lg border px-2 py-1 text-[12px] outline-none",
    isDark
      ? "border-slate-700 bg-slate-950/70 text-slate-50 placeholder:text-slate-500 focus:border-emerald-400/70"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-500/60"
  );

  const pillBtn = cn(
    "px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.16em] transition",
    isDark
      ? "border-slate-700 bg-slate-950/30 text-slate-100 hover:bg-slate-900/40"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
  );

  const dangerPill = cn(
    "px-3 py-1.5 rounded-full border text-[11px] uppercase tracking-[0.16em] transition",
    isDark
      ? "border-rose-400/55 bg-rose-950/20 text-rose-100 hover:bg-rose-900/25"
      : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
  );

  const selectedSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);

  const selectAllFiltered = () => {
    const ids = (filteredOperators || []).map((o) => o.operator_id).filter(Boolean);
    setSelectedIds((prev) => uniq([...(prev || []), ...ids]));
  };

  const clearSelection = () => setSelectedIds([]);

  const toggleOperator = (id) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const set = new Set(prev || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return Array.from(set);
    });
  };

  return (
    <section className="px-3 sm:px-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
      <div className={cardBase}>
        <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_WINDOW")}</div>
        <div className="mt-2 flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={smallInput} />
          <span className="text-xs text-slate-400">→</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={smallInput} />
        </div>

        {showCostrCommessaFilters ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">COSTR</div>
              <select
                value={costrFilter}
                onChange={(e) => setCostrFilter(e.target.value)}
                disabled={lockCostr}
                className={cn(
                  smallInput,
                  "w-full",
                  lockCostr ? (isDark ? "opacity-70 cursor-not-allowed" : "opacity-70 cursor-not-allowed") : ""
                )}
              >
                <option value="">Tutti</option>
                {costrOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Commessa</div>
              <select
                value={commessaFilter}
                onChange={(e) => setCommessaFilter(e.target.value)}
                disabled={lockCommessa}
                className={cn(
                  smallInput,
                  "w-full",
                  lockCommessa ? (isDark ? "opacity-70 cursor-not-allowed" : "opacity-70 cursor-not-allowed") : ""
                )}
              >
                <option value="">Tutte</option>
                {commessaOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className={cn("mt-3 rounded-2xl border px-3 py-2 text-xs", isDark ? "border-rose-400/55 bg-rose-500/10 text-rose-100" : "border-rose-200 bg-rose-50 text-rose-700")}>
            <div className="font-semibold">{t("COMMON_ERROR")}</div>
            <div className="mt-1">{error}</div>
          </div>
        ) : null}
      </div>

      <div className={cardBase}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("KPI_OPPROD_OPERATORS")}</div>
            <div className={cn("text-sm font-medium", isDark ? "text-slate-50" : "text-slate-900")}>
              {t("KPI_OPPROD_OPERATORS_HINT")}
            </div>
            <div className={cn("text-xs mt-1", isDark ? "text-slate-300" : "text-slate-600")}>
              {t("KPI_OPPROD_OPERATORS_DERIVED")}
            </div>
          </div>

          <div className="text-[11px] text-slate-400">{t("KPI_OPPROD_TOTAL_IN_RANGE", { n: operatorsCount })}</div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={selectAllFiltered} className={pillBtn}>
            {t("KPI_OPPROD_SELECT_FILTERED")}
          </button>
          <button type="button" onClick={clearSelection} className={dangerPill}>
            {t("KPI_OPPROD_CLEAR")}
          </button>

          <span className="ml-auto text-[11px] text-slate-400">{t("KPI_OPPROD_SELECTED_N", { n: selectedIds.length })}</span>
        </div>

        <div className="mt-2 text-[11px] text-slate-400">{t("KPI_OPPROD_SCOPE_ACTIVE", { scope })}</div>

        <div className="mt-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("KPI_OPPROD_SEARCH_PLACEHOLDER")}
            className={cn(smallInput, "w-full")}
          />
        </div>

        <div className="mt-3 max-h-[420px] overflow-auto pr-1">
          {loading ? (
            <div className="py-8 text-center text-[12px] text-slate-400">{t("KPI_OPPROD_LOADING_LIST")}</div>
          ) : filteredOperators.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-slate-400">{t("KPI_OPPROD_NO_OPERATOR")}</div>
          ) : (
            <ul className="space-y-1">
              {filteredOperators.map((o) => {
                const id = o.operator_id;
                const checked = selectedSet.has(id);

                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => toggleOperator(id)}
                      className={cn(
                        "w-full text-left flex items-center gap-2 rounded-xl border px-3 py-2 transition",
                        isDark ? "border-slate-700 bg-slate-950/35 hover:bg-slate-900/45" : "border-slate-200 bg-white hover:bg-slate-50",
                        checked ? (isDark ? "ring-1 ring-emerald-400/60" : "ring-1 ring-emerald-500/50") : ""
                      )}
                    >
                      <span
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center text-[10px]",
                          checked
                            ? isDark
                              ? "border-emerald-400/70 bg-emerald-400/20 text-emerald-100"
                              : "border-emerald-500/60 bg-emerald-50 text-emerald-800"
                            : isDark
                            ? "border-slate-600 bg-slate-950/70 text-slate-500"
                            : "border-slate-300 bg-white text-slate-400"
                        )}
                        aria-hidden="true"
                      >
                        {checked ? "✓" : ""}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className={cn("text-sm font-medium truncate", isDark ? "text-slate-50" : "text-slate-900")}>
                          {(o.operator_name ?? "—").toString().trim() || "—"}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">{id}</div>
                      </div>

                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-[0.18em]",
                          checked
                            ? isDark
                              ? "border-emerald-400/55 bg-emerald-400/10 text-emerald-100"
                              : "border-emerald-500/35 bg-emerald-50 text-emerald-700"
                            : isDark
                            ? "border-slate-700 bg-slate-950/20 text-slate-300"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        )}
                      >
                        {checked ? "ON" : "OFF"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
