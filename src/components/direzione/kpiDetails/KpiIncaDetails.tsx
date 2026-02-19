// src/components/direzione/kpiDetails/KpiIncaDetails.tsx
//
// Direzione · KPI INCA (chantier)
// Canonical baseline for chantier: metri_ref = greatest(metri_teo, metri_dis)
// View source: public.direzione_inca_chantier_v1

import React, { useMemo } from "react";

import { useCoreI18n } from "../../../i18n/CoreI18n";
import { KpiEmptyState, KpiSection } from "./KpiDetailsCommon";
import { formatNumberIt } from "../direzioneUtils";

export type IncaChantierRow = {
  inca_file_id?: string | null;
  nome_file?: string | null;
  caricato_il?: string | null;
  costr?: string | null;
  commessa?: string | null;
  metri_ref_totali?: number | string | null;
  metri_teo_totali?: number | string | null;
  metri_dis_totali?: number | string | null;
  metri_posati_ref?: number | string | null;
  cavi_totali?: number | null;
  cavi_ref_both?: number | null;
  cavi_ref_teo_only?: number | null;
  cavi_ref_dis_only?: number | null;
  cavi_ref_none?: number | null;
  pct_ref_both?: number | string | null;
  pct_ref_none?: number | string | null;
};

export type KpiIncaDetailsProps = {
  incaChantier?: IncaChantierRow[];
  mode?: "REF" | "DIS";
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return 0;
    const n = Number.parseFloat(s.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export default function KpiIncaDetails({ incaChantier = [], mode = "REF" }: KpiIncaDetailsProps): JSX.Element {
  const { t } = useCoreI18n();

  const rows = useMemo(() => {
    const sorted = (incaChantier || []).slice().sort((a, b) => {
      const av = mode === "DIS" ? toNum(a?.metri_dis_totali) : toNum(a?.metri_ref_totali);
      const bv = mode === "DIS" ? toNum(b?.metri_dis_totali) : toNum(b?.metri_ref_totali);
      return bv - av;
    });
    return sorted.slice(0, 24);
  }, [incaChantier, mode]);

  const subtitle =
    mode === "DIS"
      ? t("DETAILS_INCA_REAL_SUB", "INCA (audit): metri_dis")
      : t("DETAILS_INCA_PREV_SUB", "INCA (chantier): baseline metri_ref");

  return (
    <div>
      <div className="text-[12px] text-slate-300/90">{subtitle}</div>

      <KpiSection title={t("MODAL_DETAILS")}>
        {!rows.length ? (
          <KpiEmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  <th className="text-left py-2 pr-3">File</th>
                  <th className="text-left py-2 pr-3">COSTR</th>
                  <th className="text-left py-2 pr-3">Commessa</th>
                  <th className="text-right py-2 pr-3">Baseline (ref)</th>
                  <th className="text-right py-2 pr-3">Dis (audit)</th>
                  <th className="text-right py-2 pr-3">Posati (ref)</th>
                  <th className="text-right py-2 pr-3">Qualità</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const fileKey = `${r?.inca_file_id || r?.nome_file || ""}-${idx}`;
                  const bothPct = toNum(r?.pct_ref_both);
                  const nonePct = toNum(r?.pct_ref_none);

                  return (
                    <tr key={fileKey} className="border-t border-slate-800/60">
                      <td className="py-2 pr-3 text-slate-100">{(r?.nome_file || "—").toString()}</td>
                      <td className="py-2 pr-3 text-slate-300">{(r?.costr || "—").toString()}</td>
                      <td className="py-2 pr-3 text-slate-300">{(r?.commessa || "—").toString()}</td>
                      <td className="py-2 pr-3 text-right text-slate-200">{formatNumberIt(toNum(r?.metri_ref_totali), 0)}</td>
                      <td className="py-2 pr-3 text-right text-slate-200">{formatNumberIt(toNum(r?.metri_dis_totali), 0)}</td>
                      <td className="py-2 pr-3 text-right text-slate-200">{formatNumberIt(toNum(r?.metri_posati_ref), 0)}</td>
                      <td className="py-2 pr-3 text-right text-slate-300">
                        <span className="font-mono">both</span> {formatNumberIt(bothPct, 2)}% · <span className="font-mono">none</span>{" "}
                        {formatNumberIt(nonePct, 2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 text-[11px] text-slate-400">
          Regola chantier: <span className="font-mono">metri_ref = greatest(metri_teo, metri_dis)</span>. Baseline = Σ metri_ref.
        </div>
      </KpiSection>
    </div>
  );
}