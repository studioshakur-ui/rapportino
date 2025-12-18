// src/components/RapportinoIncaCaviSection.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { calcMetriPosati, formatMeters, getBaseMetri, safeNum } from "../inca/incaMath";

const SITUAZIONI = ["P", "T", "R", "B", "E", "NP"];
const PICKER_PAGE_SIZE = 120;

function norm(v) {
  return String(v ?? "").trim();
}

function situazioneKey(v) {
  const s = norm(v);
  if (!s) return "NP";
  return SITUAZIONI.includes(s) ? s : "NP";
}

function Chip({ active, children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-full text-[12px] font-semibold border transition",
        active
          ? "bg-emerald-600 text-white border-emerald-500"
          : "bg-slate-900/40 text-slate-100 border-slate-700 hover:bg-slate-900/70",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/**
 * CAPO — Section "CAVI INCA COLLEGATI AL RAPPORTINO"
 *
 * Props:
 * - rapportinoId (required)
 * - reportDate (optional)
 * - costr (required for picker)
 * - commessa (required for picker)
 */
export default function RapportinoIncaCaviSection({ rapportinoId, reportDate, costr, commessa }) {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);

  const [links, setLinks] = useState([]);

  // picker drawer
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState(null);

  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerSituazioni, setPickerSituazioni] = useState([]);
  const [pickerOnlyNonP, setPickerOnlyNonP] = useState(false);

  const [pickerRows, setPickerRows] = useState([]);
  const [pickerOffset, setPickerOffset] = useState(0);
  const [pickerHasMore, setPickerHasMore] = useState(true);

  const pickerListRef = useRef(null);
  const abortRef = useRef({ cancelled: false });

  const percentOptions = useMemo(() => [0, 50, 70, 100], []);
  const canUsePicker = Boolean(norm(costr) && norm(commessa)); // STRICT

  const normalizedReportDate = useMemo(() => {
    try {
      if (reportDate) {
        const d = new Date(reportDate);
        if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      }
    } catch {
      // ignore
    }
    return new Date().toISOString().slice(0, 10);
  }, [reportDate]);

  // -----------------------------
  // Load linked INCA for rapportino
  // -----------------------------
  const reloadLinks = useCallback(async () => {
    if (!rapportinoId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: e } = await supabase
        .from("rapportino_inca_cavi")
        .select(
          `
          id,
          rapportino_id,
          inca_cavo_id,
          step_type,
          progress_percent,
          metri_posati,
          posa_date,
          note,
          inca_cavi:inca_cavo_id (
            id,
            codice,
            descrizione,
            metri_teo,
            metri_dis,
            situazione,
            marca_cavo,
            zona_da,
            zona_a,
            apparato_da,
            apparato_a
          )
        `
        )
        .eq("rapportino_id", rapportinoId)
        .order("created_at", { ascending: true });

      if (e) throw e;
      setLinks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[RapportinoIncaCaviSection] loadLinks error:", err);
      setError("Impossibile caricare i cavi INCA collegati al rapportino.");
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [rapportinoId]);

  useEffect(() => {
    if (!rapportinoId) {
      setLinks([]);
      setLoading(false);
      return;
    }
    reloadLinks();
  }, [rapportinoId, reloadLinks]);

  const linkedIncaIds = useMemo(() => {
    const s = new Set();
    for (const l of links || []) if (l?.inca_cavo_id) s.add(l.inca_cavo_id);
    return s;
  }, [links]);

  // -----------------------------
  // Derived display rows
  // -----------------------------
  const displayRows = useMemo(() => {
    return (links || []).map((l) => {
      const inca = l.inca_cavi || null;
      const base = getBaseMetri(inca);
      const pct =
        l.progress_percent != null && l.progress_percent !== ""
          ? safeNum(l.progress_percent)
          : 0;

      const storedPosati = safeNum(l.metri_posati);
      const computedPosati = calcMetriPosati(base, pct);
      const posati = storedPosati > 0 ? storedPosati : computedPosati;

      return {
        linkId: l.id,
        incaId: l.inca_cavo_id,
        codice: inca?.codice || l.codice_cache || "—",
        descrizione: inca?.descrizione || "—",
        baseMetri: base,
        percent: pct,
        metriPosati: posati,
        stepType: (l.step_type || "POSA").toUpperCase(),
        situazione: inca?.situazione || "—",
        ripresaLocked: String((l.step_type || "")).toUpperCase() === "RIPRESA",
      };
    });
  }, [links]);

  // -----------------------------
  // Update link progress
  // -----------------------------
  async function updateLinkProgress({ linkId, newPercent, newStepType }) {
    const row = (links || []).find((x) => x.id === linkId);
    if (!row) return;

    const inca = row.inca_cavi || null;
    const base = getBaseMetri(inca);

    const step = String(newStepType || row.step_type || "POSA").toUpperCase();
    const forcedPercent = step === "RIPRESA" ? 100 : safeNum(newPercent);

    const metriPosati = calcMetriPosati(base, forcedPercent);

    setSavingId(linkId);
    setError(null);

    try {
      const payload = {
        step_type: step,
        progress_percent: forcedPercent,
        metri_posati: metriPosati,
        posa_date: normalizedReportDate,
      };

      const { error: e } = await supabase.from("rapportino_inca_cavi").update(payload).eq("id", linkId);
      if (e) throw e;

      setLinks((prev) => (prev || []).map((x) => (x.id === linkId ? { ...x, ...payload } : x)));
    } catch (err) {
      console.error("[RapportinoIncaCaviSection] updateLinkProgress error:", err);
      setError("Errore aggiornando avanzamento INCA (salvataggio fallito).");
    } finally {
      setSavingId(null);
    }
  }

  // -----------------------------
  // Delete link
  // -----------------------------
  async function removeLink(linkId) {
    if (!linkId) return;

    setSavingId(linkId);
    setError(null);

    try {
      const { error: e } = await supabase.from("rapportino_inca_cavi").delete().eq("id", linkId);
      if (e) throw e;

      setLinks((prev) => (prev || []).filter((x) => x.id !== linkId));
    } catch (err) {
      console.error("[RapportinoIncaCaviSection] removeLink error:", err);
      setError("Errore rimuovendo il cavo INCA dal rapportino.");
    } finally {
      setSavingId(null);
    }
  }

  // -----------------------------
  // Picker: open/close/reset
  // -----------------------------
  const openPicker = useCallback(() => {
    if (!canUsePicker) return;
    setIsPickerOpen(true);
  }, [canUsePicker]);

  const closePicker = useCallback(() => {
    setIsPickerOpen(false);
    setPickerQuery("");
    setPickerSituazioni([]);
    setPickerOnlyNonP(false);
    setPickerRows([]);
    setPickerError(null);
    setPickerOffset(0);
    setPickerHasMore(true);
  }, []);

  // -----------------------------
  // Picker: load page
  // -----------------------------
  const buildPickerQuery = useCallback(
    () => {
      let q = supabase
        .from("inca_cavi")
        .select("id,codice,descrizione,metri_teo,metri_dis,situazione,marca_cavo")
        .eq("costr", norm(costr))
        .eq("commessa", norm(commessa))
        .order("codice", { ascending: true });

      const search = norm(pickerQuery).toLowerCase();
      if (search) {
        q = q.or(
          [
            `codice.ilike.%${search}%`,
            `descrizione.ilike.%${search}%`,
            `marca_cavo.ilike.%${search}%`,
          ].join(",")
        );
      }

      // situation filtering:
      // - NP == situazione is null OR empty
      // - others == eq
      if (pickerSituazioni.length > 0) {
        const nonNP = pickerSituazioni.filter((x) => x !== "NP");
        const hasNP = pickerSituazioni.includes("NP");

        const ors = [];
        if (nonNP.length > 0) ors.push(`situazione.in.(${nonNP.join(",")})`);
        if (hasNP) ors.push("situazione.is.null", "situazione.eq.");
        q = q.or(ors.join(","));
      }

      // onlyNonP: exclude P (situazione = 'P')
      // Note: si situazione null => NP => reste.
      if (pickerOnlyNonP) {
        q = q.or("situazione.is.null,situazione.neq.P,situazione.eq.");
      }

      return q;
    },
    [costr, commessa, pickerQuery, pickerSituazioni, pickerOnlyNonP]
  );

  const loadPickerFirstPage = useCallback(async () => {
    if (!isPickerOpen) return;
    if (!canUsePicker) return;

    setPickerLoading(true);
    setPickerError(null);
    setPickerRows([]);
    setPickerOffset(0);
    setPickerHasMore(true);

    abortRef.current.cancelled = false;
    const localAbort = abortRef.current;

    try {
      const from = 0;
      const to = PICKER_PAGE_SIZE - 1;

      const q = buildPickerQuery().range(from, to);
      const { data, error: e } = await q;

      if (e) throw e;
      if (localAbort.cancelled) return;

      const rows = (data || []).filter((r) => !linkedIncaIds.has(r.id));
      setPickerRows(rows);
      setPickerOffset((data || []).length);
      setPickerHasMore((data || []).length === PICKER_PAGE_SIZE);

      requestAnimationFrame(() => {
        if (pickerListRef.current) pickerListRef.current.scrollTop = 0;
      });
    } catch (err) {
      console.error("[RapportinoIncaCaviSection] picker first page error:", err);
      setPickerError("Impossibile caricare la lista INCA (picker).");
      setPickerRows([]);
      setPickerHasMore(false);
    } finally {
      if (!localAbort.cancelled) setPickerLoading(false);
    }
  }, [isPickerOpen, canUsePicker, buildPickerQuery, linkedIncaIds]);

  const loadPickerMore = useCallback(async () => {
    if (!isPickerOpen) return;
    if (!canUsePicker) return;
    if (pickerLoading) return;
    if (!pickerHasMore) return;

    setPickerLoading(true);
    setPickerError(null);

    abortRef.current.cancelled = false;
    const localAbort = abortRef.current;

    try {
      const from = pickerOffset;
      const to = pickerOffset + PICKER_PAGE_SIZE - 1;

      const q = buildPickerQuery().range(from, to);
      const { data, error: e } = await q;

      if (e) throw e;
      if (localAbort.cancelled) return;

      const chunk = (data || []).filter((r) => !linkedIncaIds.has(r.id));
      setPickerRows((prev) => prev.concat(chunk));
      setPickerOffset((prev) => prev + (data || []).length);
      setPickerHasMore((data || []).length === PICKER_PAGE_SIZE);
    } catch (err) {
      console.error("[RapportinoIncaCaviSection] picker load more error:", err);
      setPickerError("Errore caricando altri cavi INCA.");
      setPickerHasMore(false);
    } finally {
      if (!localAbort.cancelled) setPickerLoading(false);
    }
  }, [isPickerOpen, canUsePicker, pickerLoading, pickerHasMore, pickerOffset, buildPickerQuery, linkedIncaIds]);

  useEffect(() => {
    if (!isPickerOpen) return;
    loadPickerFirstPage();
    return () => {
      abortRef.current.cancelled = true;
    };
  }, [isPickerOpen, pickerQuery, pickerSituazioni, pickerOnlyNonP, costr, commessa, loadPickerFirstPage]);

  const onPickerScroll = useCallback(
    (e) => {
      const el = e.currentTarget;
      const threshold = 260;
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remaining < threshold) loadPickerMore();
    },
    [loadPickerMore]
  );

  const togglePickerSituazione = useCallback((k) => {
    setPickerSituazioni((prev) => {
      const s = new Set(prev);
      if (s.has(k)) s.delete(k);
      else s.add(k);
      return Array.from(s);
    });
  }, []);

  const resetPickerFilters = useCallback(() => {
    setPickerQuery("");
    setPickerSituazioni([]);
    setPickerOnlyNonP(false);
  }, []);

  // -----------------------------
  // Add single cable (1 tap)
  // -----------------------------
  const addOne = useCallback(
    async (incaId) => {
      if (!rapportinoId || !incaId) return;

      setPickerLoading(true);
      setPickerError(null);

      try {
        const { data: incaRow, error: e1 } = await supabase
          .from("inca_cavi")
          .select("id,metri_teo,metri_dis")
          .eq("id", incaId)
          .single();

        if (e1) throw e1;

        const base = getBaseMetri(incaRow);
        const pct = 0;
        const posati = calcMetriPosati(base, pct);

        const payload = {
          rapportino_id: rapportinoId,
          inca_cavo_id: incaId,
          step_type: "POSA",
          progress_percent: pct,
          metri_posati: posati,
          posa_date: normalizedReportDate,
        };

        const { error: e2 } = await supabase.from("rapportino_inca_cavi").insert(payload);
        if (e2) throw e2;

        await reloadLinks();
        // remove from picker list (instant feedback)
        setPickerRows((prev) => prev.filter((r) => r.id !== incaId));
      } catch (err) {
        console.error("[RapportinoIncaCaviSection] addOne error:", err);
        setPickerError("Errore aggiungendo il cavo INCA al rapportino.");
      } finally {
        setPickerLoading(false);
      }
    },
    [rapportinoId, normalizedReportDate, reloadLinks]
  );

  // -----------------------------
  // UI
  // -----------------------------
  if (!rapportinoId) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Cavi INCA collegati al rapportino
        </div>
        <div className="mt-1 text-[13px] text-slate-200 font-semibold">Rapportino non disponibile</div>
        <div className="mt-1 text-[12px] text-slate-400">
          Manca <span className="text-slate-200 font-semibold">rapportinoId</span>.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Cavi INCA collegati al rapportino
            </div>
            <div className="text-[12px] text-slate-400 mt-1">
              Seleziona i cavi da INCA e indica l&apos;avanzamento del turno.
              <span className="text-slate-500"> POSA: 50/70/100. RIPRESA: 100 (una sola volta).</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Filtro INCA: <span className="text-slate-200 font-semibold">COSTR {norm(costr) || "—"}</span>{" "}
              · <span className="text-slate-200 font-semibold">COMMESSA {norm(commessa) || "—"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[11px] text-slate-400">
              Cavi: <span className="text-slate-100 font-semibold">{displayRows.length}</span>
            </div>

            <button
              type="button"
              onClick={openPicker}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-medium",
                canUsePicker
                  ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-950/30"
                  : "border-slate-800 bg-slate-950/40 text-slate-500 cursor-not-allowed",
              ].join(" ")}
              disabled={!canUsePicker}
              title={
                canUsePicker
                  ? "Aggiungi cavo da INCA"
                  : "Per aprire il picker servono COSTR + COMMESSA (per filtrare INCA)."
              }
            >
              + Aggiungi cavo da INCA
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-600/40 bg-rose-950/25 px-3 py-2 text-[12px] text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/30">
          <table className="min-w-[980px] w-full">
            <thead className="bg-slate-950/60 border-b border-slate-800">
              <tr className="text-left text-[11px] text-slate-500">
                <th className="px-3 py-2">Marca / codice</th>
                <th className="px-3 py-2">Lung. disegno</th>
                <th className="px-3 py-2">Step</th>
                <th className="px-3 py-2">Avanzamento (%)</th>
                <th className="px-3 py-2">Metri posati</th>
                <th className="px-3 py-2">Situazione</th>
                <th className="px-3 py-2 text-right">Azioni</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-[12px] text-slate-500">
                    Caricamento…
                  </td>
                </tr>
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-[12px] text-slate-500">
                    Nessun cavo INCA collegato a questo rapportino.
                  </td>
                </tr>
              ) : (
                displayRows.map((r) => {
                  const isSaving = savingId === r.linkId;

                  return (
                    <tr key={r.linkId} className="hover:bg-slate-900/25">
                      <td className="px-3 py-2">
                        <div className="text-[12px] text-slate-100 font-semibold">{r.codice}</div>
                        <div className="text-[11px] text-slate-500">
                          {r.descrizione && r.descrizione !== "—" ? r.descrizione : "—"}
                        </div>
                      </td>

                      <td className="px-3 py-2 text-[12px] text-slate-100">
                        {r.baseMetri ? formatMeters(r.baseMetri) : "—"}
                      </td>

                      <td className="px-3 py-2">
                        <select
                          value={r.stepType}
                          disabled={isSaving}
                          onChange={(e) =>
                            updateLinkProgress({
                              linkId: r.linkId,
                              newStepType: e.target.value,
                              newPercent: r.percent,
                            })
                          }
                          className="rounded-lg border border-slate-700 bg-slate-950/60 text-slate-50 px-2 py-1 text-[12px] outline-none"
                        >
                          <option value="POSA">POSA</option>
                          <option value="RIPRESA">RIPRESA</option>
                        </select>
                      </td>

                      <td className="px-3 py-2">
                        <select
                          value={r.percent}
                          disabled={isSaving || r.ripresaLocked}
                          onChange={(e) =>
                            updateLinkProgress({
                              linkId: r.linkId,
                              newStepType: r.stepType,
                              newPercent: Number(e.target.value),
                            })
                          }
                          className="rounded-lg border border-slate-700 bg-slate-950/60 text-slate-50 px-2 py-1 text-[12px] outline-none"
                          title={r.ripresaLocked ? "RIPRESA è bloccata a 100%" : "Seleziona avanzamento"}
                        >
                          {percentOptions.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-3 py-2 text-[12px] text-slate-100">{Math.round(r.metriPosati)}</td>

                      <td className="px-3 py-2 text-[12px] text-slate-200">
                        <span className="inline-flex px-2 py-0.5 rounded-full border border-slate-700 bg-slate-950/60 text-[11px]">
                          {situazioneKey(r.situazione)}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => removeLink(r.linkId)}
                          className="px-3 py-1.5 rounded-lg border border-rose-600/50 bg-rose-950/20 hover:bg-rose-950/35 text-[12px] text-rose-200"
                        >
                          Rimuovi
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PICKER DRAWER */}
      {isPickerOpen ? (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="w-full sm:max-w-5xl sm:rounded-2xl rounded-t-3xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
            {/* Drawer header */}
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/90">
              <div className="flex items-start gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-300">
                    Seleziona cavi da INCA
                  </div>
                  <div className="mt-1 text-[13px] font-semibold text-slate-50 truncate">
                    COSTR {norm(costr)} · COMMESSA {norm(commessa)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    Aggancia i cavi al rapportino con 1 tap. Filtri e ricerca istantanei.
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closePicker}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950/60 hover:bg-slate-950 text-[12px] font-semibold"
                  >
                    Chiudi
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                <input
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Cerca marca/codice/descrizione…"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 text-slate-50 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/60"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPickerOnlyNonP((v) => !v)}
                    className={[
                      "px-3 py-2 rounded-xl border text-[12px] font-semibold transition",
                      pickerOnlyNonP
                        ? "bg-sky-600 text-white border-sky-500"
                        : "bg-slate-950/60 text-slate-100 border-slate-700 hover:bg-slate-950",
                    ].join(" ")}
                    title="Escludi POSA (P)"
                  >
                    Solo non P
                  </button>

                  <button
                    type="button"
                    onClick={resetPickerFilters}
                    className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-950/60 hover:bg-slate-950 text-[12px] font-semibold"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {SITUAZIONI.map((k) => (
                  <Chip
                    key={k}
                    active={pickerSituazioni.includes(k)}
                    onClick={() => togglePickerSituazione(k)}
                    title={`Filtra situazione ${k}`}
                  >
                    {k}
                  </Chip>
                ))}
              </div>

              {pickerError ? (
                <div className="mt-2 text-[12px] text-rose-200 bg-rose-500/10 border border-rose-500/40 rounded-lg px-2 py-2">
                  {pickerError}
                </div>
              ) : null}
            </div>

            {/* List */}
            <div
              ref={pickerListRef}
              onScroll={onPickerScroll}
              className="max-h-[72vh] overflow-y-auto"
            >
              <div className="p-3">
                {pickerRows.length === 0 && !pickerLoading ? (
                  <div className="text-center text-[13px] text-slate-300 py-10">
                    Nessun cavo disponibile (filtri attuali o già agganciati).
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-[12px]">
                      <thead className="bg-slate-950/70 sticky top-0 z-10">
                        <tr className="text-slate-200">
                          <th className="px-3 py-2 text-left">Marca / codice</th>
                          <th className="px-3 py-2 text-right">Lung. disegno</th>
                          <th className="px-3 py-2 text-right">Metri posati</th>
                          <th className="px-3 py-2 text-center">Situazione</th>
                          <th className="px-3 py-2 text-right">Azione</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pickerRows.map((r) => {
                          const k = situazioneKey(r.situazione);
                          return (
                            <tr key={r.id} className="border-t border-slate-800 bg-slate-950/30 hover:bg-slate-950/55">
                              <td className="px-3 py-2">
                                <div className="text-[12px] text-slate-100 font-semibold">
                                  {norm(r.codice) || norm(r.marca_cavo) || "—"}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate max-w-[520px]">
                                  {norm(r.descrizione) || "—"}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right text-slate-100">
                                {Number(r.metri_teo ?? 0) || 0}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-100">
                                {Number(r.metri_dis ?? 0) || 0}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="inline-flex px-2 py-1 rounded-full text-[11px] font-semibold border border-slate-700 bg-slate-950/60">
                                  {k}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  disabled={pickerLoading}
                                  onClick={() => addOne(r.id)}
                                  className="px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-600/15 hover:bg-emerald-600/25 text-[12px] font-semibold text-emerald-100"
                                >
                                  Aggancia
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {pickerLoading ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-center text-[12px] text-amber-300">
                              Caricamento…
                            </td>
                          </tr>
                        ) : null}

                        {!pickerHasMore && pickerRows.length > 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-center text-[12px] text-slate-400">
                              Fine lista
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                )}

                {pickerHasMore && !pickerLoading ? (
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={loadPickerMore}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950/60 hover:bg-slate-950 text-[12px] font-semibold"
                    >
                      Carica altri
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Drawer footer */}
            <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
              <div className="text-[12px] text-slate-300">
                Suggerimento: usa filtri P/T/R/B/E/NP per selezionare velocemente.
              </div>
              <button
                type="button"
                onClick={closePicker}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950/60 hover:bg-slate-950 text-[12px] font-semibold"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
