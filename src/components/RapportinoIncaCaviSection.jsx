// src/components/RapportinoIncaCaviSection.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// =====================================================
// RAPPORTINO — INCA CAVI (collegati) — Screen: dark premium
// Note: on force certains styles avec "!" pour éviter que du CSS legacy
// (ex: styles globaux tables/rapportino) ne "blanchisse" la section.
// =====================================================

const SITUAZIONI_ORDER = ["T", "P", "R", "B", "E", "NP"];

const SITUAZIONI_LABEL = {
  T: "Teorico",
  P: "Posato",
  R: "Rimosso",
  B: "Bloccato",
  E: "Eseguito",
  NP: "Non posato",
};

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp01(x) {
  const n = safeNum(x);
  return Math.max(0, Math.min(1, n));
}

function percent(x) {
  return Math.round(clamp01(x) * 100);
}

function normalizeCode(v) {
  return (v || "").toString().trim();
}

function matchSearch(code, q) {
  if (!q) return true;
  return normalizeCode(code).toLowerCase().includes(q.toLowerCase().trim());
}

function lampClass(k) {
  // Lamps (visibles) — palette cohérente
  // NP = neutre, T = bleu, P = vert, R = rose, B = amber, E = violet
  const base =
    "inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold transition-all";
  const map = {
    NP: "bg-slate-900/40 border-slate-700 text-slate-300",
    T: "bg-sky-950/40 border-sky-700/60 text-sky-200",
    P: "bg-emerald-950/40 border-emerald-700/60 text-emerald-200",
    R: "bg-rose-950/40 border-rose-700/60 text-rose-200",
    B: "bg-amber-950/40 border-amber-700/60 text-amber-200",
    E: "bg-violet-950/40 border-violet-700/60 text-violet-200",
  };
  return [base, map[k] || map.NP].join(" ");
}

function pillClassForSituazione(k) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors";
  const map = {
    NP: "border-slate-700 text-slate-200 hover:bg-slate-900/30",
    T: "border-sky-700/70 text-sky-100 hover:bg-sky-950/30",
    P: "border-emerald-700/70 text-emerald-100 hover:bg-emerald-950/30",
    R: "border-rose-700/70 text-rose-100 hover:bg-rose-950/30",
    B: "border-amber-700/70 text-amber-100 hover:bg-amber-950/30",
    E: "border-violet-700/70 text-violet-100 hover:bg-violet-950/30",
  };
  return [base, map[k] || map.NP].join(" ");
}

