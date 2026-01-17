// /src/components/rapportino/RapportinoTable.tsx
// @ts-nocheck
import React, { useEffect, useMemo, useRef } from "react";
import { cn, splitLinesKeepEmpties } from "../rapportino/page/rapportinoHelpers";

type Props = {
  rows: any[];
  productivityIndexMap?: Map<string, number>;
  onRowChange?: (idx: number, field: string, value: any, target?: HTMLElement | null) => void;
  onRemoveRow?: (idx: number) => void;
  onOpenOperatorPicker?: (idx: number) => void;
  onOpenTempoPicker?: (idx: number) => void;
  onRemoveOperatorFromRow?: (idx: number, operatorId: string) => void;
  readOnly?: boolean;
  onDropOperatorToRow?: (rowIndex: number, op: any) => void;
};

function safeStr(v: any): string {
  return String(v ?? "").trim();
}

function normKey(v: any): string {
  return safeStr(v).toLowerCase();
}

function getRowDescr(row: any): string {
  return safeStr(row?.descrizione_attivita ?? row?.descrizione);
}

function getRowCategoria(row: any): string {
  return safeStr(row?.categoria);
}

/**
 * Operators (canonical preferred)
 */
function getCanonicalOperatorItems(row: any): Array<{ operator_id?: any; label?: any; tempo_raw?: any }> {
  return Array.isArray(row?.operator_items) ? row.operator_items : [];
}

/**
 * Legacy operators fallback (string lines)
 */
function getLegacyOperators(row: any): string[] {
  const opLines = splitLinesKeepEmpties(row?.operatori);
  return opLines.map((x: any) => safeStr(x)).filter(Boolean);
}

function getLegacyTempi(row: any): string[] {
  const tmLines = splitLinesKeepEmpties(row?.tempo);
  return tmLines.map((x: any) => safeStr(x));
}

function formatIdx(v: any): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

