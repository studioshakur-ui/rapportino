// src/components/RapportinoIncaCaviSection.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * RAPPORTINO — INCA
 * - UI "bleu nuit" forcée (lisible en toutes conditions).
 * - Snapshot INCA filtré par costr/commessa (case-insensitive sur commessa).
 * - Link modal avec pagination (pas limité à 60).
 * - Situazione = source unique: inca_cavi.situazione (NULL => NP).
 */

const SITUAZIONI_ORDER = ["NP", "T", "P", "R", "B", "E"];

const SITUAZIONI_LABEL = {
  NP: "Non posato",
  T: "Tagliato",
  P: "Posato",
  R: "Rimosso",
  B: "Bloccato",
  E: "Eliminato",
};

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCode(v) {
  return (v || "").toString().trim();
}

function matchSearch(code, q) {
  const c = normalizeCode(code).toLowerCase();
  const qq = (q || "").toString().trim().toLowerCase();
  if (!qq) return true;
  return c.includes(qq);
}

function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 1000) / 10;
}

function normalizeSituazioneKey(raw) {
  const v = raw == null ? "" : String(raw).trim();
  if (!v) return "NP";
  return SITUAZIONI_ORDER.includes(v) ? v : "NP";
}

function isUniqueViolation(error) {
  return (
    error &&
    (error.code === "23505" ||
      (typeof error.message === "string" &&
        error.message.toLowerCase().includes("duplicate")))
  );
}

/** ===== UI helpers (AA lisible, dark, sans animation) ===== */

function dotClass(k) {
  const base = "inline-block h-2.5 w-2.5 rounded-full";
  const map = {
    NP: "bg-slate-400",
    T: "bg-sky-400",
    P: "bg-emerald-400",
    R: "bg-amber-400",
    B: "bg-fuchsia-400",
    E: "bg-rose-400",
  };
  return [base, map[k] || map.NP].join(" ");
}

function badgeLetterClass(k) {
  const base =
    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-extrabold leading-none";
  const map = {
    NP: "bg-slate-200/10 border-slate-500/60 text-slate-50",
    T: "bg-sky-400/15 border-sky-400/60 text-slate-50",
    P: "bg-emerald-400/15 border-emerald-400/60 text-slate-50",
    R: "bg-amber-400/15 border-amber-400/60 text-slate-50",
    B: "bg-fuchsia-400/15 border-fuchsia-400/60 text-slate-50",
    E: "bg-rose-400/15 border-rose-400/60 text-slate-50",
  };
  return [base, map[k] || map.NP].join(" ");
}

function pillClass(k, active = false) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-semibold leading-none";
  const neutral =
    "bg-slate-950/50 text-slate-50 hover:bg-slate-900/40 focus:outline-none focus:ring-2 focus:ring-sky-500/35";
  const mapBorder = {
    NP: "border-slate-500/60",
    T: "border-sky-400/65",
    P: "border-emerald-400/65",
    R: "border-amber-400/65",
    B: "border-fuchsia-400/65",
    E: "border-rose-400/65",
  };
  const activeState = active ? "bg-slate-50/10 ring-2 ring-white/10" : "";
  return [base, neutral, mapBorder[k] || mapBorder.NP, activeState].join(" ");
}

function incaBadge() {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5",
        "text-[10px] font-bold tracking-[0.18em] uppercase",
        "border-slate-700 text-slate-300 bg-slate-950/60",
      ].join(" ")}
      title="Stato salvato su INCA (globale)"
    >
      INCA
    </span>
  );
}

function snapshotChipClass(k) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-semibold";
  const neutral = "bg-slate-950/55 text-slate-50";
  const mapBorder = {
    P: "border-emerald-400/55",
    NP: "border-slate-500/55",
    B: "border-fuchsia-400/55",
    T: "border-sky-400/55",
    R: "border-amber-400/55",
    E: "border-rose-400/55",
  };
  return [base, neutral, mapBorder[k] || "border-slate-700"].join(" ");
}

/** ===== Modal style unifié ===== */
const MODAL_WRAP_CLASS =
  "fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center";
const MODAL_OVERLAY_CLASS = "absolute inset-0 bg-black/70";
const MODAL_PANEL_CLASS = [
  "relative w-full sm:w-[min(860px,96vw)]",
  "rounded-t-3xl sm:rounded-3xl border border-slate-800",
  "bg-slate-950 shadow-[0_-40px_120px_rgba(0,0,0,0.70)]",
  "px-4 pb-4 pt-4",
].join(" ");

