import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

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

export default function ApparatoCaviPopover({
  open,
  anchorRect,
  incaFileId,
  side, // "DA" | "A"
  apparato,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(""); // "" | "P" | "NP" | "T" | "R" | "B" | "E"

  const position = useMemo(() => {
    // fallback safe
    const base = { top: 120, left: 24, width: 680 };
    if (!anchorRect) return base;

    const w = 680;
    const pad = 16;

    const left = Math.min(
      Math.max(pad, anchorRect.left - 180),
      Math.max(pad, window.innerWidth - w - pad)
    );

    const top = Math.min(
      anchorRect.bottom + 10,
      Math.max(pad, window.innerHeight - 520 - pad)
    );

    return { top, left, width: w };
  }, [anchorRect]);

  useEffect(() => {
    if (!open) return;
    if (!incaFileId || !apparato) return;

    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const field = side === "A" ? "apparato_a" : "apparato_da";

        const { data, error } = await supabase
          .from("inca_cavi")
          .select("id,marca_cavo,codice,situazione,metri_teo,metri_dis,pagina_pdf")
          .eq("inca_file_id", incaFileId)
          .eq(field, apparato)
          .order("marca_cavo", { ascending: true });

        if (error) throw error;
        if (!alive) return;

        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("[ApparatoCaviPopover] load error:", e);
        if (!alive) return;
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [open, incaFileId, apparato, side]);

  const filtered = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    const qq = (q || "").trim().toLowerCase();

    return list.filter((r) => {
      const s = r.situazione ? r.situazione : "NP";
      if (filter && s !== filter) return false;

      if (!qq) return true;

      const hay = [
        r.marca_cavo,
        r.codice,
        r.situazione,
        r.pagina_pdf ? String(r.pagina_pdf) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [rows, q, filter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-md"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Chiudi popup"
      />

      {/* panel */}
      <div
        className="inca-popover absolute rounded-2xl border border-white/10 bg-slate-950/70 shadow-2xl backdrop-blur-xl overflow-hidden"
        style={{ top: position.top, left: position.left, width: position.width }}
        role="dialog"
        aria-modal="true"
        aria-label="Dettaglio apparato"
      >
        {/* header */}
        <div className="inca-popover-header px-4 py-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inca-popover-title text-[11px] uppercase text-slate-400">
              {side === "DA" ? "APP PARTENZA" : "APP ARRIVO"}
            </div>
            <div className="text-lg font-semibold text-slate-100 truncate">
              {apparato}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Cavi:{" "}
              <span className="text-slate-200 font-semibold">
                {filtered.length}
              </span>
              {loading ? <span className="text-slate-500"> · carico…</span> : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onClose?.()}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/10"
          >
            Chiudi
          </button>
        </div>

        {/* controls */}
        <div className="px-4 py-3 border-b border-white/10 flex flex-col gap-2 md:flex-row md:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca (marca/codice)…"
            className="w-full md:flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-400/70 outline-none focus:border-emerald-400/40"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full md:w-[170px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-emerald-400/40"
          >
            <option value="">Tutte</option>
            <option value="P">P</option>
            <option value="NP">NP</option>
            <option value="T">T</option>
            <option value="R">R</option>
            <option value="B">B</option>
            <option value="E">E</option>
          </select>
        </div>

        {/* list */}
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead className="inca-popover-table">
              <tr className="text-[11px] uppercase tracking-wide text-slate-300/70">
                <th className="text-left px-4 py-2 font-medium w-[58%]">
                  Marca cavo
                </th>
                <th className="text-left px-4 py-2 font-medium w-[16%]">
                  Situaz.
                </th>
                <th className="text-right px-4 py-2 font-medium w-[16%]">
                  m teo
                </th>
                <th className="text-right px-4 py-2 font-medium w-[10%]">
                  PDF
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-slate-200/80 text-[13px]"
                  >
                    Caricamento…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-slate-200/70 text-[13px]"
                  >
                    Nessun cavo.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const s = r.situazione ? r.situazione : "NP";
                  return (
                    <tr key={r.id} className="inca-popover-row">
                      <td className="px-4 py-3 text-slate-100 font-medium">
                        {r.marca_cavo || r.codice || "—"}
                        {r.marca_cavo && r.codice ? (
                          <span className="text-slate-400/70 font-normal">
                            {" "}
                            · {r.codice}
                          </span>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center justify-center rounded-lg border px-2 py-[2px] text-[12px] ${badgeClass(
                            s === "NP" ? null : s
                          )}`}
                        >
                          {labelSituazione(s === "NP" ? null : s)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right text-slate-200/80">
                        {r.metri_teo ?? "—"}
                      </td>

                      <td className="px-4 py-3 text-right text-slate-200/70">
                        {r.pagina_pdf ? `p.${r.pagina_pdf}` : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* footer résumé (premium, utile) */}
        <div className="inca-popover-footer px-4 py-2 flex justify-between text-[11px] text-slate-400">
          <span>
            Cavi:{" "}
            <strong className="text-slate-200">{filtered.length}</strong>
          </span>
          <span>
            Posati:{" "}
            <strong className="text-emerald-300">
              {filtered.filter((r) => r.situazione === "P").length}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