export default function RapportinoTable({
  rows,
  productivityIndexMap,
  onRowChange,
  onRemoveRow,
  onOpenOperatorPicker,
  onOpenTempoPicker,
  onRemoveOperatorFromRow,
  readOnly = false,
  onDropOperatorToRow,
}: Props): JSX.Element {
  const arr = Array.isArray(rows) ? rows : [];

  // Small helper to render stacked values aligned with operator list
  function renderIndiceForRow(row: any): JSX.Element {
    const cat = normKey(getRowCategoria(row));
    const desc = normKey(getRowDescr(row));

    const canon = getCanonicalOperatorItems(row);
    if (canon.length > 0) {
      return (
        <div className="flex flex-col gap-1">
          {canon.map((it, i) => {
            const opId = it?.operator_id != null ? String(it.operator_id) : "";
            const key = `${opId}||${cat}||${desc}`;
            const idx = productivityIndexMap?.get(key);
            return (
              <div key={`${opId}-${i}`} className="text-[12px] tabular-nums text-slate-900">
                {formatIdx(idx)}
              </div>
            );
          })}
        </div>
      );
    }

    // Legacy: cannot map to operator_id safely → show dash per visible operator line
    const legacyOps = getLegacyOperators(row);
    if (legacyOps.length > 0) {
      return (
        <div className="flex flex-col gap-1">
          {legacyOps.map((_, i) => (
            <div key={i} className="text-[12px] tabular-nums text-slate-500">
              —
            </div>
          ))}
        </div>
      );
    }

    return <span className="text-[12px] text-slate-500">—</span>;
  }

  return (
    <div className="mt-3">
      {/* Print hardening: widen document + hide action col in print */}
      <style>{`
        @media print {
          #rapportino-document { max-width: none !important; width: 100% !important; }
          .no-print { display: none !important; }
          table { width: 100% !important; }
        }
      `}</style>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-200 px-2 py-2 text-left text-[11px] font-extrabold uppercase tracking-[0.12em] w-[140px]">
                CATEGORIA
              </th>
              <th className="border border-slate-200 px-2 py-2 text-left text-[11px] font-extrabold uppercase tracking-[0.12em]">
                DESCRIZIONE ATTIVITÀ
              </th>
              <th className="border border-slate-200 px-2 py-2 text-left text-[11px] font-extrabold uppercase tracking-[0.12em] w-[220px]">
                OPERATORE
                <div className="text-[10px] font-semibold normal-case tracking-normal text-slate-500">
                  (tap per scegliere / drag&amp;drop)
                </div>
              </th>
              <th className="border border-slate-200 px-2 py-2 text-center text-[11px] font-extrabold uppercase tracking-[0.12em] w-[140px]">
                TEMPO
                <div className="text-[10px] font-semibold normal-case tracking-normal text-slate-500">(ORE)</div>
              </th>
              <th className="border border-slate-200 px-2 py-2 text-right text-[11px] font-extrabold uppercase tracking-[0.12em] w-[110px]">
                PREVISTO
              </th>
              <th className="border border-slate-200 px-2 py-2 text-right text-[11px] font-extrabold uppercase tracking-[0.12em] w-[110px]">
                PRODOTTO
                <div className="text-[10px] font-semibold normal-case tracking-normal text-slate-500">(MT)</div>
              </th>
              <th className="border border-slate-200 px-2 py-2 text-left text-[11px] font-extrabold uppercase tracking-[0.12em] w-[220px]">
                NOTE
              </th>

              {/* NEW: INDICE column (after NOTE) */}
              <th className="border border-slate-200 px-2 py-2 text-left text-[11px] font-extrabold uppercase tracking-[0.12em] w-[84px]">
                INDICE
              </th>

              {/* Actions (X) — small on screen, hidden in print */}
              <th className="border border-slate-200 px-2 py-2 text-center text-[11px] font-extrabold uppercase tracking-[0.12em] w-[44px] no-print">
                ×
              </th>
            </tr>
          </thead>

          <tbody>
            {arr.map((row, idx) => {
              const categoria = getRowCategoria(row);
              const descr = getRowDescr(row);

              const canon = getCanonicalOperatorItems(row);
              const legacyOps = getLegacyOperators(row);
              const legacyTm = getLegacyTempi(row);

              const isCanonical = canon.length > 0;

              return (
                <tr key={row?.id ?? idx} className="align-top">
                  {/* CATEGORIA */}
                  <td className="border border-slate-200 px-2 py-2 text-[12px]">
                    {categoria || ""}
                  </td>

                  {/* DESCR */}
                  <td className="border border-slate-200 px-2 py-2 text-[12px]">
                    {descr || ""}
                  </td>

                  {/* OPERATORE */}
                  <td
                    className={cn(
                      "border border-slate-200 px-2 py-2 text-[12px]",
                      !readOnly ? "cursor-pointer" : ""
                    )}
                    onClick={() => (!readOnly ? onOpenOperatorPicker?.(idx) : undefined)}
                  >
                    {isCanonical ? (
                      <div className="flex flex-col gap-2">
                        {canon.map((it, i) => {
                          const label = safeStr(it?.label);
                          if (!label) return null;
                          return (
                            <div
                              key={`${it?.operator_id ?? "op"}-${i}`}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5"
                            >
                              <span className="min-w-0 truncate font-semibold">{label}</span>
                              {!readOnly && it?.operator_id ? (
                                <button
                                  type="button"
                                  className="no-print ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  title="Rimuovi"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onRemoveOperatorFromRow?.(idx, String(it.operator_id));
                                  }}
                                >
                                  ×
                                </button>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : legacyOps.length > 0 ? (
                      <div className="whitespace-pre-wrap">{legacyOps.join("\n")}</div>
                    ) : (
                      <span className="text-slate-400">(vuoto)</span>
                    )}
                  </td>

                  {/* TEMPO */}
                  <td
                    className={cn(
                      "border border-slate-200 px-2 py-2 text-[12px] text-center",
                      !readOnly ? "cursor-pointer" : ""
                    )}
                    onClick={() => (!readOnly ? onOpenTempoPicker?.(idx) : undefined)}
                  >
                    {isCanonical ? (
                      <div className="flex flex-col gap-1">
                        {canon.map((it, i) => {
                          const tr = safeStr(it?.tempo_raw);
                          return (
                            <div key={`${it?.operator_id ?? "t"}-${i}`} className="tabular-nums">
                              {tr || ""}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {legacyTm.map((t, i) => (
                          <div key={i} className="tabular-nums">
                            {t}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* PREVISTO */}
                  <td className="border border-slate-200 px-2 py-2 text-[12px] text-right tabular-nums">
                    {row?.previsto ?? ""}
                  </td>

                  {/* PRODOTTO */}
                  <td className="border border-slate-200 px-2 py-2 text-[12px] text-right tabular-nums">
                    {row?.prodotto ?? ""}
                  </td>

                  {/* NOTE */}
                  <td className="border border-slate-200 px-2 py-2 text-[12px]">
                    {row?.note ?? ""}
                  </td>

                  {/* INDICE */}
                  <td className="border border-slate-200 px-2 py-2 text-[12px]">
                    {renderIndiceForRow(row)}
                  </td>

                  {/* X */}
                  <td className="border border-slate-200 px-2 py-2 text-center no-print">
                    {!readOnly ? (
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        title="Rimuovi riga"
                        onClick={(e) => {
                          e.preventDefault();
                          onRemoveRow?.(idx);
                        }}
                      >
                        ×
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
