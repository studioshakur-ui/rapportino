// src/components/RapportinoIncaCaviSection.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { calcMetriPosati, formatMeters, getBaseMetri, safeNum } from "../inca/incaMath";

/**
 * CAPO — Section "CAVI INCA COLLEGATI AL RAPPORTINO"
 *
 * Objectif:
 * - lier des cavi INCA au rapportino (table rapportino_inca_cavi)
 * - persister progress_percent + metri_posati calculé
 * - permettre POSA / RIPRESA (RIPRESA -> 100% one-shot)
 *
 * Props attendues (robuste):
 * - rapportinoId (recommandé, sinon la section reste en lecture "vuota")
 * - reportDate (optionnel, ex: header.report_date)
 * - costr (optionnel, pour filtrer le picker)
 * - commessa (optionnel, pour filtrer le picker)
 */
export default function RapportinoIncaCaviSection({
  rapportinoId,
  reportDate,
  costr,
  commessa,
}) {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState(null);

  // linked rows (rapportino_inca_cavi + join inca_cavi)
  const [links, setLinks] = useState([]);

  // picker modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerRows, setPickerRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const percentOptions = useMemo(() => [0, 50, 70, 100], []);
  const canUsePicker = Boolean(costr || commessa);

  const normalizedReportDate = useMemo(() => {
    // Prefer reportDate prop; fallback to "today"
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
  // Load linked INCA cavi for rapportino
  // -----------------------------
  useEffect(() => {
    let alive = true;

    async function loadLinks() {
      if (!rapportinoId) {
        setLinks([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Attempt relation select (requires FK rapportino_inca_cavi.inca_cavo_id -> inca_cavi.id)
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

        if (!alive) return;
        setLinks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("[RapportinoIncaCaviSection] loadLinks error:", err);
        if (!alive) return;
        setError("Impossibile caricare i cavi INCA collegati al rapportino.");
        setLinks([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadLinks();
    return () => {
      alive = false;
    };
  }, [rapportinoId]);

  const linkedIncaIds = useMemo(() => {
    const s = new Set();
    for (const l of links || []) if (l?.inca_cavo_id) s.add(l.lica_cavo_id);
    // bug guard: above typo would ruin; do it properly
    const s2 = new Set();
    for (const l of links || []) if (l?.inca_cavo_id) s2.add(l.inca_cavo_id);
    return s2;
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
  // Update link: persist percent + metri_posati
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

      const { error: e } = await supabase
        .from("rapportino_inca_cavi")
        .update(payload)
        .eq("id", linkId);

      if (e) throw e;

      // refresh local state
      setLinks((prev) =>
        (prev || []).map((x) => (x.id === linkId ? { ...x, ...payload } : x))
      );
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
      const { error: e } = await supabase
        .from("rapportino_inca_cavi")
        .delete()
        .eq("id", linkId);

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
  // Picker: load INCA cavi list (for costr/commessa)
  // -----------------------------
  useEffect(() => {
    let alive = true;

    async function loadPicker() {
      if (!isPickerOpen) return;

      setPickerLoading(true);
      setPickerError(null);

      try {
        let q = supabase
          .from("inca_cavi")
          .select("id,codice,descrizione,metri_teo,metri_dis,situazione,marca_cavo")
          .order("codice", { ascending: true })
          .limit(400);

        if (costr) q = q.eq("costr", costr);
        if (commessa) q = q.eq("commessa", commessa);

        const search = (pickerQuery || "").trim().toLowerCase();
        // Supabase PostgREST ilike can be used per-field; use OR to broaden.
        if (search) {
          q = q.or(
            [
              `codice.ilike.%${search}%`,
              `descrizione.ilike.%${search}%`,
              `marca_cavo.ilike.%${search}%`,
              `situazione.ilike.%${search}%`,
            ].join(",")
          );
        }

        const { data, error: e } = await q;
        if (e) throw e;

        if (!alive) return;

        // filter out already linked ones
        const already = new Set((links || []).map((l) => l.inca_cavo_id).filter(Boolean));
        const filtered = (data || []).filter((r) => !already.has(r.id));

        setPickerRows(filtered);
      } catch (err) {
        console.error("[RapportinoIncaCaviSection] picker load error:", err);
        if (!alive) return;
        setPickerError("Impossibile caricare la lista INCA (picker).");
        setPickerRows([]);
      } finally {
        if (alive) setPickerLoading(false);
      }
    }

    loadPicker();
    return () => {
      alive = false;
    };
  }, [isPickerOpen, pickerQuery, costr, commessa, links]);

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function closePicker() {
    setIsPickerOpen(false);
    setPickerQuery("");
    setPickerRows([]);
    setPickerError(null);
    setSelectedIds(new Set());
  }

  // -----------------------------
  // Add selected INCA cavi -> rapportino_inca_cavi
  // -----------------------------
  async function addSelected() {
    if (!rapportinoId) return;
    const ids = Array.from(selectedIds || []);
    if (!ids.length) return;

    setPickerLoading(true);
    setPickerError(null);

    try {
      // Fetch base metri for selected (to compute metri_posati immediately)
      const { data: incaRows, error: e1 } = await supabase
        .from("inca_cavi")
        .select("id,metri_teo,metri_dis,codice,descrizione,situazione,marca_cavo,zona_da,zona_a,apparato_da,apparato_a")
        .in("id", ids);

      if (e1) throw e1;

      const nowDate = normalizedReportDate;

      // Default: POSA, 0% (capo choisit ensuite 50/70/100)
      const inserts = (incaRows || []).map((c) => {
        const base = getBaseMetri(c);
        const pct = 0;
        const posati = calcMetriPosati(base, pct);

        return {
          rapportino_id: rapportinoId,
          inca_cavo_id: c.id,
          step_type: "POSA",
          progress_percent: pct,
          metri_posati: posati,
          posa_date: nowDate,
        };
      });

      const { data: insData, error: e2 } = await supabase
        .from("rapportino_inca_cavi")
        .insert(inserts)
        .select("id,rapportino_id,inca_cavo_id,step_type,progress_percent,metri_posati,posa_date,note");

      if (e2) throw e2;

      // Merge into local state with embedded inca_cavi if possible (avoid second fetch if not needed)
      // We will refresh by reloading links (most reliable).
      closePicker();

      // Reload links
      setLoading(true);
      const { data: reData, error: reErr } = await supabase
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

      if (reErr) throw reErr;
      setLinks(Array.isArray(reData) ? reData : []);
    } catch (err) {
      console.error("[RapportinoIncaCaviSection] addSelected error:", err);
      setPickerError("Errore aggiungendo i cavi INCA al rapportino.");
    } finally {
      setPickerLoading(false);
      setLoading(false);
    }
  }

  // -----------------------------
  // UI
  // -----------------------------
  if (!rapportinoId) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Cavi INCA collegati al rapportino
        </div>
        <div className="mt-1 text-[13px] text-slate-200 font-semibold">
          Rapportino non disponibile
        </div>
        <div className="mt-1 text-[12px] text-slate-400">
          Manca <span className="text-slate-200 font-semibold">rapportinoId</span>. La sezione INCA non può caricare i collegamenti.
        </div>
      </div>
    );
  }

  return (
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
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-slate-400">
            Cavi: <span className="text-slate-100 font-semibold">{displayRows.length}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
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
                : "Per aprire il picker servono COSTR/COMMESSA (per filtrare INCA)."
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
                      <div className="text-[12px] text-slate-100 font-semibold">
                        {r.codice}
                      </div>
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
                            newPercent: r.percent,
                            newStepType: e.target.value,
                          })
                        }
                        className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-100"
                      >
                        <option value="POSA">POSA</option>
                        <option value="RIPRESA">RIPRESA</option>
                      </select>
                    </td>

                    <td className="px-3 py-2">
                      <select
                        value={r.ripresaLocked ? 100 : r.percent}
                        disabled={isSaving || r.ripresaLocked}
                        onChange={(e) =>
                          updateLinkProgress({
                            linkId: r.linkId,
                            newPercent: Number(e.target.value),
                            newStepType: r.stepType,
                          })
                        }
                        className={[
                          "rounded-xl border bg-slate-950/60 px-3 py-2 text-[12px]",
                          r.ripresaLocked
                            ? "border-slate-800 text-slate-500 cursor-not-allowed"
                            : "border-slate-800 text-slate-100",
                        ].join(" ")}
                        title={r.ripresaLocked ? "RIPRESA è fissata a 100%" : "Seleziona avanzamento POSA"}
                      >
                        {percentOptions.map((p) => (
                          <option key={p} value={p}>
                            {p}%
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-3 py-2 text-[12px] text-slate-100">
                      {r.baseMetri ? formatMeters(r.metriPosati) : "—"}
                    </td>

                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-200">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        {r.situazione || "—"}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeLink(r.linkId)}
                        disabled={isSaving}
                        className={[
                          "inline-flex items-center justify-center rounded-full border px-3 py-2 text-[12px]",
                          isSaving
                            ? "border-slate-800 bg-slate-950/40 text-slate-600 cursor-not-allowed"
                            : "border-rose-500/40 bg-rose-950/20 text-rose-200 hover:bg-rose-950/30",
                        ].join(" ")}
                        title="Rimuovi cavo dal rapportino"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================= */}
      {/* Picker modal (giant)      */}
      {/* ========================= */}
      {isPickerOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-md p-2"
          role="dialog"
          aria-modal="true"
          aria-label="Aggiungi cavi INCA"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePicker();
          }}
        >
          <div className="w-[min(98vw,1400px)] h-[92vh] overflow-hidden rounded-3xl border border-slate-700 bg-slate-950/85 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-800 bg-slate-950/75 px-4 py-3 backdrop-blur">
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">
                  INCA · Selezione cavi
                </div>
                <div className="text-lg font-semibold text-slate-50 leading-tight">
                  Aggiungi cavi al rapportino
                </div>
                <div className="text-[12px] text-slate-400 mt-1">
                  Filtri:{" "}
                  <span className="text-slate-200 font-semibold">
                    {costr || "—"} · {commessa || "—"}
                  </span>
                  {" · "}
                  Selezionati:{" "}
                  <span className="text-slate-200 font-semibold">
                    {Array.from(selectedIds).length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closePicker}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-[12px] text-slate-200 hover:bg-slate-900/70"
                >
                  Chiudi
                </button>
                <button
                  type="button"
                  onClick={addSelected}
                  disabled={pickerLoading || Array.from(selectedIds).length === 0}
                  className={[
                    "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-[12px] font-semibold",
                    pickerLoading || Array.from(selectedIds).length === 0
                      ? "border-slate-800 bg-slate-950/50 text-slate-600 cursor-not-allowed"
                      : "border-emerald-500/50 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-950/30",
                  ].join(" ")}
                >
                  Aggiungi selezionati
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Cerca per codice / descrizione / marca / situazione…"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100"
                />
              </div>

              {pickerError && (
                <div className="rounded-xl border border-rose-600/40 bg-rose-950/25 px-3 py-2 text-[12px] text-rose-200">
                  {pickerError}
                </div>
              )}

              <div className="rounded-2xl border border-slate-800 bg-slate-950/35 overflow-hidden">
                <div className="max-h-[68vh] overflow-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="sticky top-0 bg-slate-950/80 backdrop-blur border-b border-slate-800">
                      <tr className="text-left text-[11px] text-slate-500">
                        <th className="px-3 py-2 w-[64px]">Sel.</th>
                        <th className="px-3 py-2">Codice</th>
                        <th className="px-3 py-2">Descrizione</th>
                        <th className="px-3 py-2 text-right">Metri</th>
                        <th className="px-3 py-2">Situazione</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {pickerLoading ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-10 text-center text-[12px] text-slate-500">
                            Caricamento INCA…
                          </td>
                        </tr>
                      ) : (pickerRows || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-10 text-center text-[12px] text-slate-500">
                            Nessun cavo disponibile con questi filtri.
                          </td>
                        </tr>
                      ) : (
                        pickerRows.map((r) => {
                          const base = getBaseMetri(r);
                          const checked = selectedIds.has(r.id);

                          return (
                            <tr
                              key={r.id}
                              className="hover:bg-slate-900/25 cursor-pointer"
                              onClick={() => toggleSelected(r.id)}
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSelected(r.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td className="px-3 py-2 text-[12px] text-slate-100 font-semibold">
                                {r.codice || "—"}
                              </td>
                              <td className="px-3 py-2 text-[12px] text-slate-300">
                                {r.descrizione || "—"}
                              </td>
                              <td className="px-3 py-2 text-[12px] text-slate-100 text-right">
                                {base ? formatMeters(base) : "—"}
                              </td>
                              <td className="px-3 py-2 text-[12px] text-slate-300">
                                {r.situazione || "—"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-3 border-t border-slate-800 text-[11px] text-slate-500">
                  Nota: i cavi già collegati non vengono mostrati nel picker.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
