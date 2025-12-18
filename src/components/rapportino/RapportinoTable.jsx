// src/components/rapportino/RapportinoTable.jsx
import React from "react";
import { formatPrevisto, adjustOperatorTempoHeights } from "../../rapportinoUtils";

function PrintText({ value }) {
  return <div className="rapportino-print-text">{value || ""}</div>;
}

export default function RapportinoTable({
  rows,
  onRowChange,
  onRemoveRow,
  readOnly = false,
}) {
  const ro = readOnly || !onRowChange;

  return (
    <div className="mt-3">
      <table className="rapportino-table text-[11px] w-full">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-2 py-2 text-left w-[140px]">CATEGORIA</th>
            <th className="px-2 py-2 text-left w-[360px]">DESCRIZIONE ATTIVITÀ</th>
            <th className="px-2 py-2 text-left w-[220px]">OPERATORE</th>
            <th className="px-2 py-2 text-center w-[140px]">
              TEMPO<br />
              <span className="text-[10px] text-slate-500">(ORE)</span>
            </th>
            <th className="px-2 py-2 text-right w-[120px]">PREVISTO</th>
            <th className="px-2 py-2 text-right w-[120px]">
              PRODOTTO<br />
              <span className="text-[10px] text-slate-500">(MT)</span>
            </th>
            <th className="px-2 py-2 text-left">NOTE</th>
            {!ro && <th className="px-2 py-2 text-center w-[60px] no-print">×</th>}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id || idx} className="align-top" data-ot-wrap>
              <td className="px-2 py-2">
                <input
                  className={
                    "w-full bg-transparent outline-none" +
                    (ro ? " opacity-80 cursor-not-allowed" : "")
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
                    "w-full bg-transparent outline-none" +
                    (ro ? " opacity-80 cursor-not-allowed" : "")
                  }
                  value={r.descrizione || ""}
                  onChange={
                    ro ? undefined : (e) => onRowChange(idx, "descrizione", e.target.value)
                  }
                  disabled={ro}
                  readOnly={ro}
                />
              </td>

              <td className="px-2 py-2">
                <textarea
                  className={
                    "no-print rapportino-textarea w-full bg-transparent outline-none" +
                    (ro ? " opacity-80 cursor-not-allowed" : "")
                  }
                  data-ot="op"
                  value={r.operatori || ""}
                  onChange={
                    ro ? undefined : (e) => onRowChange(idx, "operatori", e.target.value, e.target)
                  }
                  onInput={(e) => {
                    if (!ro) adjustOperatorTempoHeights(e.target);
                  }}
                  disabled={ro}
                  readOnly={ro}
                />
                <div className="print-only">
                  <PrintText value={r.operatori} />
                </div>
              </td>

              <td className="px-2 py-2 text-center">
                <textarea
                  className={
                    "no-print rapportino-textarea w-full text-center bg-transparent outline-none" +
                    (ro ? " opacity-80 cursor-not-allowed" : "")
                  }
                  data-ot="tm"
                  value={r.tempo || ""}
                  onChange={
                    ro ? undefined : (e) => onRowChange(idx, "tempo", e.target.value, e.target)
                  }
                  onInput={(e) => {
                    if (!ro) adjustOperatorTempoHeights(e.target);
                  }}
                  disabled={ro}
                  readOnly={ro}
                />
                <div className="print-only text-center">
                  <PrintText value={r.tempo} />
                </div>
              </td>

              <td className="px-2 py-2 text-right">
                <div className="no-print">
                  <input
                    className={
                      "w-full text-right bg-transparent outline-none" +
                      (ro ? " opacity-80 cursor-not-allowed" : "")
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
                    "w-full text-right bg-transparent outline-none" +
                    (ro ? " opacity-80 cursor-not-allowed" : "")
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
                    "no-print rapportino-textarea w-full bg-transparent outline-none" +
                    (ro ? " opacity-80 cursor-not-allowed" : "")
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
