// src/components/kpi/operatorProd/components/OperatorPicker.jsx
import { useMemo } from "react";
import { useI18n } from "../../../../../i18n/I18nProvider";
import { cn } from "../utils/kpiUi";
import { uniq } from "../utils/kpiHelpers";

type OperatorRow = { operator_id?: string; operator_name?: string };

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
}: {
  isDark: boolean;
  loading: boolean;
  error?: string | null;
  scope: unknown;
  dateFrom: string;
  dateTo: string;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  showCostrCommessaFilters: boolean;
  lockCostr?: boolean;
  lockCommessa?: boolean;
  costrFilter: string;
  setCostrFilter: (value: string) => void;
  commessaFilter: string;
  setCommessaFilter: (value: string) => void;
  costrOptions: string[];
  commessaOptions: string[];
  operatorsCount: number;
  filteredOperators: OperatorRow[];
  search: string;
  setSearch: (value: string) => void;
  selectedIds: string[];
  setSelectedIds: (next: string[] | ((prev: string[]) => string[])) => void;
}) {
  const { t } = useI18n();
  void isDark;

  const cardBase = "theme-panel rounded-2xl px-4 py-3 relative overflow-hidden";

  const smallInput =
    "theme-input rounded-lg px-2 py-1 text-[12px] outline-none focus:ring-2 focus:ring-[var(--accent)]/20";

  const pillBtn = "btn-instrument px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.16em]";

  const dangerPill = "chip chip-danger px-3 py-1.5 text-[11px] uppercase tracking-[0.16em]";

  const selectedSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);

  const selectAllFiltered = () => {
    const ids = (filteredOperators || []).map((o) => o.operator_id).filter(Boolean) as string[];
    setSelectedIds((prev) => uniq([...(prev || []), ...ids]));
  };

  const clearSelection = () => setSelectedIds([]);

  const toggleOperator = (id: string) => {
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
        <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_WINDOW")}</div>
        <div className="mt-2 flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={smallInput} />
          <span className="text-xs theme-text-muted">→</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={smallInput} />
        </div>

        {showCostrCommessaFilters ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">COSTR</div>
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
              <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">Commessa</div>
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
          <div className="mt-3 rounded-2xl border px-3 py-2 text-xs chip-danger">
            <div className="font-semibold">{t("COMMON_ERROR")}</div>
            <div className="mt-1">{error}</div>
          </div>
        ) : null}
      </div>

      <div className={cardBase}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] theme-text-muted">{t("KPI_OPPROD_OPERATORS")}</div>
            <div className="text-sm font-medium theme-text">
              {t("KPI_OPPROD_OPERATORS_HINT")}
            </div>
            <div className="text-xs mt-1 theme-text-muted">
              {t("KPI_OPPROD_OPERATORS_DERIVED")}
            </div>
          </div>

          <div className="text-[11px] theme-text-muted">
            {(t as unknown as (key: string, params?: Record<string, unknown>) => string)(
              "KPI_OPPROD_TOTAL_IN_RANGE",
              { n: operatorsCount }
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={selectAllFiltered} className={pillBtn}>
            {t("KPI_OPPROD_SELECT_FILTERED")}
          </button>
          <button type="button" onClick={clearSelection} className={dangerPill}>
            {t("KPI_OPPROD_CLEAR")}
          </button>

          <span className="ml-auto text-[11px] theme-text-muted">
            {(t as unknown as (key: string, params?: Record<string, unknown>) => string)("KPI_OPPROD_SELECTED_N", {
              n: selectedIds.length,
            })}
          </span>
        </div>

        <div className="mt-2 text-[11px] theme-text-muted">
          {(t as unknown as (key: string, params?: Record<string, unknown>) => string)("KPI_OPPROD_SCOPE_ACTIVE", {
            scope,
          })}
        </div>

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
            <div className="py-8 text-center text-[12px] theme-text-muted">{t("KPI_OPPROD_LOADING_LIST")}</div>
          ) : filteredOperators.length === 0 ? (
            <div className="py-8 text-center text-[12px] theme-text-muted">{t("KPI_OPPROD_NO_OPERATOR")}</div>
          ) : (
            <ul className="space-y-1">
              {filteredOperators.map((o) => {
                const id = o.operator_id;
                if (!id) return null;
                const checked = selectedSet.has(id);

                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => toggleOperator(id)}
                      className={cn(
                        "w-full text-left flex items-center gap-2 rounded-xl px-3 py-2 transition theme-panel-2",
                        checked ? "accent-soft" : ""
                      )}
                    >
                      <span
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center text-[10px] theme-border",
                          checked ? "accent-soft" : "theme-text-muted"
                        )}
                        aria-hidden="true"
                      >
                        {checked ? "✓" : ""}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate theme-text">
                          {(o.operator_name ?? "—").toString().trim() || "—"}
                        </div>
                        <div className="text-[11px] theme-text-muted font-mono truncate">{id}</div>
                      </div>

                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-[0.18em] theme-border",
                          checked ? "accent-soft" : "theme-text-muted"
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
