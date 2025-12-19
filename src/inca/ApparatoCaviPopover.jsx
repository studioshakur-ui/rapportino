// /src/inca/ApparatoCaviPopover.jsx
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
    const base = { top: 96, left: 24, width: 700 };
    if (!anchorRect) return base;

    const w = 700;
    const pad = 16;

    const left = Math.min(
      Math.max(pad, anchorRect.left - 240),
      Math.max(pad, window.innerWidth - w - pad)
    );

    const top = Math.min(
      Math.max(pad, anchorRect.bottom + 10),
      Math.max(pad, window.innerHeight - 560 - pad)
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

  // ------------------------------
  // Statut sémantique (3 couleurs)
  // Vert  = tous visibles
  // Jaune = partiel (filtre/recherche masque)
  // Rouge = 0 visible
  // ------------------------------
  const totalForApparato = Array.isArray(rows) ? rows.length : 0;
  const visibleNow = Array.isArray(filtered) ? filtered.length : 0;

  let status = "NEUTRAL";
  if (!loading) {
    if (visibleNow === 0) status = "RED";
    else if (totalForApparato > 0 && visibleNow < totalForApparato) status = "YELLOW";
    else status = "GREEN";
  }

  const statusPillClass =
    status === "GREEN"
      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
      : status === "YELLOW"
        ? "border-amber-300/25 bg-amber-400/10 text-amber-200"
        : status === "RED"
          ? "border-rose-300/25 bg-rose-400/10 text-rose-200"
          : "border-white/10 bg-white/5 text-slate-300";

  const statusDotClass =
    status === "GREEN"
      ? "bg-emerald-400"
      : status === "YELLOW"
        ? "bg-amber-400"
        : status === "RED"
          ? "bg-rose-400"
          : "bg-slate-400";

  const headerBorderClass =
    status === "GREEN"
      ? "border-emerald-500/12"
      : status === "YELLOW"
        ? "border-amber-500/12"
        : status === "RED"
          ? "border-rose-500/12"
          : "border-white/10";

  const sideLabel = side === "DA" ? "APP PARTENZA" : "APP ARRIVO";

  // IMPORTANT: return conditionnel seulement APRÈS les hooks
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

      {/* panel — mobile: centré ; desktop: ancré */}
      <div
        className={[
          "fixed rounded-2xl border bg-slate-950/70 shadow-2xl backdrop-blur-xl overflow-hidden",
          headerBorderClass,
          "w-[min(720px,calc(100vw-24px))]",
          "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "md:left-auto md:top-auto md:translate-x-0 md:translate-y-0",
        ].join(" ")}
        style={{
          ...(anchorRect
            ? { left: position.left, top: position.top, width: position.width }
            : {}),
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Dettaglio apparato ${side}`}
      >
        {/* header */}
        <div className="px-4 py-3 flex items-start justify-between gap-3 border-b border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase text-slate-400">
                {sideLabel}
              </span>

              {/* Statut 3 états */}
              <span
                className={[
                  "inline-flex items-center gap-2 rounded-lg border px-2 py-[2px] text-[10px] font-semibold tracking-[0.14em]",
                  statusPillClass,
                ].join(" ")}
                title={
                  status === "GREEN"
                    ? "Tous les câbles visibles"
                    : status === "YELLOW"
                      ? "Des câbles sont masqués (filtre/recherche)"
                      : status === "RED"
                        ? "0 câble avec les filtres/recherche"
                        : "Chargement"
                }
              >
                <span className={["h-1.5 w-1.5 rounded-full", statusDotClass].join(" ")} />
                {loading ? "…" : status === "GREEN" ? "OK" : status === "YELLOW" ? "PARZ" : "0"}
              </span>

              <span className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-2 py-[2px] text-[10px] font-semibold tracking-[0.14em] text-slate-200">
                {side}
              </span>
            </div>

            <div className="text-lg font-semibold text-slate-100 truncate mt-0.5">
              {apparato}
            </div>

            <div className="text-[11px] text-slate-400 mt-1">
              Visibili:{" "}
              <span className="text-slate-200 font-semibold">{visibleNow}</span>
              <span className="text-slate-600"> / </span>
              Totali:{" "}
              <span className="text-slate-200 font-semibold">{totalForApparato}</span>
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
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-300/70 bg-slate-950/30">
                <th className="text-left px-4 py-2 font-medium w-[58%]">Marca cavo</th>
                <th className="text-left px-4 py-2 font-medium w-[16%]">Situaz.</th>
                <th className="text-right px-4 py-2 font-medium w-[16%]">m teo</th>
                <th className="text-right px-4 py-2 font-medium w-[10%]">PDF</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-slate-200/80 text-[13px]">
                    Caricamento…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-slate-200/70 text-[13px]">
                    Nessun cavo con i filtri correnti.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const s = r.situazione ? r.situazione : "NP";
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.03] transition">
                      <td className="px-4 py-3 text-slate-100 font-medium">
                        {r.marca_cavo || r.codice || "—"}
                        {r.marca_cavo && r.codice ? (
                          <span className="text-slate-400/70 font-normal"> · {r.codice}</span>
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

        {/* footer */}
        <div className="px-4 py-2 flex justify-between text-[11px] text-slate-400 border-t border-white/10">
          <span>
            Visibili: <strong className="text-slate-200">{visibleNow}</strong>
            <span className="text-slate-600"> / </span>
            Totali: <strong className="text-slate-200">{totalForApparato}</strong>
          </span>

          <span className="inline-flex items-center gap-2">
            <span className={["h-2 w-2 rounded-full", statusDotClass].join(" ")} />
            <strong className="text-slate-200">
              {loading
                ? "Caricamento…"
                : status === "GREEN"
                  ? "Tutti presenti"
                  : status === "YELLOW"
                    ? "Mancano alcuni"
                    : "0 presenti"}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
