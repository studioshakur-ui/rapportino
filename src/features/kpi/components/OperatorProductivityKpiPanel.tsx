// src/components/kpi/OperatorProductivityKpiPanel.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider";
import { useI18n } from "../../../i18n/I18nProvider";
import { normalizeScope } from "./operatorProd/utils/kpiHelpers";
import { useOperatorProductivityData } from "./operatorProd/hooks/useOperatorProductivityData";
import { useOperatorTotalHours } from "./operatorProd/hooks/useOperatorTotalHours";
import { KpiStrip } from "./operatorProd/components/KpiStrip";
import { OperatorPicker } from "./operatorProd/components/OperatorPicker";
import { OperatorResultsGrid } from "./operatorProd/components/OperatorResultsGrid";
import { OperatorDetailsModal } from "./operatorProd/components/OperatorDetailsModal";

type FamilyRow = Record<string, unknown>;

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

/**
 * Vue générique “Familles” robuste :
 * - Ne suppose pas un schéma fixe de familyRows.
 * - Rendu en table avec colonnes déduites dynamiquement.
 * - Si aucun champ standard, on affiche une table “keys” lisible.
 */
function FamiliesResultsTable({
  loading,
  rows,
}: {
  loading: boolean;
  rows: FamilyRow[] | null | undefined;
}) {
  const safeRows = Array.isArray(rows) ? rows : [];

  const columns = useMemo(() => {
    if (!safeRows.length) return [];
    const first = safeRows[0] || {};
    const keys = Object.keys(first);

    // Petit tri heuristique : mettre d’abord les champs textuels “famille/desc”
    const priority = [
      "family",
      "famiglia",
      "family_label",
      "famiglia_label",
      "category",
      "categoria",
      "descrizione",
      "description",
      "family_code",
      "codice",
      "idx",
      "indice",
      "ore_sum",
      "hours",
      "ore",
      "count",
      "n",
    ];

    const rank = (k: string) => {
      const i = priority.indexOf(k);
      return i === -1 ? 999 : i;
    };

    return keys
      .slice()
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .slice(0, 10); // limite pour éviter un tableau illisible
  }, [safeRows]);

  const fmt = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") {
      // format simple, sans locale agressive
      return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : String(v);
    }
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  if (loading) {
    return <div className="px-3 sm:px-4 theme-text-muted">Caricamento famiglie…</div>;
  }

  if (!safeRows.length) {
    return <div className="mx-3 sm:mx-4 theme-panel-2 rounded-2xl p-4">Nessun dato “famiglie” disponibile per il periodo selezionato.</div>;
  }

  return (
    <div className="mx-3 sm:mx-4 theme-table">
      <div className="px-4 py-3 text-xs theme-text-muted">
        Dettaglio per famiglie (tabella dinamica). Colonne: {columns.join(", ")}
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="theme-table-head">
              {columns.map((c) => (
                <th
                  key={c}
                  className="text-left px-4 py-2 text-[11px] uppercase tracking-[0.18em] whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {safeRows.map((r, idx) => (
              <tr key={idx}>
                {columns.map((c) => (
                  <td
                    key={c}
                    className="px-4 py-2 whitespace-nowrap align-top theme-text"
                    title={fmt(r?.[c])}
                  >
                    {fmt(r?.[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OperatorProductivityKpiPanel({
  scope = "Direzione",
  isDark = true,
  title,
  kicker,
  showCostrCommessaFilters = true,
  fixedCostr = null,
  fixedCommessa = null,
  lockCostr = false,
  lockCommessa = false,
}: {
  scope?: unknown;
  isDark?: boolean;
  title?: string;
  kicker?: string;
  showCostrCommessaFilters?: boolean;
  fixedCostr?: unknown;
  fixedCommessa?: unknown;
  lockCostr?: boolean;
  lockCommessa?: boolean;
}) {
  const { profile } = useAuth();
  const { t } = useI18n();

  const SCOPE = useMemo(() => normalizeScope(scope), [scope]);

  const STORAGE_KEY = useMemo(() => {
    const pid = profile?.id ? String(profile.id) : "anon";
    return `core_kpi_operator_prod_previsto_selected_v2::${SCOPE}::${pid}`;
  }, [profile?.id, SCOPE]);

  const STORAGE_VIEW_KEY = useMemo(() => {
    const pid = profile?.id ? String(profile.id) : "anon";
    return `core_kpi_operator_prod_view_v1::${SCOPE}::${pid}`;
  }, [profile?.id, SCOPE]);

  const TITLE = title ?? t("KPI_OPPROD_TITLE");
  const KICKER = kicker ?? t("KPI_OPPROD_KICKER");

  // Tabs: "SINTESI" | "FAMIGLIE"
  const [view, setView] = useState<"SINTESI" | "FAMIGLIE">(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_VIEW_KEY);
      return raw === "FAMIGLIE" ? "FAMIGLIE" : "SINTESI";
    } catch {
      return "SINTESI";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_VIEW_KEY, view);
    } catch {
      // ignore
    }
  }, [STORAGE_VIEW_KEY, view]);

  // Date window
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Optional filters
  const [costrFilter, setCostrFilter] = useState<string>(() => (fixedCostr ? String(fixedCostr) : ""));
  const [commessaFilter, setCommessaFilter] = useState<string>(() => (fixedCommessa ? String(fixedCommessa) : ""));

  // Enforce locked filters (if provided)
  useEffect(() => {
    if (lockCostr && fixedCostr != null) {
      const v = String(fixedCostr);
      if (costrFilter !== v) setCostrFilter(v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockCostr, fixedCostr]);

  useEffect(() => {
    if (lockCommessa && fixedCommessa != null) {
      const v = String(fixedCommessa);
      if (commessaFilter !== v) setCommessaFilter(v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockCommessa, fixedCommessa]);

  // Selection
  const [search, setSearch] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => loadJSON<string[]>(STORAGE_KEY, []));

  // Modal
  const [openOperatorId, setOpenOperatorId] = useState<string | null>(null);

  const didInitRange = useRef<boolean>(false);

  useEffect(() => {
    if (didInitRange.current) return;
    if (dateFrom || dateTo) return;

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);

    setDateFrom(toISODate(start));
    setDateTo(toISODate(today));
    didInitRange.current = true;
  }, [dateFrom, dateTo]);

  useEffect(() => {
    setSelectedIds(loadJSON(STORAGE_KEY, []));
  }, [STORAGE_KEY]);

  useEffect(() => {
    saveJSON(STORAGE_KEY, selectedIds);
  }, [STORAGE_KEY, selectedIds]);

  const {
    loading,
    error,
    globalRows,
    familyRows,
    operators,
    filteredOperators,
    perOperator,
    perOperatorFamilies,
    totalsSelected,
    costrOptions,
    commessaOptions,
  } = useOperatorProductivityData({
    profileId: profile?.id ?? null,
    scope: SCOPE,
    dateFrom,
    dateTo,
    showCostrCommessaFilters,
    costrFilter,
    commessaFilter,
    selectedIds,
    search,
  });

  const { totalHoursMap } = useOperatorTotalHours({
    profileId: profile?.id ?? null,
    scope: SCOPE,
    dateFrom,
    dateTo,
    showCostrCommessaFilters,
    costrFilter,
    commessaFilter,
    selectedIds,
  });

  const openOperator = useMemo(() => {
    const id = openOperatorId ? String(openOperatorId) : null;
    if (!id) return null;
    return (perOperator || []).find((x) => String(x.operator_id) === id) || null;
  }, [openOperatorId, perOperator]);

  const openOperatorFamilies = useMemo(() => {
    const id = openOperatorId ? String(openOperatorId) : null;
    if (!id) return [];
    return perOperatorFamilies.get(id) || [];
  }, [openOperatorId, perOperatorFamilies]);

  const openOperatorTotalHours = useMemo(() => {
    const id = openOperatorId ? String(openOperatorId) : null;
    if (!id) return 0;
    return Number(totalHoursMap.get(id) ?? 0);
  }, [openOperatorId, totalHoursMap]);

  const openOperatorNonIndexed = useMemo(() => {
    if (!openOperator) return 0;
    const indexed = Number(openOperator.ore_sum ?? 0);
    const total = Number(openOperatorTotalHours ?? 0);
    const diff = total - indexed;
    return diff > 0 ? diff : 0;
  }, [openOperator, openOperatorTotalHours]);

  const onCloseModal = () => setOpenOperatorId(null);

  return (
    <div className="space-y-4">
      <header className="px-3 sm:px-4 pt-3">
        <div className="kicker mb-1">{KICKER}</div>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold theme-text">
              {TITLE}
            </h1>
            <p className="text-xs mt-1 max-w-4xl theme-text-muted">
              {t("KPI_OPPROD_DESC")}
            </p>
          </div>

          {/* Tabs: Sintesi / Famiglie */}
          <div className="segmented" role="tablist" aria-label="Vista KPI">
            <button
              type="button"
              role="tab"
              aria-selected={view === "SINTESI"}
              onClick={() => setView("SINTESI")}
              className={["segmented-item", view === "SINTESI" ? "segmented-item-active" : ""].join(" ")}
              title="Vista sintesi operatori"
            >
              Sintesi
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={view === "FAMIGLIE"}
              onClick={() => setView("FAMIGLIE")}
              className={["segmented-item", view === "FAMIGLIE" ? "segmented-item-active" : ""].join(" ")}
              title="Vista dettaglio per famiglie"
            >
              Famiglie
            </button>
          </div>
        </div>
      </header>

      <KpiStrip isDark={isDark} loading={loading} perOperatorCount={perOperator.length} totalsSelected={totalsSelected} />

      <OperatorPicker
        isDark={isDark}
        loading={loading}
        error={error}
        scope={SCOPE}
        dateFrom={dateFrom}
        dateTo={dateTo}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        showCostrCommessaFilters={showCostrCommessaFilters}
        lockCostr={lockCostr}
        lockCommessa={lockCommessa}
        costrFilter={costrFilter}
        setCostrFilter={setCostrFilter}
        commessaFilter={commessaFilter}
        setCommessaFilter={setCommessaFilter}
        costrOptions={costrOptions}
        commessaOptions={commessaOptions}
        operatorsCount={operators.length}
        filteredOperators={filteredOperators}
        search={search}
        setSearch={setSearch}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
      />

      {/* Content switches by tab */}
      {view === "SINTESI" ? (
        <OperatorResultsGrid
          isDark={isDark}
          loading={loading}
          perOperator={perOperator}
          totalsSelected={totalsSelected}
          onOpenOperator={(operatorId: string) => setOpenOperatorId(operatorId)}
        />
      ) : (
        <FamiliesResultsTable loading={loading} rows={familyRows} />
      )}

      <OperatorDetailsModal
        isDark={isDark}
        open={Boolean(openOperator)}
        operator={openOperator}
        families={openOperatorFamilies}
        totalHours={openOperatorTotalHours}
        nonIndexedHours={openOperatorNonIndexed}
        onClose={onCloseModal}
      />

      {/* Keep these for dev sanity / future checks (unused but preserved, no side effects) */}
      <div className="sr-only" aria-hidden="true">
        {String(globalRows?.length || 0)} / {String(familyRows?.length || 0)}
      </div>
    </div>
  );
}
