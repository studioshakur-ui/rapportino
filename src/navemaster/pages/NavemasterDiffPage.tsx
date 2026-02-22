// src/navemaster/pages/NavemasterDiffPage.tsx
import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import { useNavemasterDiff } from "../hooks/useNavemasterDiff";
import type { DiffQuery } from "../contracts/navemaster.query";
import { useI18n } from "../../i18n/coreI18n";
import { cardSurface, corePills } from "../../ui/designSystem";
import { formatIt } from "../contracts/navemaster.logic";

export default function NavemasterDiffPage(props: { shipId: string | null; hasRun?: boolean | null; refreshKey?: number }): JSX.Element {
  const { shipId, hasRun, refreshKey } = props;
  const { t } = useI18n();

  const [severity, setSeverity] = useState<"ALL" | "CRITICAL" | "MAJOR" | "INFO">("ALL");
  const [search, setSearch] = useState<string>("");

  const q: DiffQuery | null = useMemo(() => {
    if (!shipId) return null;
    return {
      shipId,
      filters: { severity, search },
      paging: { page: 1, pageSize: 80 },
    };
  }, [shipId, severity, search, refreshKey]);

  const { result, loading } = useNavemasterDiff(q);

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
        <div className={corePills.kicker}>{t("NM_DIFF_TITLE")}</div>

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

        <div className="mt-2 text-xs text-slate-500">{loading ? "loading…" : result.total !== null ? `${result.total} diffs` : ""}</div>
      </div>

      <div className={`rounded-2xl border border-slate-800 bg-[#050910] ${cardSurface(true)} overflow-hidden`}>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#050910] z-10">
              <tr className="text-xs uppercase tracking-[0.16em] text-slate-400 border-b border-slate-800">
                <th className="text-left font-medium px-3 py-3 whitespace-nowrap">{t("NM_TABLE_MARCA")}</th>
                <th className="text-left font-medium px-3 py-3 whitespace-nowrap">{t("NM_ALERTS_SEVERITY")}</th>
                <th className="text-left font-medium px-3 py-3 whitespace-nowrap">{t("NM_ALERTS_RULE")}</th>
                <th className="text-left font-medium px-3 py-3 whitespace-nowrap">{t("NM_DIFF_PREV")}</th>
                <th className="text-left font-medium px-3 py-3 whitespace-nowrap">{t("NM_DIFF_NEW")}</th>
                <th className="text-left font-medium px-3 py-3 whitespace-nowrap">{t("NM_ALERTS_CREATED")}</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((d) => (
                <tr key={d.id} className="border-b border-slate-900/60 hover:bg-slate-900/25">
                  <td className="px-3 py-3 text-slate-100 font-medium whitespace-nowrap">{d.marcacavo}</td>
                  <td className="px-3 py-3 text-slate-200">{d.severity}</td>
                  <td className="px-3 py-3 text-slate-200">{d.rule}</td>
                  <td className="px-3 py-3 text-slate-400">{d.prev_value ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-400">{d.new_value ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{formatIt(d.created_at)}</td>
                </tr>
              ))}
              {result.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                    —
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
