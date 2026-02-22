// src/navemaster/components/CockpitTable.tsx
import { useMemo } from "react";
import type { NavemasterLiveRowV2 } from "../contracts/navemaster.types";
import { useI18n } from "../../i18n/coreI18n";
import { cardSurface } from "../../ui/designSystem";
import { formatIt } from "../contracts/navemaster.logic";

function pill(status: string | null): JSX.Element {
  const s = String(status ?? "").trim().toUpperCase() || "—";
  const cls =
    s === "P"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
      : s === "B"
      ? "bg-rose-500/15 text-rose-200 border-rose-500/30"
      : s === "T"
      ? "bg-sky-500/15 text-sky-200 border-sky-500/30"
      : s === "R"
      ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
      : "bg-slate-500/10 text-slate-200 border-slate-500/20";

  return <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs ${cls}`}>{s}</span>;
}

export default function CockpitTable(props: {
  rows: NavemasterLiveRowV2[];
  selectedRowId: string | null;
  onSelect: (rowId: string) => void;
}): JSX.Element {
  const { rows, selectedRowId, onSelect } = props;
  const { t } = useI18n();

  const header = useMemo(
    () => [
      t("NM_TABLE_MARCA"),
      t("NM_TABLE_NAV_STATUS"),
      t("NM_TABLE_COVERAGE"),
      "Δ",
      t("NM_TABLE_SEZIONE"),
      t("NM_TABLE_ZONA_DA"),
      t("NM_TABLE_ZONA_A"),
      t("NM_TABLE_UPDATED"),
    ],
    [t]
  );

  return (
    <div className={`rounded-2xl border border-slate-800 bg-[#050910] ${cardSurface(true)} overflow-hidden`}>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#050910] z-10">
            <tr className="text-xs uppercase tracking-[0.16em] text-slate-400 border-b border-slate-800">
              {header.map((h) => (
                <th key={h} className="text-left font-medium px-3 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const active = selectedRowId === r.id;
              return (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r.id)}
                  className={`border-b border-slate-900/60 cursor-pointer ${
                    active ? "bg-slate-900/40" : "hover:bg-slate-900/25"
                  }`}
                >
                  <td className="px-3 py-3 text-slate-100 font-medium whitespace-nowrap">
                    {r.is_modified ? <span className="text-amber-200 mr-1">*</span> : null}
                    {r.codice}
                  </td>
                  <td className="px-3 py-3">{pill(r.stato_nav)}</td>
                  <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{r.coverage ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-300 whitespace-nowrap">
                    {r.delta_metri != null ? new Intl.NumberFormat().format(r.delta_metri) : "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-200 whitespace-nowrap">{r.sezione ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{r.zona_da ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-300 whitespace-nowrap">{r.zona_a ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{formatIt(r.last_proof_at ?? r.run_frozen_at ?? r.created_at)}</td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-slate-500">
                  —
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
