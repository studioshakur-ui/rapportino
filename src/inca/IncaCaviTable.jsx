import React, { useMemo, useState } from "react";
import ApparatoCaviPopover from "../components/inca/ApparatoCaviPopover";

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
 * - cavi: array of inca_cavi rows (déjà chargés)
 * - loading: boolean
 * - incaFileId: uuid (filtre actif) — requis pour le popover
 */
export default function IncaCaviTable({ cavi, loading, incaFileId }) {
  const [search, setSearch] = useState("");
  const [statoFilter, setStatoFilter] = useState(""); // P/T/R/B/E/NP
  const [openPop, setOpenPop] = useState(false);
  const [popSide, setPopSide] = useState("DA"); // "DA" | "A"
  const [popApp, setPopApp] = useState("");
  const [anchorRect, setAnchorRect] = useState(null);

  const { filtered, distinctStati } = useMemo(() => {
    const list = Array.isArray(cavi) ? cavi : [];
    const norm = (v) => (v || "").toString().toLowerCase();

    const stati = new Set(["P", "T", "R", "B", "E", "NP"]);
    const q = norm(search).trim();

    let out = list;

    if (q) {
      out = out.filter((r) => {
        const hay = [
          r.marca_cavo,
          r.codice,
          r.apparato_da,
          r.apparato_a,
          r.zona_da,
          r.zona_a,
          r.descrizione_da,
          r.descrizione_a,
        ]
          .map(norm)
          .join(" | ");
        return hay.includes(q);
      });
    }

    if (statoFilter) {
      out = out.filter((r) => {
        const s = r.situazione ? r.situazione : "NP";
        return s === statoFilter;
      });
    }

    return {
      filtered: out,
      distinctStati: Array.from(stati),
    };
  }, [cavi, search, statoFilter]);

  function openAppPopover(e, side, apparato) {
    if (!apparato) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchorRect(rect);
    setPopSide(side);
    setPopApp(apparato);
    setOpenPop(true);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-white/10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-300/70">
            Cavi
          </div>
          <div className="text-slate-100 text-[13px]">
            {Array.isArray(cavi) ? cavi.length : 0}
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca marca cavo / app / zona / descrizione…"
            className="w-full md:w-[360px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-400/70 outline-none focus:border-emerald-400/40"
          />
          <select
            value={statoFilter}
            onChange={(e) => setStatoFilter(e.target.value)}
            className="w-full md:w-[160px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-emerald-400/40"
          >
            <option value="">Tutte</option>
            {distinctStati.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-12 gap-0 px-4 py-2 bg-white/5 text-[11px] uppercase tracking-wide text-slate-300/70">
            <div className="col-span-4">Marca cavo</div>
            <div className="col-span-3">Da → A</div>
            <div className="col-span-2">Situaz.</div>
            <div className="col-span-1 text-right">m teo</div>
            <div className="col-span-1 text-right">m posa</div>
            <div className="col-span-1 text-right">PDF</div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-slate-200/80 text-[13px]">Caricamento…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-slate-200/70 text-[13px]">
              Nessun cavo trovato.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filtered.map((r) => (
                <div
                  key={r.id || `${r.cca || ""}-${r.codice || ""}-${r.marca_cavo || ""}`}
                  className="grid grid-cols-12 gap-0 px-4 py-3 hover:bg-white/5"
                >
                  {/* Marca cavo */}
                  <div className="col-span-4 text-slate-100 text-[13px] font-medium">
                    {r.marca_cavo || r.codice || "—"}
                  </div>

                  {/* Da → A (cliquable sur chaque côté) */}
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
                      className={`inline-flex items-center justify-center rounded-lg border px-2 py-[2px] text-[12px] ${badgeClass(
                        r.situazione
                      )}`}
                      title="Situazione"
                    >
                      {labelSituazione(r.situazione)}
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
              ))}
            </div>
          )}
        </div>
      </div>

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
