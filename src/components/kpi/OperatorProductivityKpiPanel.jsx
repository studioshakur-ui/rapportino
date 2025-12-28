// src/components/kpi/OperatorProductivityKpiPanel.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { useI18n } from "../../i18n/I18nProvider";
import { normalizeScope } from "./operatorProd/utils/kpiHelpers";
import { useOperatorProductivityData } from "./operatorProd/hooks/useOperatorProductivityData";
import { useOperatorTotalHours } from "./operatorProd/hooks/useOperatorTotalHours";
import { KpiStrip } from "./operatorProd/components/KpiStrip";
import { OperatorPicker } from "./operatorProd/components/OperatorPicker";
import { OperatorResultsGrid } from "./operatorProd/components/OperatorResultsGrid";
import { OperatorDetailsModal } from "./operatorProd/components/OperatorDetailsModal";

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export default function OperatorProductivityKpiPanel({
  scope = "DIRECTION",
  isDark = true,
  title,
  kicker,
  showCostrCommessaFilters = true,
}) {
  const { profile } = useAuth();
  const { t } = useI18n();

  const SCOPE = useMemo(() => normalizeScope(scope), [scope]);

  const STORAGE_KEY = useMemo(() => {
    const pid = profile?.id ? String(profile.id) : "anon";
    return `core_kpi_operator_prod_previsto_selected_v2::${SCOPE}::${pid}`;
  }, [profile?.id, SCOPE]);

  const TITLE = title ?? t("KPI_OPPROD_TITLE");
  const KICKER = kicker ?? t("KPI_OPPROD_KICKER");

  // Date window
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Optional filters
  const [costrFilter, setCostrFilter] = useState("");
  const [commessaFilter, setCommessaFilter] = useState("");

  // Selection
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => loadJSON(STORAGE_KEY, []));

  // Modal
  const [openOperatorId, setOpenOperatorId] = useState(null);

  const didInitRange = useRef(false);

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
        <div
          className={[
            "text-[11px] uppercase tracking-[0.20em] mb-1",
            isDark ? "text-slate-400" : "text-slate-500",
          ].join(" ")}
        >
          {KICKER}
        </div>
        <h1 className={["text-xl sm:text-2xl font-semibold", isDark ? "text-slate-50" : "text-slate-900"].join(" ")}>
          {TITLE}
        </h1>
        <p className={["text-xs mt-1 max-w-4xl", isDark ? "text-slate-300" : "text-slate-600"].join(" ")}>
          {t("KPI_OPPROD_DESC")}
        </p>
      </header>

      <KpiStrip
        isDark={isDark}
        loading={loading}
        perOperatorCount={perOperator.length}
        totalsSelected={totalsSelected}
      />

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

      <OperatorResultsGrid
        isDark={isDark}
        loading={loading}
        perOperator={perOperator}
        totalsSelected={totalsSelected}
        onOpenOperator={(operatorId) => setOpenOperatorId(operatorId)}
      />

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
