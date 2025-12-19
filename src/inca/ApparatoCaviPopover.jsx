import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function ApparatoCaviPopover({
  open,
  anchorRect,
  incaFileId,
  side, // "DA" | "A"
  apparato,
  onClose,
}) {
  const panelRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [onlyNP, setOnlyNP] = useState(false);
  const [onlyP, setOnlyP] = useState(false);

  const pos = useMemo(() => {
    if (!anchorRect) return { top: 80, left: 40, width: 560 };
    return {
      top: anchorRect.bottom + 8,
      left: Math.max(20, anchorRect.left - 120),
      width: 560,
    };
  }, [anchorRect]);

  useEffect(() => {
    if (!open) return;

    async function load() {
      setLoading(true);
      const field = side === "A" ? "apparato_a" : "apparato_da";

      const { data, error } = await supabase
        .from("inca_cavi")
        .select("id,marca_cavo,situazione,metri_teo,metri_dis")
        .eq("inca_file_id", incaFileId)
        .eq(field, apparato)
        .order("marca_cavo");

      if (!error) setRows(data || []);
      setLoading(false);
    }

    load();
  }, [open, apparato, side, incaFileId]);

  const filtered = useMemo(() => {
    let out = rows;
    if (onlyNP) out = out.filter((r) => !r.situazione);
    if (onlyP) out = out.filter((r) => r.situazione === "P");
    if (q)
      out = out.filter((r) =>
        (r.marca_cavo || "").toLowerCase().includes(q.toLowerCase())
      );
    return out;
  }, [rows, q, onlyNP, onlyP]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        className="absolute rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-white/10 shadow-2xl"
        style={{ top: pos.top, left: pos.left, width: pos.width }}
      >
        <div className="p-4 border-b border-white/10">
          <div className="text-xs uppercase text-slate-400">
            {side === "DA" ? "Partenza" : "Arrivo"}
          </div>
          <div className="text-slate-100 font-semibold">{apparato}</div>

          <div className="mt-3 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca marca cavo…"
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-slate-100"
            />
            <button
              onClick={() => {
                setOnlyNP(!onlyNP);
                setOnlyP(false);
              }}
              className={`px-3 py-2 rounded-lg text-xs ${
                onlyNP ? "bg-emerald-500/20" : "bg-white/5"
              }`}
            >
              NP
            </button>
            <button
              onClick={() => {
                setOnlyP(!onlyP);
                setOnlyNP(false);
              }}
              className={`px-3 py-2 rounded-lg text-xs ${
                onlyP ? "bg-emerald-500/20" : "bg-white/5"
              }`}
            >
              P
            </button>
          </div>
        </div>

        <div className="max-h-[420px] overflow-auto">
          {loading ? (
            <div className="p-4 text-slate-400">Caricamento…</div>
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                className="px-4 py-2 border-b border-white/5 flex justify-between hover:bg-white/5"
              >
                <div className="text-slate-100 text-sm">{r.marca_cavo}</div>
                <div className="text-xs text-slate-300">
                  {r.situazione || "NP"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