const PAGE_SIZE = 200;

export default function RapportinoIncaCaviSection({
  rapportinoId,
  reportDate,
  costr,
  commessa,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");

  // Picker (situazione)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerIncaCavoId, setPickerIncaCavoId] = useState(null);
  const [pickerValue, setPickerValue] = useState("NP");

  // Link modal + pagination
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkQ, setLinkQ] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkErr, setLinkErr] = useState("");
  const [linkList, setLinkList] = useState([]);
  const [linkToast, setLinkToast] = useState("");
  const [linkPage, setLinkPage] = useState(0);
  const [linkHasMore, setLinkHasMore] = useState(false);

  const linkSearchTimerRef = useRef(null);

  // Snapshot
  const [snapLoading, setSnapLoading] = useState(false);
  const [snapErr, setSnapErr] = useState("");
  const [snap, setSnap] = useState({
    total: 0,
    byKey: { NP: 0, T: 0, P: 0, R: 0, B: 0, E: 0 },
    updatedAt: null,
  });

  const linkedIdsSet = useMemo(
    () => new Set(rows.map((r) => r.inca_cavo_id).filter(Boolean)),
    [rows]
  );

  const closePicker = () => {
    setPickerOpen(false);
    setPickerIncaCavoId(null);
  };

  const openPickerForRow = (row) => {
    const cur = row?.situazioneKey || "NP";
    setPickerIncaCavoId(row?.inca_cavo_id || null);
    setPickerValue(cur);
    setPickerOpen(true);
  };

  const openLinkModal = () => {
    setLinkErr("");
    setLinkToast("");
    setLinkOpen(true);
    setLinkQ("");
    setLinkPage(0);
    setLinkList([]);
    setLinkHasMore(false);
  };

  const closeLinkModal = () => {
    setLinkOpen(false);
    setLinkErr("");
    setLinkToast("");
    setLinkList([]);
    setLinkLoading(false);
    setLinkPage(0);
    setLinkHasMore(false);
    if (linkSearchTimerRef.current) clearTimeout(linkSearchTimerRef.current);
  };

  const buildCaviQuery = ({ qText, page }) => {
    // IMPORTANT: relation explicite via inca_file_id
    let q = supabase
      .from("inca_cavi")
      .select(
        `
          id,
          codice,
          metri_teo,
          situazione,
          inca_files:inca_file_id!inner (
            costr,
            commessa
          )
        `
      )
      // COSTR: eq (stable)
      .eq("inca_files.costr", costr)
      // COMMESSA: case-insensitive
      .ilike("inca_files.commessa", String(commessa || "").trim())
      .order("codice", { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    const s = (qText || "").trim();
    if (s) q = q.ilike("codice", `%${s}%`);
    return q;
  };

  const fetchSnapshot = async () => {
  if (!costr || !commessa) {
    setSnapErr("");
    setSnapLoading(false);
    setSnap({
      total: 0,
      byKey: { NP: 0, T: 0, P: 0, R: 0, B: 0, E: 0 },
      updatedAt: null,
    });
    return;
  }

  setSnapLoading(true);
  setSnapErr("");

  const base = () =>
    supabase
      .from("inca_cavi")
      // join minimal juste pour activer les filtres sur inca_files
      .select("id, inca_files:inca_file_id!inner(id)", { count: "exact", head: true })
      .eq("inca_files.costr", costr)
      // commessa: insensible à la casse
      .ilike("inca_files.commessa", String(commessa || "").trim());

  try {
    // TOTAL exact (pas limité à 1000)
    const totalRes = await base();
    if (totalRes.error) throw totalRes.error;
    const total = totalRes.count || 0;

    // COUNTS par stato (exacts)
    const [npRes, tRes, pRes, rRes, bRes, eRes] = await Promise.all([
      base().is("situazione", null),
      base().eq("situazione", "T"),
      base().eq("situazione", "P"),
      base().eq("situazione", "R"),
      base().eq("situazione", "B"),
      base().eq("situazione", "E"),
    ]);

    const anyErr = npRes.error || tRes.error || pRes.error || rRes.error || bRes.error || eRes.error;
    if (anyErr) throw anyErr;

    const byKey = {
      NP: npRes.count || 0,
      T: tRes.count || 0,
      P: pRes.count || 0,
      R: rRes.count || 0,
      B: bRes.count || 0,
      E: eRes.count || 0,
    };

    setSnap({
      total,
      byKey,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[RapportinoIncaCaviSection] snapshot error:", e);
    setSnapErr("Snapshot INCA non disponibile.");
    setSnap({
      total: 0,
      byKey: { NP: 0, T: 0, P: 0, R: 0, B: 0, E: 0 },
      updatedAt: null,
    });
  } finally {
    setSnapLoading(false);
  }
};

  const fetchData = async () => {
    setLoading(true);
    setErr("");

    try {
      if (!rapportinoId) {
        setRows([]);
        return;
      }

      const { data, error } = await supabase
        .from("rapportino_inca_cavi")
        .select(
          `
            id,
            rapportino_id,
            inca_cavo_id,
            metri_posati,
            note,
            progress_percent,
            step_type,
            codice_cache,
            inca_cavi:inca_cavo_id (
              codice,
              metri_teo,
              situazione
            )
          `
        )
        .eq("rapportino_id", rapportinoId)
        .order("codice_cache", { ascending: true, nullsFirst: false })
        .order("codice", { ascending: true, foreignTable: "inca_cavi" });

      if (error) throw error;

      const list = Array.isArray(data) ? data : [];
      setRows(
        list.map((r) => {
          const codice = r?.codice_cache || r?.inca_cavi?.codice || "";
          const metri_teo = safeNum(r?.inca_cavi?.metri_teo);
          const situazioneKey = normalizeSituazioneKey(r?.inca_cavi?.situazione);

          return {
            id: r.id,
            rapportino_id: r.rapportino_id,
            inca_cavo_id: r.inca_cavo_id,
            codice,
            metri_teo,
            metri_posati: safeNum(r.metri_posati),
            step_type: r.step_type || null,
            note: r.note || "",
            progress_percent: safeNum(r.progress_percent),
            situazioneKey,
          };
        })
      );
    } catch (e) {
      console.error("[RapportinoIncaCaviSection] fetch error:", e);
      setRows([]);
      setErr("Impossibile caricare i cavi INCA collegati.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rapportinoId]);

  useEffect(() => {
    fetchSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costr, commessa]);

  const fetchLinkPage = async ({ page, append }) => {
    if (!linkOpen) return;
    if (!costr || !commessa) {
      setLinkErr("COSTR/commessa non disponibili.");
      setLinkList([]);
      setLinkHasMore(false);
      return;
    }

    setLinkLoading(true);
    setLinkErr("");

    try {
      const { data, error } = await buildCaviQuery({ qText: linkQ, page });
      if (error) throw error;

      const raw = Array.isArray(data) ? data : [];
      const mapped = raw
        .map((r) => ({
          id: r.id,
          codice: r.codice || "",
          metri_teo: safeNum(r.metri_teo),
          situazioneKey: normalizeSituazioneKey(r.situazione),
        }))
        .filter((r) => !linkedIdsSet.has(r.id));

      setLinkList((prev) => (append ? [...prev, ...mapped] : mapped));
      setLinkHasMore(raw.length === PAGE_SIZE);
      setLinkPage(page);
    } catch (e) {
      console.error("[RapportinoIncaCaviSection] link search error:", e);
      setLinkErr("Errore caricando la lista cavi INCA.");
      setLinkList([]);
      setLinkHasMore(false);
    } finally {
      setLinkLoading(false);
    }
  };

  // Debounce search: reset page 0
  useEffect(() => {
    if (!linkOpen) return;

    if (linkSearchTimerRef.current) clearTimeout(linkSearchTimerRef.current);

    linkSearchTimerRef.current = setTimeout(() => {
      fetchLinkPage({ page: 0, append: false });
    }, 250);

    return () => {
      if (linkSearchTimerRef.current) clearTimeout(linkSearchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkQ, linkOpen, costr, commessa, linkedIdsSet]);

  // First open: load page 0
  useEffect(() => {
    if (!linkOpen) return;
    fetchLinkPage({ page: 0, append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkOpen]);

  const filteredRows = useMemo(() => {
    const q = (search || "").trim();
    if (!q) return rows;
    return rows.filter((r) => matchSearch(r.codice, q));
  }, [rows, search]);

  const handleUpdateSituazioneSingle = async (incaCavoId, newKey) => {
    if (!incaCavoId) return;

    const key = newKey === "NP" ? null : newKey;

    setRows((prev) =>
      prev.map((r) =>
        r.inca_cavo_id === incaCavoId ? { ...r, situazioneKey: newKey || "NP" } : r
      )
    );

    setSaving(true);
    setErr("");

    try {
      const { error } = await supabase
        .from("inca_cavi")
        .update({ situazione: key })
        .eq("id", incaCavoId);

      if (error) throw error;

      await fetchSnapshot();
    } catch (e) {
      console.error("[RapportinoIncaCaviSection] update single error:", e);
      setErr("Errore aggiornando lo stato (INCA). Ricarico…");
      await fetchData();
      await fetchSnapshot();
    } finally {
      setSaving(false);
    }
  };

  const handleLinkCavo = async (cavo) => {
    if (!rapportinoId) {
      setLinkErr("Rapportino non valido.");
      return;
    }
    if (!cavo?.id) return;

    setLinkLoading(true);
    setLinkErr("");
    setLinkToast("");

    try {
      const payload = {
        rapportino_id: rapportinoId,
        inca_cavo_id: cavo.id,
        codice_cache: cavo.codice || null,
        metri_posati: 0,
        note: null,
        progress_percent: null,
        step_type: null,
      };

      const { error } = await supabase.from("rapportino_inca_cavi").insert(payload);

      if (error) {
        if (isUniqueViolation(error)) {
          setLinkToast("Cavo già collegato.");
          setLinkList((prev) => prev.filter((x) => x.id !== cavo.id));
          return;
        }
        throw error;
      }

      setLinkToast("Collegato.");
      await fetchData();
      await fetchSnapshot();

      // retirer de la liste du modal
      setLinkList((prev) => prev.filter((x) => x.id !== cavo.id));
    } catch (e) {
      console.error("[RapportinoIncaCSection] link insert error:", e);
      setLinkErr("Errore collegando il cavo. Verifica RLS/permessi o duplicati.");
    } finally {
      setLinkLoading(false);
    }
  };

  const count = filteredRows.length;

  const snapTotal = snap.total || 0;
  const snapP = snap.byKey.P || 0;
  const snapNP = snap.byKey.NP || 0;
  const snapB = snap.byKey.B || 0;
  const snapT = snap.byKey.T || 0;

  return (
    // FORCER BLEU NUIT (évite le “gris pâle” selon les thèmes parents)
    <div className="mt-6 text-slate-50">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                INCA · CAVI COLLEGATI
              </div>

              {(costr || commessa || reportDate) ? (
                <span className="text-slate-600">·</span>
              ) : null}

              {costr || commessa ? (
                <div className="text-[12px] text-slate-200">
                  {costr ? (
                    <>
                      COSTR{" "}
                      <span className="font-semibold text-slate-50">{costr}</span>
                    </>
                  ) : null}
                  {costr && commessa ? <span className="text-slate-600"> / </span> : null}
                  {commessa ? (
                    <span className="font-semibold text-slate-50">{commessa}</span>
                  ) : null}
                </div>
              ) : null}

              {reportDate ? (
                <>
                  <span className="text-slate-600">·</span>
                  <div className="text-[12px] text-slate-200">
                    Data{" "}
                    <span className="font-semibold text-slate-50">
                      {String(reportDate)}
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-slate-200">
                {loading ? "…" : count} <span className="text-slate-500">cavi</span>
              </span>
              {incaBadge()}
              <span className="text-[12px] text-slate-500">
                Modifica Situazione = aggiornamento globale INCA
              </span>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2.5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    Snapshot INCA
                  </div>
                  {snapLoading ? (
                    <span className="text-[12px] text-slate-400">Caricamento…</span>
                  ) : snapErr ? (
                    <span className="text-[12px] text-rose-200">{snapErr}</span>
                  ) : !costr || !commessa ? (
                    <span className="text-[12px] text-slate-500">
                      Seleziona COSTR/commessa
                    </span>
                  ) : (
                    <span className="text-[12px] text-slate-400">
                      Totale{" "}
                      <span className="font-semibold text-slate-50">{snapTotal}</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={snapshotChipClass("P")}>
                    <span className={badgeLetterClass("P")}>P</span>
                    <span>Posato</span>
                    <span className="text-slate-200 tabular-nums">
                      {snapLoading || snapErr ? "—" : `${pct(snapP, snapTotal)}%`}
                    </span>
                  </span>

                  <span className={snapshotChipClass("NP")}>
                    <span className={badgeLetterClass("NP")}>NP</span>
                    <span>Non posato</span>
                    <span className="text-slate-200 tabular-nums">
                      {snapLoading || snapErr ? "—" : `${pct(snapNP, snapTotal)}%`}
                    </span>
                  </span>

                  <span className={snapshotChipClass("B")}>
                    <span className={badgeLetterClass("B")}>B</span>
                    <span>Bloccato</span>
                    <span className="text-slate-200 tabular-nums">
                      {snapLoading || snapErr ? "—" : `${pct(snapB, snapTotal)}%`}
                    </span>
                  </span>

                  <span className={snapshotChipClass("T")}>
                    <span className={badgeLetterClass("T")}>T</span>
                    <span>Tagliato</span>
                    <span className="text-slate-200 tabular-nums">
                      {snapLoading || snapErr ? "—" : `${pct(snapT, snapTotal)}%`}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={[
                "inline-flex items-center gap-2 rounded-full border px-3 py-2",
                "text-[13px] font-semibold",
                "border-sky-400/55 text-slate-50 bg-slate-950/60 hover:bg-slate-900/50",
                "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
              ].join(" ")}
              title="Collega cavo INCA"
              onClick={openLinkModal}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-400/55 text-sky-200">
                +
              </span>
              <span>Collega cavo INCA</span>
            </button>
          </div>
        </div>

        {err ? (
          <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-100">
            {err}
          </div>
        ) : null}

        <div className="mt-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca marca/codice…"
            className={[
              "w-full rounded-2xl border",
              "border-slate-800 bg-slate-950/70",
              "px-3 py-2.5 text-[13px] text-slate-50",
              "placeholder:text-slate-500",
              "outline-none focus:ring-2 focus:ring-sky-500/35",
            ].join(" ")}
          />
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
        <table className="min-w-[980px] w-full text-slate-50">
          <thead className="bg-slate-950/70 border-b border-slate-800">
            <tr className="text-left text-[11px] text-slate-400">
              <th className="px-3 py-2 text-slate-200">Marca / codice</th>
              <th className="px-3 py-2 text-slate-200">Lung. disegno</th>
              <th className="px-3 py-2 text-slate-200">Step</th>
              <th className="px-3 py-2 text-slate-200">Metri posati (rap.)</th>
              <th className="px-3 py-2 text-slate-200">Situazione (INCA)</th>
              <th className="px-3 py-2 text-right text-slate-200">Azioni</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-5 text-[13px] text-slate-300">
                  Caricamento…
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-50">
                        Nessun cavo INCA collegato
                      </div>
                      <div className="mt-1 text-[12px] text-slate-400">
                        Collega i cavi coinvolti nel rapportino per gestire la Situazione INCA.
                      </div>
                    </div>

                    <button
                      type="button"
                      className={[
                        "inline-flex items-center gap-2 rounded-full border px-3 py-2",
                        "text-[13px] font-semibold",
                        "border-sky-400/55 text-slate-50 bg-slate-950/60 hover:bg-slate-900/50",
                        "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                      ].join(" ")}
                      onClick={openLinkModal}
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-400/55 text-sky-200">
                        +
                      </span>
                      <span>Collega cavo INCA</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/20">
                  <td className="px-3 py-2">
                    <div className="text-[13px] text-slate-50 font-semibold">
                      {r.codice || "—"}
                    </div>
                    {r.note ? (
                      <div className="mt-1 text-[12px] text-slate-400 truncate">
                        {r.note}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-3 py-2">
                    <div className="text-[13px] text-slate-100 tabular-nums">
                      {safeNum(r.metri_teo).toFixed(2)}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="text-[13px] text-slate-100">{r.step_type || "—"}</div>
                  </td>

                  <td className="px-3 py-2">
                    <div className="text-[13px] text-slate-100 tabular-nums">
                      {safeNum(r.metri_posati).toFixed(2)}
                    </div>
                  </td>

                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => openPickerForRow(r)}
                      className={pillClass(r.situazioneKey)}
                      title="Imposta situazione (INCA globale)"
                    >
                      <span className={badgeLetterClass(r.situazioneKey)}>{r.situazioneKey}</span>
                      <span className="whitespace-nowrap">{SITUAZIONI_LABEL[r.situazioneKey] || "—"}</span>
                      <span className={dotClass(r.situazioneKey)} aria-hidden="true" />
                      {incaBadge()}
                    </button>
                  </td>

                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className={[
                        "inline-flex items-center rounded-full border px-3 py-2",
                        "text-[12px] font-semibold",
                        "border-slate-700 text-slate-100 bg-slate-950/60 hover:bg-slate-900/50",
                        "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                      ].join(" ")}
                      title="Scollega"
                      onClick={async () => {
                        setSaving(true);
                        setErr("");
                        try {
                          const { error } = await supabase
                            .from("rapportino_inca_cavi")
                            .delete()
                            .eq("id", r.id);
                          if (error) throw error;

                          setRows((prev) => prev.filter((x) => x.id !== r.id));
                          await fetchSnapshot();
                        } catch (e) {
                          console.error("[RapportinoIncaCaviSection] delete link error:", e);
                          setErr("Errore rimuovendo il collegamento. Ricarico…");
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

      {saving ? <div className="mt-2 text-[12px] text-slate-400">Salvataggio…</div> : null}

      {/* Picker modal */}
      {pickerOpen ? (
        <div
          className={MODAL_WRAP_CLASS}
          role="dialog"
          aria-modal="true"
          aria-label="Situazione cavo (INCA)"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePicker();
          }}
        >
          <div className={MODAL_OVERLAY_CLASS} />

          <div className={MODAL_PANEL_CLASS}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Situazione <span className="text-slate-600">·</span>{" "}
                  <span className="text-slate-200">INCA (globale)</span>
                </div>
                <div className="mt-1 text-[14px] font-semibold text-slate-50">
                  Seleziona stato
                </div>
                <div className="mt-1 text-[12px] text-slate-400">
                  Questa modifica aggiorna lo stato del cavo su INCA.
                </div>
              </div>

              <button
                type="button"
                onClick={closePicker}
                className={[
                  "inline-flex items-center justify-center rounded-full border px-3 py-2",
                  "text-[13px] font-semibold",
                  "border-slate-700 text-slate-100 bg-slate-950/60 hover:bg-slate-900/50",
                  "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                ].join(" ")}
              >
                Chiudi
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {SITUAZIONI_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setPickerValue(k);
                    (async () => {
                      await handleUpdateSituazioneSingle(pickerIncaCavoId, k);
                    })();
                    closePicker();
                  }}
                  className={pillClass(k, pickerValue === k)}
                  title={SITUAZIONI_LABEL[k]}
                >
                  <span className={badgeLetterClass(k)}>{k}</span>
                  <span>{SITUAZIONI_LABEL[k]}</span>
                  <span className={dotClass(k)} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Link modal */}
      {linkOpen ? (
        <div
          className={MODAL_WRAP_CLASS}
          role="dialog"
          aria-modal="true"
          aria-label="Collega cavo INCA"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeLinkModal();
          }}
        >
          <div className={MODAL_OVERLAY_CLASS} />

          <div className={MODAL_PANEL_CLASS}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Collega cavo <span className="text-slate-600">·</span>{" "}
                  <span className="text-slate-200">INCA</span>
                </div>
                <div className="mt-1 text-[14px] font-semibold text-slate-50">
                  Cerca e collega un cavo alla lista del rapportino
                </div>
                <div className="mt-1 text-[12px] text-slate-400">
                  Mostra solo cavi di COSTR/commessa e non già collegati.
                </div>
              </div>

              <button
                type="button"
                onClick={closeLinkModal}
                className={[
                  "inline-flex items-center justify-center rounded-full border px-3 py-2",
                  "text-[13px] font-semibold",
                  "border-slate-700 text-slate-100 bg-slate-950/60 hover:bg-slate-900/50",
                  "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                ].join(" ")}
              >
                Chiudi
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Contesto
                </div>
                <div className="mt-1 text-[13px] text-slate-50 font-semibold">
                  {costr && commessa ? `COSTR ${costr} / ${commessa}` : "—"}
                </div>
                <div className="mt-1 text-[12px] text-slate-400">
                  Rapportino:{" "}
                  <span className="font-semibold text-slate-200">
                    {rapportinoId ? "OK" : "—"}
                  </span>
                </div>
              </div>

              <div className="md:col-span-8">
                <input
                  value={linkQ}
                  onChange={(e) => {
                    setLinkQ(e.target.value);
                    setLinkPage(0);
                  }}
                  placeholder="Cerca codice INCA… (es. MARCA CAVO)"
                  className={[
                    "w-full rounded-2xl border",
                    "border-slate-800 bg-slate-950/70",
                    "px-3 py-3 text-[13px] text-slate-50",
                    "placeholder:text-slate-500",
                    "outline-none focus:ring-2 focus:ring-sky-500/35",
                  ].join(" ")}
                />
                <div className="mt-2 flex items-center gap-2">
                  {linkLoading ? (
                    <span className="text-[12px] text-slate-400">Caricamento…</span>
                  ) : null}
                  {linkToast ? (
                    <span className="text-[12px] text-emerald-200">{linkToast}</span>
                  ) : null}
                  {linkErr ? (
                    <span className="text-[12px] text-rose-200">{linkErr}</span>
                  ) : null}
                  {!linkLoading && !linkErr ? (
                    <span className="text-[12px] text-slate-500">
                      {linkList.length} risultati (pagina {linkPage + 1})
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
              <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/70">
                <div className="grid grid-cols-12 gap-2 text-[11px] text-slate-400">
                  <div className="col-span-6 text-slate-200">Codice</div>
                  <div className="col-span-2 text-slate-200">Lung.</div>
                  <div className="col-span-3 text-slate-200">Situazione</div>
                  <div className="col-span-1 text-right text-slate-200">+</div>
                </div>
              </div>

              <div className="max-h-[52vh] overflow-auto">
                {linkLoading && linkList.length === 0 ? (
                  <div className="px-3 py-6 text-[13px] text-slate-400">
                    Caricamento lista…
                  </div>
                ) : linkList.length === 0 ? (
                  <div className="px-3 py-6 text-[13px] text-slate-400">
                    Nessun risultato (o tutti già collegati).
                  </div>
                ) : (
                  linkList.map((c) => (
                    <div
                      key={c.id}
                      className="px-3 py-2 border-b border-slate-800 last:border-b-0 hover:bg-slate-900/25"
                    >
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6 min-w-0">
                          <div className="text-[13px] font-semibold text-slate-50 truncate">
                            {c.codice || "—"}
                          </div>
                          <div className="mt-0.5 text-[12px] text-slate-400">
                            ID: <span className="text-slate-500">{c.id}</span>
                          </div>
                        </div>

                        <div className="col-span-2">
                          <div className="text-[13px] text-slate-100 tabular-nums">
                            {safeNum(c.metri_teo).toFixed(2)}
                          </div>
                        </div>

                        <div className="col-span-3">
                          <span className={pillClass(c.situazioneKey)} title="Situazione (INCA)">
                            <span className={badgeLetterClass(c.situazioneKey)}>{c.situazioneKey}</span>
                            <span className="whitespace-nowrap">
                              {SITUAZIONI_LABEL[c.situazioneKey] || "—"}
                            </span>
                            <span className={dotClass(c.situazioneKey)} aria-hidden="true" />
                            {incaBadge()}
                          </span>
                        </div>

                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            disabled={linkLoading}
                            onClick={() => handleLinkCavo(c)}
                            className={[
                              "inline-flex items-center justify-center rounded-full border px-3 py-2",
                              "text-[12px] font-semibold",
                              "border-sky-400/55 text-slate-50 bg-slate-950/60 hover:bg-slate-900/50",
                              "disabled:opacity-50 disabled:cursor-not-allowed",
                              "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                            ].join(" ")}
                            title="Collega"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              <div className="px-3 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
                <div className="text-[12px] text-slate-500">
                  Mostrati: <span className="text-slate-200 font-semibold">{linkList.length}</span>
                </div>

                <button
                  type="button"
                  disabled={!linkHasMore || linkLoading}
                  onClick={() => fetchLinkPage({ page: linkPage + 1, append: true })}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2",
                    "text-[12px] font-semibold",
                    "border-slate-700 text-slate-100 bg-slate-950/60 hover:bg-slate-900/50",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                  ].join(" ")}
                  title="Carica altri"
                >
                  Carica altri
                </button>
              </div>
            </div>

            <div className="mt-3 text-[12px] text-slate-500">
              Nota: il collegamento crea una riga su{" "}
              <span className="text-slate-300 font-semibold">rapportino_inca_cavi</span>. La
              Situazione resta globale su{" "}
              <span className="text-slate-300 font-semibold">inca_cavi</span>.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
