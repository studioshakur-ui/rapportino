// src/navemaster/components/FiltersBar.tsx
import type { CockpitFilters } from "../contracts/navemaster.query";
import { useI18n } from "../../i18n/coreI18n";
import type { NavStatus } from "../contracts/navemaster.types";

export default function FiltersBar(props: {
  value: CockpitFilters;
  onChange: (next: CockpitFilters) => void;
}): JSX.Element {
  const { value, onChange } = props;
  const { t } = useI18n();

  const statuses: Array<{ value: NavStatus | "ALL"; label: string }> = [
    { value: "ALL", label: "ALL" },
    { value: "P", label: "P" },
    { value: "R", label: "R" },
    { value: "T", label: "T" },
    { value: "B", label: "B" },
    { value: "E", label: "E" },
    { value: "NP", label: "NP" },
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4 flex flex-col gap-3">
      <div className="flex flex-col md:flex-row gap-3">
        <label className="flex flex-col gap-1 flex-1">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("NM_FILTER_SEARCH")}</div>
          <input
            value={value.search ?? ""}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
            placeholder="1-1 N AH163…"
          />
        </label>

        <label className="flex flex-col gap-1 min-w-[180px]">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{t("NM_FILTER_STATUS")}</div>
          <select
            value={(value.navStatus ?? "ALL") as string}
            onChange={(e) => onChange({ ...value, navStatus: e.target.value as any })}
            className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 pt-6 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={Boolean(value.onlyWithInca)}
            onChange={(e) => onChange({ ...value, onlyWithInca: e.target.checked })}
            className="accent-slate-200"
          />
          {t("NM_FILTER_ONLY_WITH_INCA")}
        </label>
      </div>
    </div>
  );
}
