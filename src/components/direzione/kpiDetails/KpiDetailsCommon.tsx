// src/components/direzione/kpiDetails/KpiDetailsCommon.jsx
import type { ReactNode } from "react";
import { useCoreI18n } from "../../../i18n/coreI18n";

function cn(...p: Array<string | false | null | undefined>): string {
  return p.filter(Boolean).join(" ");
}

export function KpiMetaLine({ label, value }: { label?: ReactNode; value?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-800/60">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="text-[12px] text-slate-100">{value}</div>
    </div>
  );
}

export function KpiSection({ title, children }: { title?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-2">{title}</div>
      <div className={cn("rounded-2xl border border-slate-800/70 bg-slate-950/35 p-3", "ring-1 ring-white/5")}>
        {children}
      </div>
    </div>
  );
}

export function KpiEmptyState() {
  const { t } = useCoreI18n();
  return <div className="py-8 text-center text-[12px] text-slate-400">{t("DETAILS_NONE")}</div>;
}

export function KpiLoadingState() {
  const { t } = useCoreI18n();
  return <div className="py-8 text-center text-[12px] text-slate-400">{t("DETAILS_LOADING")}</div>;
}

export function KpiErrorState({ message }: { message?: ReactNode }) {
  const { t } = useCoreI18n();
  return (
    <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 p-3 text-[12px] text-rose-100">
      <div className="font-semibold">{t("DETAILS_ERROR")}</div>
      <div className="mt-1">{message || "—"}</div>
    </div>
  );
}
