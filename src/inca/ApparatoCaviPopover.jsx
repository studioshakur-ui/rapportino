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
  incaFileId,
  side, // "DA" | "A"
  apparato,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!open || !incaFileId || !apparato) return;

    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const field = side === "A" ? "apparato_a" : "apparato_da";

        const { data, error } = await supabase
          .from("inca_cavi")
          .select(
            "id,marca_cavo,codice,situazione,metri_teo,metri_dis,pagina_pdf"
          )
          .eq("inca_file_id", incaFileId)
          .eq(field, apparato)
          .order("marca_cavo", { ascending: true });

        if (error) throw error;
        if (alive) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("[ApparatoCaviPopover] load error:", e);
        if (alive) setRows([]);
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
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      const s = r.situazione ?? "NP";
      if (filter && s !== filter) return false;
      if (!qq) return true;

      return (
        `${r.marca_cavo || ""} ${r.codice || ""} ${r.pagina_pdf || ""}`
          .toLowerCase()
          .includes(qq)
      );
    });
  }, [rows, q, filter]);

  const total = rows.length;
  const visible = filtered.length;

  let status = "GREEN";
  if (!loading) {
    if (visible === 0) status = "RED";
    else if (visible < total) status = "YELLOW";
  }

  const statusDot =
    status === "GREEN"
      ? "bg-emerald-400"
      : status === "YELLOW"
      ? "bg-amber-400"
      : "bg-rose-400";

  const sideLabel = side === "DA" ? "APP PARTENZA" : "APP ARRIVO";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      />

      {/* panel — CENTRÉ */}
      <div
        className="relative w-[min(720px,calc(100vw-24px))] max-h-[90vh]
                   rounded-2xl border border-white/10
                   bg-slate-950/75 shadow-2xl backdrop-blur-xl
                   flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* header */}
        <div className="px-4 py-3 flex justify-between items-start border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase text-slate-400">
                {sideLabel}
              </span>
              <span className={`h-2 w-2 rounded-full ${statusDot}`} />
            </div>
            <div className="text-lg font-semibold text-slate-100 mt-0.5">
              {apparato}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Visibili <strong>{visible}</strong> / {total}
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5
                       px-3 py-2 text-[12px] text-slate-200 hover:bg-white/10"
          >
            Chiudi
          </button>
        </div>

        {/* controls */}
        <div className="px-4 py-3 border-b border-white/10 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca…"
            className="flex-1 rounded-xl border border-white/10 bg-white/5
                       px-3 py-2 text-[13px] text-slate-100"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-[140px] rounded-xl border border-white/10 bg-white/5
                       px-3 py-2 text-[13px] text-slate-100"
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
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[13px]">
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-300">Caricamento…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400">
                    Nessun cavo visibile
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const s = r.situazione ?? "NP";
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-slate-100">
                        {r.marca_cavo || r.codice}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-lg border px-2 py-[2px]
                                      ${badgeClass(s === "NP" ? null : s)}`}
                        >
                          {labelSituazione(s === "NP" ? null : s)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.metri_teo ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {r.pagina_pdf ? `p.${r.pagina_pdf}` : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
