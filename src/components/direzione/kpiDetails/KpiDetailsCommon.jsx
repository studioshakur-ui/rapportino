// src/components/direzione/kpiDetails/KpiDetailsCommon.jsx
import React from "react";
import { useCoreI18n } from "../../../i18n/CoreI18n";

function cn(...p) {
  return p.filter(Boolean).join(" ");
}

export function KpiMetaLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-800/60">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="text-[12px] text-slate-100">{value}</div>
    </div>
  );
}

export function KpiSection({ title, children }) {
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

export function KpiErrorState({ message }) {
  const { t } = useCoreI18n();
  return (
    <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 p-3 text-[12px] text-rose-100">
      <div className="font-semibold">{t("DETAILS_ERROR")}</div>
      <div className="mt-1">{message || "—"}</div>
    </div>
  );
}