export default function RapportinoIncaCaviSection({ rapportinoId, shipCostr }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Picker / UX
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRowId, setPickerRowId] = useState(null);
  const [pickerValue, setPickerValue] = useState("NP");
  const [pickerSearch, setPickerSearch] = useState("");

  // Option 2: ajout "DA/A" (range code) dans le picker
  const [rangeDa, setRangeDa] = useState("");
  const [rangeA, setRangeA] = useState("");

  const closePicker = () => {
    setPickerOpen(false);
    setPickerRowId(null);
    setPickerSearch("");
    setRangeDa("");
    setRangeA("");
  };

  const openPickerForRow = (rowId, cur) => {
    setPickerRowId(rowId);
    setPickerValue(cur || "NP");
    setPickerOpen(true);
  };

  const fetchData = async () => {
    setLoading(true);
    setErr("");
    try {
      if (!rapportinoId) {
        setRows([]);
        return;
      }

      /**
       * IMPORTANT:
       * La table "rapportino_inca_cavi" n'a souvent PAS la colonne "codice".
       * Le "codice" est sur "inca_cavi.codice".
       * Donc on fait un select relationnel + order sur la foreignTable.
       *
       * Pré-requis: FK rapportino_inca_cavi.inca_cavo_id -> inca_cavi.id
       */
      const { data, error } = await supabase
        .from("rapportino_inca_cavi")
        .select(
          `
            id,
            rapportino_id,
            inca_cavo_id,
            metri_teo,
            metri_dis,
            step,
            situazione,
            inca_cavi:inca_cavo_id (
              codice
            )
          `
        )
        .eq("rapportino_id", rapportinoId)
        .order("codice", { ascending: true, foreignTable: "inca_cavi" });

      if (error) throw error;

      const list = Array.isArray(data) ? data : [];
      setRows(
        list.map((r) => ({
          id: r.id,
          rapportino_id: r.rapportino_id,
          inca_cavo_id: r.inca_cavo_id,
          // codice pris depuis la table INCA (relation)
          codice: r?.inca_cavi?.codice || "",
          metri_teo: safeNum(r.metri_teo),
          metri_dis: safeNum(r.metri_dis),
          step: r.step || "",
          situazione: r.situazione ?? null, // null => NP
        }))
      );
    } catch (e) {
      console.error("INCA collegati fetch error:", e);
      setErr("Impossibile caricare i cavi INCA collegati.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rapportinoId]);

  const displayRows = useMemo(() => {
    return rows.map((r) => {
      const situazioneKey = r.situazione || "NP";
      const adv = r.metri_teo > 0 ? r.metri_dis / r.metri_teo : 0;
      return {
        ...r,
        situazioneKey,
        avanzamentoPct: percent(adv),
      };
    });
  }, [rows]);

  const count = displayRows.length;

  const handleUpdateSituazioneSingle = async (rowId, newSituazioneKey) => {
    const key = newSituazioneKey === "NP" ? null : newSituazioneKey;

    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, situazione: key } : r)));

    setSaving(true);
    try {
      const { error } = await supabase
        .from("rapportino_inca_cavi")
        .update({ situazione: key })
        .eq("id", rowId);

      if (error) throw error;
    } catch (e) {
      console.error(e);
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleApplySituazioneRange = async (situazioneKey) => {
    const da = normalizeCode(rangeDa);
    const a = normalizeCode(rangeA);

    if (!da || !a) return;

    const lo = da.toLowerCase();
    const hi = a.toLowerCase();

    const inRange = (code) => {
      const c = normalizeCode(code).toLowerCase();
      return c >= lo && c <= hi;
    };

    const targetIds = displayRows.filter((r) => inRange(r.codice)).map((r) => r.id);
    if (targetIds.length === 0) return;

    const key = situazioneKey === "NP" ? null : situazioneKey;

    setRows((prev) => prev.map((r) => (targetIds.includes(r.id) ? { ...r, situazione: key } : r)));

    setSaving(true);
    try {
      const { error } = await supabase
        .from("rapportino_inca_cavi")
        .update({ situazione: key })
        .in("id", targetIds);

      if (error) throw error;
      closePicker();
    } catch (e) {
      console.error(e);
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const pickerRows = useMemo(() => {
    const q = pickerSearch.trim();
    if (!q) return displayRows;
    return displayRows.filter((r) => matchSearch(r.codice, q));
  }, [displayRows, pickerSearch]);

  return (
    <div className="mt-6">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.22em] !text-slate-400">
            INCA · CAVI COLLEGATI
          </div>
          <div className="mt-0.5 text-[12px] !text-slate-300">
            {shipCostr ? (
              <span className="opacity-90">
                Costr: <span className="font-semibold">{shipCostr}</span>
              </span>
            ) : (
              <span className="opacity-70">—</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] !text-slate-300">{count}</span>
          <button
            type="button"
            className={[
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
              "text-[12px] font-semibold transition-colors",
              "border-slate-700 !text-slate-200 hover:bg-slate-900/35",
            ].join(" ")}
            title="Collega cavo INCA"
            onClick={() => {
              // Hook futur: ouvrir picker / modal di collegamento
            }}
          >
            <span className="text-slate-300">+</span>
            <span>Collega cavo INCA</span>
          </button>
        </div>
      </div>

      {/* ERROR */}
      {err ? (
        <div className="mt-3 rounded-xl border border-rose-900/40 bg-rose-950/25 px-3 py-2 text-[12px] text-rose-100">
          {err}
        </div>
      ) : null}

      {/* TABLE */}
      <div
        className={[
          "mt-3 overflow-x-auto rounded-2xl border border-slate-800",
          displayRows.length === 0 && !loading ? "!bg-transparent" : "!bg-slate-950/35",
        ].join(" ")}
      >
        <table className="min-w-[980px] w-full !text-slate-200">
          <thead className="!bg-slate-950/70 !border-b !border-slate-800">
            <tr className="text-left text-[11px] !text-slate-400">
              <th className="px-3 py-2 !text-slate-300">Marca / codice</th>
              <th className="px-3 py-2 !text-slate-300">Lung. disegno</th>
              <th className="px-3 py-2 !text-slate-300">Step</th>
              <th className="px-3 py-2 !text-slate-300">Avanzamento (%)</th>
              <th className="px-3 py-2 !text-slate-300">Metri posati</th>
              <th className="px-3 py-2 !text-slate-300">Situazione</th>
              <th className="px-3 py-2 text-right !text-slate-300">Azioni</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-[12px] !text-slate-400">
                  Caricamento…
                </td>
              </tr>
            ) : displayRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-5 text-[12px] !text-slate-500">
                  Nessun cavo INCA collegato a questo rapportino.
                </td>
              </tr>
            ) : (
              displayRows.map((r) => (
                <tr key={r.id} className="hover:!bg-slate-900/30">
                  <td className="px-3 py-2">
                    <div className="text-[12px] !text-slate-100 font-semibold">{r.codice || "—"}</div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="text-[12px] !text-slate-200">{safeNum(r.metri_teo).toFixed(2)}</div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="text-[12px] !text-slate-200">{r.step || "—"}</div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-sky-500/60" style={{ width: `${r.avanzamentoPct}%` }} />
                      </div>
                      <div className="text-[12px] !text-slate-200 w-10 text-right tabular-nums">
                        {r.avanzamentoPct}%
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="text-[12px] !text-slate-200 tabular-nums">
                      {safeNum(r.metri_dis).toFixed(2)}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => openPickerForRow(r.id, r.situazioneKey)}
                      className={pillClassForSituazione(r.situazioneKey)}
                      title="Imposta situazione"
                    >
                      <span className={lampClass(r.situazioneKey)}>{r.situazioneKey}</span>
                      <span className="whitespace-nowrap">
                        {SITUAZIONI_LABEL[r.situazioneKey] || "—"}
                      </span>
                    </button>
                  </td>

                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center rounded-full border border-slate-700 px-2.5 py-1 text-[11px] font-semibold !text-slate-200 hover:bg-slate-900/35 transition-colors"
                      title="Scollega"
                      onClick={async () => {
                        setSaving(true);
                        try {
                          const { error } = await supabase
                            .from("rapportino_inca_cavi")
                            .delete()
                            .eq("id", r.id);
                          if (error) throw error;
                          setRows((prev) => prev.filter((x) => x.id !== r.id));
                        } catch (e) {
                          console.error(e);
                          await fetchData();
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      Rimuovi
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Saving hint */}
      {saving ? <div className="mt-2 text-[11px] !text-slate-500">Salvataggio…</div> : null}

      {/* PICKER — bottom sheet premium */}
      {pickerOpen ? (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Situazione cavo">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={closePicker}
            aria-label="Chiudi"
            title="Chiudi"
          />

          <div
            className={[
              "absolute bottom-0 left-0 right-0",
              "rounded-t-3xl border-t border-slate-800",
              "bg-slate-950",
              "shadow-[0_-40px_120px_rgba(0,0,0,0.65)]",
              "px-4 pb-4 pt-3",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] !text-slate-500">Situazione</div>
                <div className="mt-0.5 text-[13px] font-semibold !text-slate-100 truncate">
                  Seleziona stato · {pickerRowId ? "cavo" : ""}
                </div>
              </div>

              <button
                type="button"
                onClick={closePicker}
                className="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-1.5 text-[12px] font-semibold !text-slate-200 hover:bg-slate-900/35 transition-colors"
              >
                Chiudi
              </button>
            </div>

            <div className="mt-3">
              <input
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Cerca marca/codice…"
                className={[
                  "w-full rounded-2xl border",
                  "border-slate-800 bg-slate-900/40",
                  "px-3 py-2 text-[13px] !text-slate-100",
                  "placeholder:text-slate-500",
                  "outline-none focus:ring-2 focus:ring-sky-500/40",
                ].join(" ")}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {SITUAZIONI_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setPickerValue(k);
                    if (pickerRowId) handleUpdateSituazioneSingle(pickerRowId, k);
                  }}
                  className={[
                    pillClassForSituazione(k),
                    pickerValue === k ? "ring-2 ring-white/10" : "",
                  ].join(" ")}
                  title={SITUAZIONI_LABEL[k]}
                >
                  <span className={lampClass(k)}>{k}</span>
                  <span>{SITUAZIONI_LABEL[k]}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/25 p-3">
              <div className="text-[11px] uppercase tracking-[0.22em] !text-slate-500">
                Applica a intervallo (DA / A)
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <input
                  value={rangeDa}
                  onChange={(e) => setRangeDa(e.target.value)}
                  placeholder="DA (codice)"
                  className={[
                    "w-full rounded-xl border",
                    "border-slate-800 bg-slate-950/40",
                    "px-3 py-2 text-[13px] !text-slate-100",
                    "placeholder:text-slate-500",
                    "outline-none focus:ring-2 focus:ring-sky-500/35",
                  ].join(" ")}
                />
                <input
                  value={rangeA}
                  onChange={(e) => setRangeA(e.target.value)}
                  placeholder="A (codice)"
                  className={[
                    "w-full rounded-xl border",
                    "border-slate-800 bg-slate-950/40",
                    "px-3 py-2 text-[13px] !text-slate-100",
                    "placeholder:text-slate-500",
                    "outline-none focus:ring-2 focus:ring-sky-500/35",
                  ].join(" ")}
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="text-[12px] !text-slate-400">
                  Stato selezionato:{" "}
                  <span className="font-semibold !text-slate-200">{pickerValue}</span>
                </div>

                <button
                  type="button"
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
                    "text-[12px] font-semibold transition-colors",
                    "border-sky-700/60 text-sky-100 hover:bg-sky-950/35",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  ].join(" ")}
                  disabled={!normalizeCode(rangeDa) || !normalizeCode(rangeA)}
                  onClick={() => handleApplySituazioneRange(pickerValue)}
                  title="Applica situazione all’intervallo"
                >
                  <span className={lampClass(pickerValue)}>{pickerValue}</span>
                  <span>Applica</span>
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-[0.22em] !text-slate-500">
                Anteprima (filtrata)
              </div>

              <div className="mt-2 max-h-[220px] overflow-auto rounded-2xl border border-slate-800">
                {pickerRows.length === 0 ? (
                  <div className="px-3 py-3 text-[12px] !text-slate-500">
                    Nessun cavo corrispondente.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-800">
                    {pickerRows.slice(0, 60).map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-[12px] !text-slate-100 font-semibold truncate">
                            {r.codice || "—"}
                          </div>
                          <div className="text-[11px] !text-slate-400">
                            {r.metri_dis.toFixed(2)} / {r.metri_teo.toFixed(2)} · {r.avanzamentoPct}%
                          </div>
                        </div>
                        <span className={lampClass(r.situazioneKey)}>{r.situazioneKey}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-2 text-[11px] !text-slate-500">
                Mostro max 60 righe in anteprima.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
