// src/inca/IncaCablePickerModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Modal full-screen pour choisir des câbles INCA pour un rapportino.
 *
 * Props:
 *  - shipCostr: string (ex: "6368")
 *  - onCancel: () => void
 *  - onConfirm: (selectedCavoIds: string[]) => void
 */
export default function IncaCablePickerModal({
  shipCostr,
  onCancel,
  onConfirm,
}) {
  const [loading, setLoading] = useState(true);
  const [cables, setCables] = useState([]);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [situazioneFilter, setSituazioneFilter] = useState("T_R_EMPTY"); // preset T/R/vide
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: dbError } = await supabase
          .from("inca_cavi")
          .select(
            `
              id,
              costr,
              marca_cavo,
              codice,
              metri_teo,
              metri_previsti,
              situazione,
              stato_inca,
              descrizione,
              descrizione_a,
              zona_a
            `
          )
          .eq("costr", shipCostr)
          .order("marca_cavo", { ascending: true });

        if (dbError) throw dbError;
        if (cancelled) return;

        setCables(data || []);
      } catch (e) {
        console.error("[IncaCablePicker] load error", e);
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [shipCostr]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    return cables.filter((c) => {
      const situ = (c.situazione || "").trim();

      if (situazioneFilter === "T_R_EMPTY") {
        // On veut T, R ou vide
        if (situ && situ !== "T" && situ !== "R") return false;
      } else if (situazioneFilter !== "ALL") {
        if (situ !== situazioneFilter) return false;
      }

      if (!s) return true;

      const blob =
        [
          c.marca_cavo,
          c.codice,
          c.descrizione,
          c.descrizione_a,
          c.zona_a,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase() || "";

      return blob.includes(s);
    });
  }, [cables, search, situazioneFilter]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleIds = filtered.map((c) => c.id);

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = allVisibleIds.every((id) => next.has(id));
      if (allSelected) {
        // on désélectionne tout ce qui est visible
        for (const id of allVisibleIds) next.delete(id);
      } else {
        for (const id of allVisibleIds) next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds));
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-stretch justify-center">
      <div className="relative flex flex-col w-full h-full max-w-6xl mx-auto my-4 rounded-3xl bg-slate-950/95 border border-slate-800 shadow-2xl overflow-hidden">
        {/* HEADER */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold tracking-[0.25em] text-emerald-400 uppercase">
                INCA · Selezione cavi
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-900 text-slate-100">
                COSTR {shipCostr || "?"}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Seleziona i cavi da collegare a questo rapportino (stesura /
              ripresa cavi).
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800/80 transition"
            >
              Annulla
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/70 bg-emerald-500/15 text-xs font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50"
            >
              Conferma ({selectedIds.size})
            </button>
          </div>
        </header>

        {/* FILTRES */}
        <div className="border-b border-slate-800 bg-slate-950/90 px-4 py-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca per marca, codice, descrizione, zona…"
                  className="w-full rounded-full bg-slate-900/80 border border-slate-700 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                  FIND
                </span>
              </div>
            </div>

            <label className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>Situazione</span>
              <select
                value={situazioneFilter}
                onChange={(e) => setSituazioneFilter(e.target.value)}
                className="rounded-full bg-slate-900/80 border border-slate-700 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="T_R_EMPTY">T / R / vuote</option>
                <option value="ALL">Tutte</option>
                <option value="P">P · Posato</option>
                <option value="T">T · Tagliato</option>
                <option value="R">R · Richiesta</option>
                <option value="B">B · Bloccato</option>
                <option value="E">E · Eliminato</option>
                <option value="EMPTY">Vuote</option>
              </select>
            </label>

            <div className="text-[11px] text-slate-500 ml-auto">
              Cavi visibili:{" "}
              <span className="text-emerald-300 font-semibold">
                {filtered.length}
              </span>{" "}
              / {cables.length}
            </div>
          </div>
        </div>

        {/* TABLEAU */}
        <main className="flex-1 overflow-auto">
          {error && (
            <div className="px-4 py-3 text-[11px] text-rose-400">
              Errore caricamento: {error}
            </div>
          )}

          <table className="min-w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-slate-950/95 border-b border-slate-800 z-10">
              <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2 w-10">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={
                      filtered.length > 0 &&
                      filtered.every((c) => selectedIds.has(c.id))
                    }
                  />
                </th>
                <th className="px-3 py-2">Marca / Codice</th>
                <th className="px-3 py-2">Situaz.</th>
                <th className="px-3 py-2 text-right">Metri dis.</th>
                <th className="px-3 py-2">Arrivo (locale / descr.)</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Caricamento cavi INCA…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    Nessun cavo corrisponde ai filtri attuali.
                  </td>
                </tr>
              )}

              {filtered.map((c) => {
                const checked = selectedIds.has(c.id);
                const situ = (c.situazione || "").trim() || "EMPTY";
                return (
                  <tr
                    key={c.id}
                    className={[
                      "border-b border-slate-900/60 hover:bg-slate-800/60 cursor-pointer",
                      checked ? "bg-emerald-900/40" : "",
                    ].join(" ")}
                    onClick={() => toggleSelect(c.id)}
                  >
                    <td className="px-3 py-1.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(c.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-slate-50">
                      <div className="flex flex-col">
                        <span className="truncate">
                          {c.marca_cavo || "—"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {c.codice || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <SituBadge value={situ} />
                    </td>
                    <td className="px-3 py-1.5 text-right text-slate-200">
                      {formatMeters(c.metri_teo ?? c.metri_previsti)}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex flex-col">
                        <span className="truncate text-slate-100">
                          {c.zona_a || "—"}
                        </span>
                        <span className="truncate text-[10px] text-slate-400">
                          {c.descrizione_a || c.descrizione || "—"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
}

function SituBadge({ value }) {
  let label = value;
  let cls =
    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border";

  switch (value) {
    case "P":
      label = "P · Posato";
      cls += " bg-emerald-900/60 border-emerald-500/70 text-emerald-100";
      break;
    case "T":
      label = "T · Tagliato";
      cls += " bg-sky-900/60 border-sky-500/70 text-sky-100";
      break;
    case "R":
      label = "R · Richiesta";
      cls += " bg-amber-900/60 border-amber-500/70 text-amber-100";
      break;
    case "B":
      label = "B · Bloccato";
      cls += " bg-rose-900/60 border-rose-500/70 text-rose-100";
      break;
    case "E":
      label = "E · Eliminato";
      cls += " bg-slate-900/60 border-slate-600 text-slate-100";
      break;
    case "EMPTY":
      label = "Vuoto";
      cls += " bg-slate-900/60 border-slate-700 text-slate-300";
      break;
    default:
      label = value || "—";
      cls += " bg-slate-900/60 border-slate-700 text-slate-300";
  }

  return <span className={cls}>{label}</span>;
}

function formatMeters(v) {
  if (v == null) return "—";
  const num = Number(v);
  if (Number.isNaN(num)) return String(v);
  return `${num.toFixed(1)} m`;
}
