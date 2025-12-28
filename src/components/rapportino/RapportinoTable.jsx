// src/components/rapportino/RapportinoTable.jsx
import React, { useMemo } from "react";
import { formatPrevisto } from "../../rapportinoUtils";
import { splitLinesKeepEmpties } from "../rapportino/page/rapportinoHelpers";

function PrintText({ value }) {
  return <div className="rapportino-print-text">{value || ""}</div>;
}

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function prettyMultiline(v) {
  if (!v) return "";
  const s = String(v ?? "").replace(/\r/g, "");
  return s;
}

function hasNonZeroNumber(v) {
  if (v === null || v === undefined) return false;
  const n = Number(v);
  return Number.isFinite(n) && n !== 0;
}
function hasAnyTempoValue(v) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return s.split("\n").some((x) => String(x || "").trim().length > 0);
}
function hasAnyOperatorValueLegacy(v) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return s.split("\n").some((x) => String(x || "").trim().length > 0);
}

export default function RapportinoTable({
  rows,
  onRowChange,
  onRemoveRow,
  onRemoveOperatorFromRow,
  readOnly = false,
  onOpenOperatorPicker,
  onOpenTempoPicker,
}) {
  const ro = readOnly || !onRowChange;

  const canonicalByIdx = useMemo(() => {
    return rows.map((r) => {
      const items = Array.isArray(r?.operator_items) ? r.operator_items : [];
      return items.length > 0;
    });
  }, [rows]);

  const catalogLockedByIdx = useMemo(() => {
    return rows.map((r) => !!r?.activity_id);
  }, [rows]);

  return (
    <div className="mt-3">
      <table className="rapportino-table text-[11px] w-full">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-2 py-2 text-left w-[140px]">CATEGORIA</th>
            <th className="px-2 py-2 text-left w-[360px]">DESCRIZIONE ATTIVITÀ</th>

            <th className="px-2 py-2 text-left w-[260px]">
              OPERATORE
              <div className="text-[10px] text-slate-500 font-normal">(tap per scegliere)</div>
            </th>

            <th className="px-2 py-2 text-center w-[140px]">
              TEMPO
              <br />
              <span className="text-[10px] text-slate-500">(ORE)</span>
            </th>

            <th className="px-2 py-2 text-right w-[120px]">PREVISTO</th>
            <th className="px-2 py-2 text-right w-[120px]">
              PRODOTTO
              <br />
              <span className="text-[10px] text-slate-500">(MT)</span>
            </th>
            <th className="px-2 py-2 text-left">NOTE</th>
            {!ro && <th className="px-2 py-2 text-center w-[60px] no-print">×</th>}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => {
            const isCanonical = canonicalByIdx[idx];
            const isCatalogLocked = catalogLockedByIdx[idx];
            const cellDisabled = ro || isCatalogLocked;

            const opLines = splitLinesKeepEmpties(r.operatori);
            const tmLines = splitLinesKeepEmpties(r.tempo);

            const canonItems = Array.isArray(r.operator_items) ? r.operator_items : [];
            const legacyHasOps = hasAnyOperatorValueLegacy(r.operatori);

            const mismatch = false; // mismatch strict is no longer the primary signal in table (modal handles it)
            const hasOperators = isCanonical ? canonItems.length > 0 : legacyHasOps;
            const hasValues = hasNonZeroNumber(r.previsto) || hasNonZeroNumber(r.prodotto) || hasAnyTempoValue(r.tempo);
            const isIncomplete = hasOperators !== hasValues;

            const tempoPillEnabled = !ro && hasOperators; // only open picker if there are operators

            return (
              <tr key={r.id || idx} className="align-top" data-ot-wrap>
                {/* CATEGORIA */}
                <td className="px-2 py-2">
                  <div className="flex items-start gap-2">
                    <input
                      className={cn("w-full bg-transparent outline-none", cellDisabled ? "opacity-80 cursor-not-allowed" : "")}
                      value={r.categoria || ""}
                      onChange={cellDisabled ? undefined : (e) => onRowChange(idx, "categoria", e.target.value)}
                      disabled={cellDisabled}
                      readOnly={cellDisabled}
                      title={isCatalogLocked ? "Categoria bloccata: proviene dal Catalogo" : undefined}
                    />
                    {isCatalogLocked ? (
                      <span
                        className="no-print inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700"
                        title="Riga collegata al Catalogo"
                      >
                        C
                      </span>
                    ) : null}
                    {!ro && isIncomplete ? (
                      <span
                        className="no-print inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-900"
                        title="Riga incompleta: aggiungi operatori oppure compila previsto/prodotto/tempo"
                      >
                        !
                      </span>
                    ) : null}
                  </div>
                </td>

                {/* DESCRIZIONE */}
                <td className="px-2 py-2">
                  <input
                    className={cn("w-full bg-transparent outline-none", cellDisabled ? "opacity-80 cursor-not-allowed" : "")}
                    value={r.descrizione || ""}
                    onChange={cellDisabled ? undefined : (e) => onRowChange(idx, "descrizione", e.target.value)}
                    disabled={cellDisabled}
                    readOnly={cellDisabled}
                    title={isCatalogLocked ? "Descrizione bloccata: proviene dal Catalogo" : undefined}
                  />
                </td>

                {/* OPERATORE */}
                <td className="px-2 py-2">
                  {isCanonical ? (
                    <>
                      <div
                        className={cn(
                          "no-print w-full rounded-md border border-slate-200 bg-white/70 px-2 py-2",
                          ro ? "opacity-80 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50"
                        )}
                        role={ro ? undefined : "button"}
                        tabIndex={ro ? -1 : 0}
                        title={ro ? undefined : "Tocca per scegliere…"}
                        onClick={() => {
                          if (ro) return;
                          onOpenOperatorPicker?.(idx);
                        }}
                        onKeyDown={(e) => {
                          if (ro) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onOpenOperatorPicker?.(idx);
                          }
                        }}
                      >
                        <div className="flex flex-wrap gap-2">
                          {canonItems.length === 0 ? (
                            <span className="text-slate-400 text-[12px]">Tocca per scegliere…</span>
                          ) : (
                            canonItems.map((it) => {
                              const operatorId = it?.operator_id;
                              const label = String(it?.label || "").trim() || "Operatore";
                              return (
                                <span
                                  key={String(operatorId)}
                                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-900"
                                  title={label}
                                >
                                  <span className="max-w-[180px] truncate">{label}</span>
                                  {!ro ? (
                                    <button
                                      type="button"
                                      className="rounded-full border border-slate-200 w-6 h-6 inline-flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                      title="Rimuovi operatore"
                                      aria-label={`Rimuovi ${label}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!operatorId) return;
                                        onRemoveOperatorFromRow?.(idx, operatorId);
                                      }}
                                    >
                                      ×
                                    </button>
                                  ) : null}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>
                      <div className="print-only">
                        <PrintText value={r.operatori} />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Legacy: keep simple multiline display; operator selection in legacy is text-based */}
                      <div className="no-print w-full rounded-md border border-slate-200 bg-white/60 px-2 py-2 text-[12px] text-slate-900 whitespace-pre-wrap">
                        {prettyMultiline(r.operatori) ? prettyMultiline(r.operatori) : (
                          <span className="text-slate-400">Nomi operatori (uno per riga)</span>
                        )}
                      </div>
                      <div className="print-only">
                        <PrintText value={r.operatori} />
                      </div>
                    </>
                  )}
                </td>

                {/* TEMPO — ALWAYS ACTIONABLE (canonical + legacy) */}
                <td className="px-2 py-2 text-center">
                  <div
                    className={cn(
                      "no-print w-full rounded-xl border border-slate-200 bg-white/80 px-2.5 py-2",
                      tempoPillEnabled
                        ? "cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
                        : "opacity-70 cursor-not-allowed"
                    )}
                    role={tempoPillEnabled ? "button" : undefined}
                    tabIndex={tempoPillEnabled ? 0 : -1}
                    title={
                      !hasOperators
                        ? "Prima inserisci almeno un operatore"
                        : ro
                        ? undefined
                        : "Tocca per impostare le ore…"
                    }
                    onClick={() => {
                      if (!tempoPillEnabled) return;
                      onOpenTempoPicker?.(idx);
                    }}
                    onKeyDown={(e) => {
                      if (!tempoPillEnabled) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenTempoPicker?.(idx);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Tempo</div>
                      <div className="flex items-center gap-2">
                        {mismatch ? (
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                            Allineamento
                          </span>
                        ) : null}
                        <span className="text-[11px] text-slate-500">{hasOperators ? `${opLines.filter(x => String(x||"").trim()).length || opLines.length} op` : "0 op"}</span>
                        {tempoPillEnabled ? <span className="text-[12px] text-slate-400">›</span> : null}
                      </div>
                    </div>

                    <div className="mt-1 text-[12px] font-semibold text-slate-900 text-center whitespace-pre-wrap leading-5">
                      {prettyMultiline(r.tempo) ? prettyMultiline(r.tempo) : "Tocca per impostare…"}
                    </div>
                  </div>

                  <div className="print-only text-center">
                    <PrintText value={r.tempo} />
                  </div>
                </td>

                {/* PREVISTO */}
                <td className="px-2 py-2 text-right">
                  <input
                    className={cn(
                      "w-full bg-transparent outline-none text-right",
                      cellDisabled ? "opacity-80 cursor-not-allowed" : ""
                    )}
                    value={formatPrevisto(r.previsto)}
                    onChange={cellDisabled ? undefined : (e) => onRowChange(idx, "previsto", e.target.value)}
                    disabled={cellDisabled}
                    readOnly={cellDisabled}
                    title={isCatalogLocked ? "Previsto bloccato: proviene dal Catalogo" : undefined}
                  />
                </td>

                {/* PRODOTTO */}
                <td className="px-2 py-2 text-right">
                  <input
                    className={cn("w-full bg-transparent outline-none text-right", ro ? "opacity-80 cursor-not-allowed" : "")}
                    value={r.prodotto || ""}
                    onChange={ro ? undefined : (e) => onRowChange(idx, "prodotto", e.target.value)}
                    disabled={ro}
                    readOnly={ro}
                    placeholder="0"
                  />
                </td>

                {/* NOTE */}
                <td className="px-2 py-2">
                  <input
                    className={cn("w-full bg-transparent outline-none", ro ? "opacity-80 cursor-not-allowed" : "")}
                    value={r.note || ""}
                    onChange={ro ? undefined : (e) => onRowChange(idx, "note", e.target.value)}
                    disabled={ro}
                    readOnly={ro}
                    placeholder="Note…"
                  />
                </td>

                {/* REMOVE ROW */}
                {!ro ? (
                  <td className="px-2 py-2 text-center no-print">
                    <button
                      type="button"
                      className="rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-[12px] font-semibold text-slate-900"
                      title="Rimuovi riga"
                      onClick={() => onRemoveRow?.(idx)}
                    >
                      ×
                    </button>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
