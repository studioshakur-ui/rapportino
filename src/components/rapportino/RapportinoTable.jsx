// /src/components/rapportino/RapportinoTable.jsx
import React, { useMemo } from "react";
import { formatPrevisto, adjustOperatorTempoHeights } from "../../rapportinoUtils";
import { splitLinesKeepEmpties } from "../rapportino/page/rapportinoHelpers";

/**
 * RapportinoTable — CORE signature A (chips × par opérateur) + alignement tempo strict
 *
 * - Canonical rows (operator_items non vide):
 *    - OPERATORE rendu en chips (avec × individuel)
 *    - TEMPO: uniquement via TempoPicker (pas d’édition libre)
 *    - Alignement strict: opérateurs ↔ tempo basé sur operator_items (même nombre de lignes)
 * - Legacy rows:
 *    - rendu original multiline
 *    - TEMPO textarea + adjust heights
 */

function PrintText({ value }) {
  return <div className="rapportino-print-text">{value || ""}</div>;
}

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function prettyMultiline(v) {
  if (!v) return "";
  return String(v)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

function normalizeTempoDisplay(value) {
  const s = String(value ?? "").trim();
  if (!s) return "—";
  return s;
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
    return rows.map((r) => Array.isArray(r?.operator_items) && r.operator_items.length > 0);
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

            // Alignement strict:
            // - Canonical: compare lengths incl. empties (operator_items drives both)
            // - Legacy: compare non-empty lines (best effort)
            const opLines = splitLinesKeepEmpties(r.operatori);
            const tmLines = splitLinesKeepEmpties(r.tempo);
            const mismatch = isCanonical ? opLines.length !== tmLines.length : false;

            const canonItems = Array.isArray(r.operator_items) ? r.operator_items : [];

            return (
              <tr key={r.id || idx} className="align-top" data-ot-wrap>
                {/* CATEGORIA */}
                <td className="px-2 py-2">
                  <div className="flex items-start gap-2">
                    <input
                      className={cn(
                        "w-full bg-transparent outline-none",
                        cellDisabled ? "opacity-80 cursor-not-allowed" : ""
                      )}
                      value={r.categoria || ""}
                      onChange={cellDisabled ? undefined : (e) => onRowChange(idx, "categoria", e.target.value)}
                      disabled={cellDisabled}
                      readOnly={cellDisabled}
                      title={isCatalogLocked ? "Categoria bloccata: proviene dal Catalogo" : undefined}
                    />
                    {isCatalogLocked ? (
                      <span
                        className="no-print inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700"
                        title="Riga collegata al Catalogo (source of truth)"
                      >
                        C
                      </span>
                    ) : null}
                  </div>
                </td>

                {/* DESCRIZIONE */}
                <td className="px-2 py-2">
                  <input
                    className={cn(
                      "w-full bg-transparent outline-none",
                      cellDisabled ? "opacity-80 cursor-not-allowed" : ""
                    )}
                    value={r.descrizione || ""}
                    onChange={cellDisabled ? undefined : (e) => onRowChange(idx, "descrizione", e.target.value)}
                    disabled={cellDisabled}
                    readOnly={cellDisabled}
                    title={isCatalogLocked ? "Descrizione bloccata: proviene dal Catalogo" : undefined}
                  />
                </td>

                {/* OPERATORE */}
                <td className="px-2 py-2">
                  {/* CANONICAL => chips */}
                  {isCanonical ? (
                    <>
                      <div
                        className={cn(
                          "no-print w-full rounded-md border border-slate-200 bg-white/70",
                          "px-2 py-2",
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
                                  className={cn(
                                    "inline-flex items-center gap-2",
                                    "rounded-full border border-slate-200 bg-white",
                                    "px-2.5 py-1",
                                    "text-[12px] font-semibold text-slate-900"
                                  )}
                                  title={label}
                                >
                                  <span className="max-w-[180px] truncate">{label}</span>
                                  {!ro ? (
                                    <button
                                      type="button"
                                      className={cn(
                                        "rounded-full border border-slate-200",
                                        "w-6 h-6 inline-flex items-center justify-center",
                                        "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                      )}
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
                      {/* LEGACY => bloc multiline (no regress) */}
                      <div
                        className={cn(
                          "no-print w-full rounded-md border border-slate-200 bg-white/70",
                          "px-2 py-2 text-[12px] leading-5",
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
                        {prettyMultiline(r.operatori) ? (
                          <pre className="whitespace-pre-wrap font-sans">{prettyMultiline(r.operatori)}</pre>
                        ) : (
                          <span className="text-slate-400">Tocca per scegliere…</span>
                        )}
                      </div>

                      <div className="print-only">
                        <PrintText value={r.operatori} />
                      </div>
                    </>
                  )}
                </td>

                {/* TEMPO */}
                <td className="px-2 py-2 text-center">
                  {isCanonical ? (
                    <>
                      <div
                        className={cn(
                          "no-print w-full rounded-md border border-slate-200 bg-white/70",
                          "px-2 py-2 text-[12px] leading-5 text-center",
                          ro ? "opacity-80 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50"
                        )}
                        role={ro ? undefined : "button"}
                        tabIndex={ro ? -1 : 0}
                        title={ro ? undefined : "Tocca per impostare le ore…"}
                        onClick={() => {
                          if (ro) return;
                          onOpenTempoPicker?.(idx);
                        }}
                        onKeyDown={(e) => {
                          if (ro) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onOpenTempoPicker?.(idx);
                          }
                        }}
                      >
                        <div className="text-[11px] text-slate-500 mb-1">
                          {mismatch ? (
                            <span className="text-amber-600 font-semibold">Allineamento da correggere</span>
                          ) : (
                            <span>{canonItems.length > 0 ? `${canonItems.length} operatori` : "Nessun operatore"}</span>
                          )}
                        </div>
                        <pre className="whitespace-pre-wrap font-sans text-[12px]">
                          {prettyMultiline(r.tempo)
                            ? prettyMultiline(r.tempo)
                            : canonItems.length > 0
                            ? "Tocca per inserire ore…"
                            : "—"}
                        </pre>
                      </div>

                      <div className="print-only text-center">
                        <PrintText value={r.tempo} />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* LEGACY: free textarea (no regress) */}
                      <textarea
                        className={cn(
                          "no-print rapportino-textarea w-full text-center bg-transparent outline-none",
                          ro ? "opacity-80 cursor-not-allowed" : ""
                        )}
                        data-ot="tm"
                        value={r.tempo || ""}
                        onChange={ro ? undefined : (e) => onRowChange(idx, "tempo", e.target.value, e.target)}
                        onInput={(e) => {
                          if (!ro) adjustOperatorTempoHeights(e.target);
                        }}
                        disabled={ro}
                        readOnly={ro}
                      />
                      <div className="print-only text-center">
                        <PrintText value={normalizeTempoDisplay(r.tempo)} />
                      </div>
                    </>
                  )}
                </td>

                {/* PREVISTO */}
                <td className="px-2 py-2 text-right">
                  <div className="no-print">
                    <input
                      className={cn(
                        "w-full text-right bg-transparent outline-none",
                        (ro || isCatalogLocked) ? "opacity-80 cursor-not-allowed" : ""
                      )}
                      value={r.previsto || ""}
                      onChange={(ro || isCatalogLocked) ? undefined : (e) => onRowChange(idx, "previsto", e.target.value)}
                      disabled={ro || isCatalogLocked}
                      readOnly={ro || isCatalogLocked}
                      title={isCatalogLocked ? "Previsto bloccato: proviene dal Catalogo" : undefined}
                    />
                  </div>
                  <div className="print-only">{formatPrevisto(r.previsto)}</div>
                </td>

                {/* PRODOTTO */}
                <td className="px-2 py-2 text-right">
                  <input
                    className={cn(
                      "w-full text-right bg-transparent outline-none",
                      ro ? "opacity-80 cursor-not-allowed" : ""
                    )}
                    value={r.prodotto || ""}
                    onChange={ro ? undefined : (e) => onRowChange(idx, "prodotto", e.target.value)}
                    disabled={ro}
                    readOnly={ro}
                  />
                </td>

                {/* NOTE */}
                <td className="px-2 py-2">
                  <textarea
                    className={cn(
                      "no-print rapportino-textarea w-full bg-transparent outline-none",
                      ro ? "opacity-80 cursor-not-allowed" : ""
                    )}
                    value={r.note || ""}
                    onChange={ro ? undefined : (e) => onRowChange(idx, "note", e.target.value)}
                    onInput={(e) => {
                      if (ro) return;
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.max(e.target.scrollHeight, 22)}px`;
                    }}
                    disabled={ro}
                    readOnly={ro}
                  />
                  <div className="print-only">
                    <PrintText value={r.note} />
                  </div>
                </td>

                {/* DELETE ROW */}
                {!ro && (
                  <td className="px-2 py-2 text-center no-print">
                    <button
                      type="button"
                      onClick={() => onRemoveRow?.(idx)}
                      className="w-9 h-9 rounded-md border border-slate-300 hover:bg-slate-50"
                      aria-label="Rimuovi riga"
                      title="Rimuovi riga"
                    >
                      ×
                    </button>
                  </td>
                )}

                <td className="print-only" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
