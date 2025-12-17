import React from "react";
import { formatPrevisto, adjustOperatorTempoHeights } from "../../rapportinoUtils";

function PrintText({ value }) {
  return <div className="rapportino-print-text">{value || ""}</div>;
}

export default function RapportinoTable({ rows, onRowChange, onRemoveRow }) {
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
            <th className="px-2 py-2 text-center w-[60px] no-print">×</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.id || idx} className="align-top" data-ot-wrap>
              {/* categoria */}
              <td className="px-2 py-2">
                <input
                  className="w-full bg-transparent outline-none"
                  value={r.categoria || ""}
                  onChange={(e) => onRowChange(idx, "categoria", e.target.value)}
                />
              </td>

              {/* descrizione */}
              <td className="px-2 py-2">
                <input
                  className="w-full bg-transparent outline-none"
                  value={r.descrizione || ""}
                  onChange={(e) => onRowChange(idx, "descrizione", e.target.value)}
                />
              </td>

              {/* operatore */}
              <td className="px-2 py-2">
                {/* écran */}
                <textarea
                  className="no-print rapportino-textarea w-full bg-transparent outline-none"
                  data-ot="op"
                  value={r.operatori || ""}
                  onChange={(e) =>
                    onRowChange(idx, "operatori", e.target.value, e.target)
                  }
                  onInput={(e) => adjustOperatorTempoHeights(e.target)}
                />

                {/* print */}
                <div className="print-only">
                  <PrintText value={r.operatori} />
                </div>
              </td>

              {/* tempo */}
              <td className="px-2 py-2 text-center">
                {/* écran */}
                <textarea
                  className="no-print rapportino-textarea w-full text-center bg-transparent outline-none"
                  data-ot="tm"
                  value={r.tempo || ""}
                  onChange={(e) =>
                    onRowChange(idx, "tempo", e.target.value, e.target)
                  }
                  onInput={(e) => adjustOperatorTempoHeights(e.target)}
                />

                {/* print */}
                <div className="print-only text-center">
                  <PrintText value={r.tempo} />
                </div>
              </td>

              {/* previsto */}
              <td className="px-2 py-2 text-right">
                <div className="no-print">
                  <input
                    className="w-full text-right bg-transparent outline-none"
                    value={r.previsto || ""}
                    onChange={(e) =>
                      onRowChange(idx, "previsto", e.target.value)
                    }
                  />
                </div>
                <div className="print-only">
                  {formatPrevisto(r.previsto)}
                </div>
              </td>

              {/* prodotto */}
              <td className="px-2 py-2 text-right">
                <input
                  className="w-full text-right bg-transparent outline-none"
                  value={r.prodotto || ""}
                  onChange={(e) =>
                    onRowChange(idx, "prodotto", e.target.value)
                  }
                />
              </td>

              {/* note */}
              <td className="px-2 py-2">
                <textarea
                  className="no-print rapportino-textarea w-full bg-transparent outline-none"
                  value={r.note || ""}
                  onChange={(e) => onRowChange(idx, "note", e.target.value)}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.max(
                      e.target.scrollHeight,
                      22
                    )}px`;
                  }}
                />
                <div className="print-only">
                  <PrintText value={r.note} />
                </div>
              </td>

              {/* delete */}
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

              <td className="print-only" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
