// src/components/ApparatoCaviPopover.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * APPARATO CAVI — Popover (CORE 1.0) — UI tightened
 * - Affiche un état "vu" par côté DA/A :
 *   - 100% => P sur DA + A
 *   - >=50% => P sur le côté choisi (progress_side), T sur l'autre
 *   - sinon => fallback sur INCA globale (situazione, NULL => NP)
 *
 * IMPORTANT (fix naval-grade):
 * - NE JAMAIS "inventer" un progress_side (pas de défaut DA si NULL).
 * - Le mode "par côté" s'active uniquement si progress_percent ET progress_side sont réellement persistés.
 *
 * UI simplification:
 * - Header compact
 * - Contrôles en une ligne
 * - Table: 3 colonnes utiles (Codice, Stato, Metri/Pagina)
 */

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

function normalizeKey(raw) {
  const v = raw == null ? "" : String(raw).trim();
  return v ? v : "NP";
}

function normalizeProgressPercent(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n === 50 || n === 70 || n === 100) return n;
  return null;
}

function normalizeProgressSideNullable(raw) {
  const v = raw == null ? "" : String(raw).trim();
  if (v === "DA" || v === "A") return v;
  return null; // IMPORTANT: no default
}

function situazionePerSide(row, side) {
  const percent = normalizeProgressPercent(row?.progress_percent);
  const fromSide = normalizeProgressSideNullable(row?.progress_side);

  // Apply "per-side" logic only if both are present (persisted)
  if (percent != null && fromSide) {
    if (percent >= 100) return "P";
    if (percent >= 50) return fromSide === side ? "P" : "T";
  }

  // Fallback: INCA global situazione
  const global = normalizeKey(row?.situazione);
  return global === "NP" ? "NP" : global;
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
          .select("id,marca_cavo,codice,situazione,metri_teo,pagina_pdf,progress_percent,progress_side")
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
      const s = situazionePerSide(r, side);

      if (filter && s !== filter) return false;
      if (!qq) return true;

      return `${r.marca_cavo || ""} ${r.codice || ""} ${r.pagina_pdf || ""}`
        .toLowerCase()
        .includes(qq);
    });
  }, [rows, q, filter, side]);

  const total = rows.length;
  const visible = filtered.length;

  let status = "GREEN";
  if (!loading) {
    if (visible === 0) status = "RED";
    else if (visible < total) status = "YELLOW";
  }

  const statusDot =
    status === "GREEN" ? "bg-emerald-400" : status === "YELLOW" ? "bg-amber-400" : "bg-rose-400";

  const sideLabel = side === "DA" ? "APP PARTENZA" : "APP ARRIVO";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      />

      <div
        className={[
          "relative w-[min(760px,calc(100vw-24px))] max-h-[90vh]",
          "rounded-2xl border border-slate-800",
          "bg-slate-950 shadow-2xl",
          "flex flex-col overflow-hidden",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
      >
        {/* header (compact) */}
        <div className="px-4 py-3 flex justify-between items-start border-b border-slate-800 bg-slate-950/80">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{sideLabel}</span>
              <span className={`h-2 w-2 rounded-full ${statusDot}`} />
              <span className="text-[11px] text-slate-500">
                <span className="text-slate-200 font-semibold">{visible}</span> / {total}
              </span>
            </div>
            <div className="text-lg font-semibold text-slate-100 mt-0.5 truncate">{apparato}</div>
          </div>

          <button
            onClick={onClose}
            className={[
              "rounded-xl border border-slate-700 bg-slate-950/60",
              "px-3 py-2 text-[12px] font-semibold text-slate-200",
              "hover:bg-slate-900/50",
              "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
            ].join(" ")}
          >
            Chiudi
          </button>
        </div>

        {/* controls (one line) */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca…"
            className={[
              "flex-1 rounded-xl border border-slate-800 bg-slate-950/70",
              "px-3 py-2 text-[13px] text-slate-100",
              "placeholder:text-slate-500",
              "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
            ].join(" ")}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={[
              "w-full sm:w-[160px] rounded-xl border border-slate-800 bg-slate-950/70",
              "px-3 py-2 text-[13px] text-slate-100",
              "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
            ].join(" ")}
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

        {/* list (3 cols) */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[13px]">
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-300">Caricamento…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400">Nessun cavo visibile</td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const s = situazionePerSide(r, side);
                  const title = r.marca_cavo || r.codice || "—";
                  const metri = r.metri_teo ?? "—";
                  const pagina = r.pagina_pdf ? `p.${r.pagina_pdf}` : "—";

                  return (
                    <tr key={r.id} className="hover:bg-slate-900/25">
                      <td className="px-4 py-3 text-slate-100">
                        <div className="font-semibold truncate">{title}</div>
                        {r.codice && r.marca_cavo && r.codice !== r.marca_cavo ? (
                          <div className="mt-0.5 text-[12px] text-slate-500 truncate">{r.codice}</div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex rounded-lg border px-2 py-[2px] font-semibold",
                            badgeClass(s === "NP" ? null : s),
                          ].join(" ")}
                        >
                          {labelSituazione(s === "NP" ? null : s)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right text-slate-100 tabular-nums">
                        <div>{metri}</div>
                        <div className="text-[12px] text-slate-500">{pagina}</div>
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
