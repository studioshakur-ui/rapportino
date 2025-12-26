// /src/components/rapportino/RapportinoTable.jsx
import React, { useMemo } from "react";
import { formatPrevisto, adjustOperatorTempoHeights } from "../../rapportinoUtils";

/**
 * TEMPO — canonical hardening (CNCS-safe):
 * - If row.operator_items exists (operator_id canonical), TEMPO is NOT a free textarea.
 * - TEMPO cell becomes a button opening a tempo picker modal handled by parent.
 * - Legacy rows (no operator_items) keep textarea, with height alignment helper.
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

function splitLinesKeepEmpties(s) {
  return String(s || "").split(/\r?\n/);
}

function countNonEmptyLines(s) {
  return splitLinesKeepEmpties(s)
    .map((x) => String(x ?? "").trim())
    .filter(Boolean).length;
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
  readOnly = false,

  // operator picker (existing)
  onOpenOperatorPicker,

  // tempo picker (new)
  onOpenTempoPicker,
}) {
  const ro = readOnly || !onRowChange;

  // Precompute: which rows are in canonical operator_id mode
  const canonicalByIdx = useMemo(() => {
    return rows.map((r) => Array.isArray(r?.operator_items) && r.operator_items.length > 0);
  }, [rows]);

  return (
    <div className="mt-3">
      <table className="rapportino-table text-[11px] w-full">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-2 py-2 text-left w-[140px]">CATEGORIA</th>
            <th className="px-2 py-2 text-left w-[360px]">DESCRIZIONE ATTIVITÀ</th>

            <th className="px-2 py-2 text-left w-[220px]">
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

            // Basic quality hints (display-only)
            const opCount = countNonEmptyLines(r.operatori);
            const tmCount = countNonEmptyLines(r.tempo);
            const mismatch = opCount > 0 && tmCount > 0 && opCount !== tmCount;

            return (
              <tr key={r.id || idx} className="align-top" data-ot-wrap>
                <td className="px-2 py-2">
                  <input
                    className={
                      "w-full bg-transparent outline-none" + (ro ? " opacity-80 cursor-not-allowed" : "")
                    }
                    value={r.categoria || ""}
                    onChange={ro ? undefined : (e) => onRowChange(idx, "categoria", e.target.value)}
                    disabled={ro}
                    readOnly={ro}
                  />
                </td>

                <td className="px-2 py-2">
                  <input
                    className={
                      "w-full bg-transparent outline-none" + (ro ? " opacity-80 cursor-not-allowed" : "")
                    }
                    value={r.descrizione || ""}
                    onChange={ro ? undefined : (e) => onRowChange(idx, "descrizione", e.target.value)}
                    disabled={ro}
                    readOnly={ro}
                  />
                </td>

                {/* OPERATORE */}
                <td className="px-2 py-2">
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
                </td>

                {/* TEMPO */}
                <td className="px-2 py-2 text-center">
                  {/* Canonical: tempo picker only */}
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
                            <span>{opCount > 0 ? `${opCount} operatori` : "Nessun operatore"}</span>
                          )}
                        </div>
                        <pre className="whitespace-pre-wrap font-sans text-[12px]">
                          {prettyMultiline(r.tempo)
                            ? prettyMultiline(r.tempo)
                            : opCount > 0
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
                      {/* Legacy: free textarea (still allowed) */}
                      <textarea
                        className={
                          "no-print rapportino-textarea w-full text-center bg-transparent outline-none" +
                          (ro ? " opacity-80 cursor-not-allowed" : "")
                        }
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

                <td className="px-2 py-2 text-right">
                  <div className="no-print">
                    <input
                      className={
                        "w-full text-right bg-transparent outline-none" + (ro ? " opacity-80 cursor-not-allowed" : "")
                      }
                      value={r.previsto || ""}
                      onChange={ro ? undefined : (e) => onRowChange(idx, "previsto", e.target.value)}
                      disabled={ro}
                      readOnly={ro}
                    />
                  </div>
                  <div className="print-only">{formatPrevisto(r.previsto)}</div>
                </td>

                <td className="px-2 py-2 text-right">
                  <input
                    className={
                      "w-full text-right bg-transparent outline-none" + (ro ? " opacity-80 cursor-not-allowed" : "")
                    }
                    value={r.prodotto || ""}
                    onChange={ro ? undefined : (e) => onRowChange(idx, "prodotto", e.target.value)}
                    disabled={ro}
                    readOnly={ro}
                  />
                </td>

                <td className="px-2 py-2">
                  <textarea
                    className={
                      "no-print rapportino-textarea w-full bg-transparent outline-none" + (ro ? " opacity-80 cursor-not-allowed" : "")
                    }
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

                {!ro && (
                  <td className="px-2 py-2 text-center no-print">
                    <button
                      type="button"
                      onClick={() => onRemoveRow?.(idx)}
                      className="w-9 h-9 rounded-md border border-slate-300 hover:bg-slate-50"
                      aria-label="Rimuovi riga"
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
