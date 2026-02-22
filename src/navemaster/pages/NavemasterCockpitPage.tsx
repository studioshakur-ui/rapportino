// src/navemaster/pages/NavemasterCockpitPage.tsx
import { useEffect, useMemo, useState } from "react";
import FiltersBar from "../components/FiltersBar";
import CockpitTable from "../components/CockpitTable";
import RowDetailsPanel from "../components/RowDetailsPanel";
import EmptyState from "../components/EmptyState";
import { useNavemasterQuery } from "../hooks/useNavemasterQuery";
import type { CockpitQuery } from "../contracts/navemaster.query";

export default function NavemasterCockpitPage(props: { shipId: string | null }): JSX.Element {
  const { shipId } = props;

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    search: "",
    navStatus: "ALL" as const,
    zona: "ALL" as const,
    sezione: "ALL" as const,
    onlyWithInca: false,
  });

  const q: CockpitQuery | null = useMemo(() => {
    if (!shipId) return null;
    return {
      shipId,
      filters,
      sort: { key: "marcacavo", dir: "asc" },
      paging: { page: 1, pageSize: 100 },
    };
  }, [shipId, filters]);

  const { result, loading } = useNavemasterQuery(q);

  // Reset selected row if it disappears
  useEffect(() => {
    if (!selectedRowId) return;
    if (!result.rows.some((r) => r.navemaster_row_id === selectedRowId)) {
      setSelectedRowId(null);
    }
  }, [result.rows, selectedRowId]);

  if (!shipId) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-3">
      <div className="space-y-3">
        <FiltersBar
          value={filters}
          onChange={(next) =>
            setFilters({
              search: next.search ?? "",
              navStatus: (next.navStatus ?? "ALL") as any,
              zona: (next.zona ?? "ALL") as any,
              sezione: (next.sezione ?? "ALL") as any,
              onlyWithInca: Boolean(next.onlyWithInca),
            })
          }
        />
        <div className="text-xs text-slate-500">{loading ? "loading…" : result.total !== null ? `${result.total} rows` : ""}</div>
        <CockpitTable rows={result.rows} selectedRowId={selectedRowId} onSelect={setSelectedRowId} />
      </div>
      <RowDetailsPanel rowId={selectedRowId} />
    </div>
  );
}
