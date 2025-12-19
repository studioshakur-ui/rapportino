import React, { useMemo, useState } from "react";
import ApparatoCaviPopover from "./ApparatoCaviPopover";

function badgeClass(s) {
  switch (s) {
    case "P":
      return "bg-emerald-500/15 text-emerald-200 border-emerald-500/25";
    case "T":
      return "bg-sky-500/15 text-sky-200 border-sky-500/25";
    case "R":
      return "bg-amber-500/15 text-amber-200 border-amber-500/25";
    case "B":
      return "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/25";
    case "E":
      return "bg-rose-500/15 text-rose-200 border-rose-500/25";
    default:
      return "bg-slate-500/15 text-slate-200 border-slate-500/25";
  }
}

function labelSituazione(s) {
  return s ? s : "NP";
}

function fmtNum(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(n);
}

/**
 * Props:
 * - cavi: rows déjà chargés (inca_cavi)
 * - loading: boolean
 * - incaFileId: uuid (filtre actif) — requis pour le popover (refetch ciblé)
 */
export default function IncaCaviTable({ cavi, loading, incaFileId }) {
  const [openPop, setOpenPop] = useState(false);
  const [popSide, setPopSide] = useState("DA"); // "DA" | "A"
  const [popApp, setPopApp] = useState("");
  const [anchorRect, setAnchorRect] = useState(null);

  const total = useMemo(() => (Array.isArray(cavi) ? cavi.length : 0), [cavi]);

  function openAppPopover(e, side, apparato) {
    if (!apparato || !incaFileId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchorRect(rect);
    setPopSide(side);
    setPopApp(apparato);
    setOpenPop(true);
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="text-[11px] text-slate-500 uppercase tracking-wide">
          Cavi ({total})
        </div>
        <div className="text-[11px] text-slate-500">
          Click su APP partenza/arrivo → popup
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-4 text-slate-200/80 text-[13px]">Caricamento…</div>
      ) : (
        <div className="overflow-auto max-h-[62vh]">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-12 gap-0 px-4 py-2 bg-slate-950/90 backdrop-blur border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-500 sticky top-0">
              <div className="col-span-4">Marca cavo</div>
              <div className="col-span-3">Da → A</div>
              <div className="col-span-2">Situaz.</div>
              <div className="col-span-1 text-right">m teo</div>
              <div className="col-span-1 text-right">m posa</div>
              <div className="col-span-1 text-right">PDF</div>
            </div>

            {!Array.isArray(cavi) || cavi.length === 0 ? (
              <div className="px-4 py-10 text-center text-[12px] text-slate-500">
                Nessun cavo trovato.
              </div>
            ) : (
              <div className="divide-y divide-slate-900/80">
                {cavi.map((r) => {
                  const s = (r.situazione || "").trim();
                  const situ = s ? s : "NP";

                  return (
                    <div
                      key={r.id || `${r.codice || ""}-${r.marca_cavo || ""}`}
                      className="grid grid-cols-12 gap-0 px-4 py-3 hover:bg-slate-900/40"
                    >
                      {/* Marca cavo */}
                      <div className="col-span-4 text-slate-100 text-[13px] font-medium">
                        {r.marca_cavo || r.codice || "—"}
                        {r.marca_cavo && r.codice ? (
                          <span className="text-slate-400/70 font-normal"> · {r.codice}</span>
                        ) : null}
                      </div>

                      {/* Da → A (cliquable) */}
                      <div className="col-span-3 text-[13px] text-slate-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => openAppPopover(e, "DA", r.apparato_da)}
                          className="max-w-[48%] truncate rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-left"
                          title={r.apparato_da || ""}
                          aria-label="Apri popup apparato partenza"
                        >
                          {r.apparato_da || "—"}
                        </button>
                        <span className="text-slate-300/70">→</span>
                        <button
                          type="button"
                          onClick={(e) => openAppPopover(e, "A", r.apparato_a)}
                          className="max-w-[48%] truncate rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2 py-1 text-left"
                          title={r.apparato_a || ""}
                          aria-label="Apri popup apparato arrivo"
                        >
                          {r.apparato_a || "—"}
                        </button>
                      </div>

                      {/* Situazione */}
                      <div className="col-span-2">
                        <span
                          className={`inline-flex items-center justify-center rounded-lg border px-2 py-[2px] text-[12px] ${
                            situ === "NP" ? badgeClass(null) : badgeClass(situ)
                          }`}
                        >
                          {labelSituazione(situ === "NP" ? null : situ)}
                        </span>
                      </div>

                      {/* metri */}
                      <div className="col-span-1 text-right text-slate-200/80 text-[13px]">
                        {fmtNum(r.metri_teo)}
                      </div>
                      <div className="col-span-1 text-right text-slate-200/80 text-[13px]">
                        {fmtNum(r.metri_dis)}
                      </div>

                      {/* PDF page */}
                      <div className="col-span-1 text-right text-slate-200/70 text-[13px]">
                        {r.pagina_pdf ? `p.${r.pagina_pdf}` : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Popup glass */}
      <ApparatoCaviPopover
        open={openPop}
        anchorRect={anchorRect}
        incaFileId={incaFileId}
        side={popSide}
        apparato={popApp}
        onClose={() => setOpenPop(false)}
      />
    </div>
  );
}
