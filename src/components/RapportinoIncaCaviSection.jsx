// src/components/RapportinoIncaCaviSection.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * RAPPORTINO — INCA (CORE 1.0) — UI CORE style (de-noised)
 *
 * Architecture verrouillée (inchangée):
 * - CAPO ne peut pas écrire inca_cavi (RLS). Donc:
 *   - Progress 50/70/100 + DA/A (journalier) => rapportino_inca_cavi.progress_percent + progress_side
 * - INCA global (inca_cavi.progress_*) reste la vérité cockpit et popover "apparati" global.
 *
 * UI rules (inchangées):
 * - "Attuale" affiche uniquement la valeur persistée (jamais une pré-sélection).
 * - Ne jamais afficher "lato DA" si progress_percent est NULL.
 *
 * UI simplification (CORE style):
 * - Header minimal + toggle "Analisi" (Snapshot caché par défaut)
 * - Table réduite (4 colonnes utiles) + édition progress dans un drawer
 * - Suppression des badges INCA/RAP partout (implicite par rôle)
 * - Actions en menu discret
 *
 * NOTE:
 * - Ce fichier suppose que la migration SQL a été appliquée (progress_side sur rapportino_inca_cavi).
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

const PROGRESS_OPTIONS = [50, 70, 100];
const PAGE_SIZE = 200;

/** ===== Utils ===== */
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

function normalizeProgressPercent(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n === 50 || n === 70 || n === 100) return n;
  return null;
}

function normalizeProgressSideNullable(raw) {
  const v = raw == null ? "" : String(raw).trim();
  if (v === "DA" || v === "A") return v;
  return null;
}

function isUniqueViolation(error) {
  return (
    error &&
    (error.code === "23505" ||
      (typeof error.message === "string" &&
        error.message.toLowerCase().includes("duplicate")))
  );
}

/** ===== UI helpers (AA lisible, dark, sans animation agressive) ===== */
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
    "bg-slate-950/55 text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/35";
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

function ghostBtnClass() {
  return [
    "inline-flex items-center justify-center rounded-full border px-3 py-2",
    "text-[12px] font-semibold",
    "border-slate-700 text-slate-100 bg-slate-950/60 hover:bg-slate-900/50",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
  ].join(" ");
}

function primaryBtnClass() {
  return [
    "inline-flex items-center gap-2 rounded-full border px-3 py-2",
    "text-[13px] font-semibold",
    "border-sky-400/55 text-slate-50 bg-slate-950/60 hover:bg-slate-900/50",
    "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
  ].join(" ");
}

function menuItemClass(danger = false) {
  return [
    "w-full text-left px-3 py-2 text-[12px] font-semibold",
    "hover:bg-slate-900/45 focus:outline-none focus:bg-slate-900/45",
    danger ? "text-rose-200" : "text-slate-100",
  ].join(" ");
}

/** ===== Modal / Drawer style unifié ===== */
const MODAL_WRAP_CLASS =
  "fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center";
const MODAL_OVERLAY_CLASS = "absolute inset-0 bg-black/70";
const MODAL_PANEL_CLASS = [
  "relative w-full sm:w-[min(860px,96vw)]",
  "rounded-t-3xl sm:rounded-3xl border border-slate-800",
  "bg-slate-950 shadow-[0_-40px_120px_rgba(0,0,0,0.70)]",
  "px-4 pb-4 pt-4",
].join(" ");

/** ===== Roles ===== */
function canMutateIncaGlobal(appRole) {
  return appRole === "UFFICIO" || appRole === "ADMIN";
}

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

  // CORE UI: hide analytics by default
  const [showAnalisi, setShowAnalisi] = useState(false);

  // Profile / role
  const [appRole, setAppRole] = useState("CAPO"); // safe default
  const canWriteInca = canMutateIncaGlobal(appRole);

  // Picker (situazione)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerIncaCavoId, setPickerIncaCavoId] = useState(null);
  const [pickerValue, setPickerValue] = useState("NP");

  // Progress drawer (single row edit)
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressRow, setProgressRow] = useState(null);
  const [progressDraftPercent, setProgressDraftPercent] = useState(null);
  const [progressDraftSide, setProgressDraftSide] = useState("DA");

  // Row menu
  const [menuRowId, setMenuRowId] = useState(null);

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

  /** Load current profile role (safe) */
  useEffect(() => {
    let alive = true;
    async function loadRole() {
      try {
        const { data, error } = await supabase.rpc("core_current_profile");
        if (error) throw error;
        const role = data?.app_role ? String(data.app_role).trim() : "CAPO";
        if (alive) setAppRole(role || "CAPO");
      } catch (e) {
        if (alive) setAppRole("CAPO");
      }
    }
    loadRole();
    return () => {
      alive = false;
    };
  }, []);

  const closePicker = () => {
    setPickerOpen(false);
    setPickerIncaCavoId(null);
  };

  const openPickerForRow = (row) => {
    if (!canWriteInca) return;
    const cur = row?.situazioneKey || "NP";
    setPickerIncaCavoId(row?.inca_cavo_id || null);
    setPickerValue(cur);
    setPickerOpen(true);
  };

  const openProgressDrawer = (row) => {
    if (!row) return;

    // Which persisted value is editable depends on role:
    // - CAPO edits RAP (rapportino_inca_cavi)
    // - UFFICIO/ADMIN edits INCA global (inca_cavi)
    const persistedPercent = canWriteInca ? row.incaProgressPercent : row.rapProgressPercent;
    const persistedSide = canWriteInca ? row.incaProgressSide : row.rapProgressSide;

    setProgressRow(row);
    setProgressDraftPercent(persistedPercent);
    setProgressDraftSide(persistedSide || "DA");
    setProgressOpen(true);
  };

  const closeProgressDrawer = () => {
    setProgressOpen(false);
    setProgressRow(null);
    setProgressDraftPercent(null);
    setProgressDraftSide("DA");
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
      .eq("inca_files.costr", costr)
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
        .select("id, inca_files:inca_file_id!inner(id)", {
          count: "exact",
          head: true,
        })
        .eq("inca_files.costr", costr)
        .ilike("inca_files.commessa", String(commessa || "").trim());

    try {
      const totalRes = await base();
      if (totalRes.error) throw totalRes.error;
      const total = totalRes.count || 0;

      const [npRes, tRes, pRes, rRes, bRes, eRes] = await Promise.all([
        base().is("situazione", null),
        base().eq("situazione", "T"),
        base().eq("situazione", "P"),
        base().eq("situazione", "R"),
        base().eq("situazione", "B"),
        base().eq("situazione", "E"),
      ]);

      const anyErr =
        npRes.error ||
        tRes.error ||
        pRes.error ||
        rRes.error ||
        bRes.error ||
        eRes.error;
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
            step_type,
            codice_cache,
            progress_percent,
            progress_side,
            inca_cavi:inca_cavo_id (
              codice,
              metri_teo,
              situazione,
              progress_percent,
              progress_side
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

          // Persisted GLOBAL (INCA)
          const incaProgressPercent = normalizeProgressPercent(
            r?.inca_cavi?.progress_percent
          );
          const incaProgressSide = normalizeProgressSideNullable(
            r?.inca_cavi?.progress_side
          );

          // Persisted DAILY (RAPPORTINO)
          const rapProgressPercent = normalizeProgressPercent(r?.progress_percent);
          const rapProgressSide = normalizeProgressSideNullable(r?.progress_side);

          return {
            id: r.id,
            rapportino_id: r.rapportino_id,
            inca_cavo_id: r.inca_cavo_id,
            codice,
            metri_teo,
            metri_posati: safeNum(r.metri_posati),
            step_type: r.step_type || null,
            note: r.note || "",

            situazioneKey, // from INCA

            incaProgressPercent,
            incaProgressSide,

            rapProgressPercent,
            rapProgressSide,
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

  // Debounce search (modal)
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

  // First open
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

  /** ===== INCA global: update situazione (UFFICIO/ADMIN only) ===== */
  const handleUpdateSituazioneSingle = async (incaCavoId, newKey) => {
    if (!incaCavoId) return;
    if (!canWriteInca) return;

    const key = newKey === "NP" ? null : newKey;

    setRows((prev) =>
      prev.map((r) =>
        r.inca_cavo_id === incaCavoId ? { ...r, situazioneKey: newKey || "NP" } : r
      )
    );

    setSaving(true);
    setErr("");

    try {
      const { error } = await supabase.from("inca_cavi").update({ situazione: key }).eq("id", incaCavoId);
      if (error) throw error;

      await fetchSnapshot();
    } catch (e) {
      console.error("[RapportinoIncaCaviSection] update situazione error:", e);
      setErr("Errore aggiornando lo stato (INCA). Ricarico…");
      await fetchData();
      await fetchSnapshot();
    } finally {
      setSaving(false);
    }
  };

  /** ===== Progress JOURNALIER (CAPO) ===== */
  const updateRapportinoProgress = async ({ rowId, incaCavoId, percent, side }) => {
    if (!rowId || !incaCavoId) return;

    const pctVal = normalizeProgressPercent(percent);
    const sideVal = normalizeProgressSideNullable(side) || "DA";

    // Optimistic (journalier)
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          rapProgressPercent: pctVal,
          rapProgressSide: sideVal,
        };
      })
    );

    setSaving(true);
    setErr("");

    try {
      const patch = {
        progress_percent: pctVal,
        progress_side: sideVal,
      };

      const { error } = await supabase.from("rapportino_inca_cavi").update(patch).eq("id", rowId);
      if (error) throw error;
    } catch (e) {
      console.error("[RapportinoIncaCaviSection] update RAP progress error:", e);
      setErr("Errore aggiornando la progressione (Rapportino). Ricarico…");
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  /** ===== Progress GLOBAL (UFFICIO/ADMIN) ===== */
  const updateIncaProgress = async ({ incaCavoId, percent, side }) => {
    if (!incaCavoId) return;
    if (!canWriteInca) return;

    const pctVal = normalizeProgressPercent(percent);
    const sideVal = normalizeProgressSideNullable(side) || "DA";

    // Optimistic
    setRows((prev) =>
      prev.map((r) => {
        if (r.inca_cavo_id !== incaCavoId) return r;

        const next = {
          ...r,
          incaProgressPercent: pctVal,
          incaProgressSide: sideVal,
        };

        // règle: dès que >=50 => P sur INCA
        if (pctVal != null && pctVal >= 50) next.situazioneKey = "P";
        return next;
      })
    );

    setSaving(true);
    setErr("");

    try {
      const patch = {
        progress_percent: pctVal,
        progress_side: sideVal,
      };

      // règle métier: >=50 => P
      if (pctVal != null && pctVal >= 50) patch.situazione = "P";

      const { error } = await supabase.from("inca_cavi").update(patch).eq("id", incaCavoId);
      if (error) throw error;

      await fetchSnapshot();
    } catch (e) {
      console.error("[RapportinoIncaCaviSection] update INCA progress error:", e);
      setErr("Errore aggiornando la progressione (INCA). Ricarico…");
      await fetchData();
      await fetchSnapshot();
    } finally {
      setSaving(false);
    }
  };

  /** ===== Save progress from drawer (role-based) ===== */
  const handleSaveProgress = async () => {
    if (!progressRow) return;

    const percent = normalizeProgressPercent(progressDraftPercent);
    const side = normalizeProgressSideNullable(progressDraftSide) || "DA";

    // If user keeps percent null, we DO NOT persist side (but DB requires side if we store it).
    // Our model stores side only with a valid percent.
    if (percent == null) {
      if (canWriteInca) {
        // reset global
        await updateIncaProgress({ incaCavoId: progressRow.inca_cavo_id, percent: null, side: "DA" });
      } else {
        // reset journalier
        await updateRapportinoProgress({
          rowId: progressRow.id,
          incaCavoId: progressRow.inca_cavo_id,
          percent: null,
          side: "DA",
        });
      }
      closeProgressDrawer();
      return;
    }

    if (canWriteInca) {
      await updateIncaProgress({ incaCavoId: progressRow.inca_cavo_id, percent, side });
    } else {
      await updateRapportinoProgress({
        rowId: progressRow.id,
        incaCavoId: progressRow.inca_cavo_id,
        percent,
        side,
      });
    }

    closeProgressDrawer();
  };

  /** ===== Link câble à la liste du rapportino ===== */
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
        step_type: "POSA",
        // initialize daily progress as NULL (no fake truth)
        progress_percent: null,
        progress_side: null,
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

      setLinkList((prev) => prev.filter((x) => x.id !== cavo.id));
    } catch (e) {
      console.error("[RapportinoIncaCaviSection] link insert error:", e);
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

  const modeLabel = canWriteInca ? "Modalità: INCA (globale)" : "Modalità: RAP (giornaliero)";

  return (
    <div className="mt-6 text-slate-50">
      {/* HEADER (minimal CORE) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                INCA · CAVI COLLEGATI
              </div>

              {(costr || commessa || reportDate) ? <span className="text-slate-600">·</span> : null}

              {costr || commessa ? (
                <div className="text-[12px] text-slate-200">
                  {costr ? (
                    <>
                      COSTR <span className="font-semibold text-slate-50">{costr}</span>
                    </>
                  ) : null}
                  {costr && commessa ? <span className="text-slate-600"> / </span> : null}
                  {commessa ? <span className="font-semibold text-slate-50">{commessa}</span> : null}
                </div>
              ) : null}

              {reportDate ? (
                <>
                  <span className="text-slate-600">·</span>
                  <div className="text-[12px] text-slate-200">
                    Data <span className="font-semibold text-slate-50">{String(reportDate)}</span>
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-[12px] text-slate-200">
                {loading ? "…" : count} <span className="text-slate-500">cavi collegati</span>
              </span>

              <span className="text-[12px] text-slate-500">
                Ruolo: <span className="text-slate-200 font-semibold">{appRole}</span>
              </span>

              <span className="text-[12px] text-slate-500">
                <span className="text-slate-200 font-semibold">{modeLabel}</span>
              </span>

              <button
                type="button"
                onClick={() => setShowAnalisi((v) => !v)}
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
                  "text-[12px] font-semibold",
                  "border-slate-700 text-slate-100 bg-slate-950/60 hover:bg-slate-900/50",
                  "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                ].join(" ")}
                title="Mostra/Nascondi analisi"
              >
                <span className="text-slate-300">{showAnalisi ? "Nascondi" : "Analisi"}</span>
              </button>
            </div>

            {/* ANALISI (collapsible) */}
            {showAnalisi ? (
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
                      <span className="text-[12px] text-slate-500">Seleziona COSTR/commessa</span>
                    ) : (
                      <span className="text-[12px] text-slate-400">
                        Totale <span className="font-semibold text-slate-50">{snapTotal}</span>
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

          <div className="flex items-center gap-2">
            <button type="button" className={primaryBtnClass()} title="Collega cavo INCA" onClick={openLinkModal}>
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
      </div>

      {/* TABLE (CORE minimal) */}
      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
        <table className="min-w-[920px] w-full text-slate-50">
          <thead className="bg-slate-950/70 border-b border-slate-800">
            <tr className="text-left text-[11px] text-slate-400">
              <th className="px-3 py-2 text-slate-200">Marca / codice</th>
              <th className="px-3 py-2 text-slate-200">Lung. disegno</th>
              <th className="px-3 py-2 text-slate-200">Progress</th>
              <th className="px-3 py-2 text-slate-200">Stato INCA</th>
              <th className="px-3 py-2 text-right text-slate-200">Azioni</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-[13px] text-slate-300">
                  Caricamento…
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-50">
                        Nessun cavo INCA collegato
                      </div>
                      <div className="mt-1 text-[12px] text-slate-400">
                        Collega i cavi coinvolti nel rapportino per gestire Stato e Progress.
                      </div>
                    </div>

                    <button type="button" className={primaryBtnClass()} onClick={openLinkModal}>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-400/55 text-sky-200">
                        +
                      </span>
                      <span>Collega cavo INCA</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => {
                const attualePercent = canWriteInca ? r.incaProgressPercent : r.rapProgressPercent;
                const attualeSide = canWriteInca ? r.incaProgressSide : r.rapProgressSide;
                const showSide = attualePercent != null && attualeSide != null;

                // Stato INCA: CAPO voit (passif), UFFICIO/ADMIN peut éditer
                const statoButtonLike = canWriteInca;

                return (
                  <tr key={r.id} className="hover:bg-slate-900/20">
                    <td className="px-3 py-2">
                      <div className="text-[13px] text-slate-50 font-semibold">{r.codice || "—"}</div>
                      {r.note ? (
                        <div className="mt-1 text-[12px] text-slate-400 truncate">{r.note}</div>
                      ) : null}
                    </td>

                    <td className="px-3 py-2">
                      <div className="text-[13px] text-slate-100 tabular-nums">
                        {safeNum(r.metri_teo).toFixed(2)}
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[13px] text-slate-100 font-semibold tabular-nums">
                            {attualePercent != null ? `${attualePercent}%` : "—"}
                            {showSide ? (
                              <span className="ml-2 text-[11px] font-semibold text-slate-400">
                                {attualeSide}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {canWriteInca ? "Globale (INCA)" : "Giornaliero (RAP)"}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={ghostBtnClass()}
                          onClick={() => openProgressDrawer(r)}
                          disabled={saving}
                          title="Modifica progress"
                        >
                          Modifica
                        </button>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openPickerForRow(r)}
                        className={[
                          pillClass(r.situazioneKey),
                          statoButtonLike ? "hover:bg-slate-900/40" : "cursor-default opacity-90",
                        ].join(" ")}
                        title={
                          canWriteInca
                            ? "Imposta stato (INCA globale)"
                            : "Solo lettura (CAPO non può modificare INCA)"
                        }
                        disabled={!canWriteInca}
                      >
                        <span className={badgeLetterClass(r.situazioneKey)}>{r.situazioneKey}</span>
                        <span className="whitespace-nowrap">{SITUAZIONI_LABEL[r.situazioneKey] || "—"}</span>
                      </button>
                    </td>

                    <td className="px-3 py-2 text-right relative">
                      <button
                        type="button"
                        className={ghostBtnClass()}
                        onClick={() => setMenuRowId((v) => (v === r.id ? null : r.id))}
                        title="Azioni"
                      >
                        …
                      </button>

                      {menuRowId === r.id ? (
                        <div
                          className="absolute right-3 mt-2 w-[180px] rounded-xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden z-20"
                          role="menu"
                          onMouseLeave={() => setMenuRowId(null)}
                        >
                          <button
                            type="button"
                            className={menuItemClass(true)}
                            onClick={async () => {
                              setMenuRowId(null);
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
                            Rimuovi collegamento
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {saving ? <div className="mt-2 text-[12px] text-slate-400">Salvataggio…</div> : null}

      {/* Progress drawer */}
      {progressOpen ? (
        <div
          className={MODAL_WRAP_CLASS}
          role="dialog"
          aria-modal="true"
          aria-label="Modifica progress"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeProgressDrawer();
          }}
        >
          <div className={MODAL_OVERLAY_CLASS} />

          <div className={MODAL_PANEL_CLASS}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Progress <span className="text-slate-600">·</span>{" "}
                  <span className="text-slate-200">{canWriteInca ? "INCA (globale)" : "RAP (giornaliero)"}</span>
                </div>
                <div className="mt-1 text-[14px] font-semibold text-slate-50">
                  {progressRow?.codice || "Cavo"}
                </div>
                <div className="mt-1 text-[12px] text-slate-400">
                  Se percentuale è vuota, non viene mostrato alcun lato (DA/A).
                </div>
              </div>

              <button type="button" onClick={closeProgressDrawer} className={ghostBtnClass()}>
                Chiudi
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Attuale</div>
                <div className="mt-2 text-[24px] font-extrabold text-slate-50 tabular-nums">
                  {(() => {
                    const p = canWriteInca ? progressRow?.incaProgressPercent : progressRow?.rapProgressPercent;
                    const s = canWriteInca ? progressRow?.incaProgressSide : progressRow?.rapProgressSide;
                    if (p == null) return "—";
                    if (s) return `${p}% · ${s}`;
                    return `${p}%`;
                  })()}
                </div>
                <div className="mt-1 text-[12px] text-slate-500">
                  {canWriteInca ? "Aggiorna il cavo su INCA" : "Aggiorna il giornaliero nel rapportino"}
                </div>
              </div>

              <div className="md:col-span-7 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Impostazione</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={[
                      "rounded-full border px-3 py-2 text-[12px] font-semibold",
                      "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                      progressDraftPercent == null
                        ? "border-sky-400/65 bg-slate-50/10 text-slate-50"
                        : "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/45",
                    ].join(" ")}
                    onClick={() => setProgressDraftPercent(null)}
                    disabled={saving}
                    title="Nessun progress salvato"
                  >
                    —
                  </button>

                  {PROGRESS_OPTIONS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={[
                        "rounded-full border px-3 py-2 text-[12px] font-semibold",
                        "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                        progressDraftPercent === p
                          ? "border-sky-400/65 bg-slate-50/10 text-slate-50"
                          : "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/45",
                      ].join(" ")}
                      onClick={() => setProgressDraftPercent(p)}
                      disabled={saving}
                      title={`Imposta ${p}%`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Lato</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className={[
                        "rounded-full border px-3 py-2 text-[12px] font-semibold",
                        "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                        progressDraftSide === "DA"
                          ? "border-emerald-400/60 bg-emerald-400/10 text-slate-50"
                          : "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/45",
                      ].join(" ")}
                      onClick={() => setProgressDraftSide("DA")}
                      disabled={saving}
                      title="APP PARTENZA (DA)"
                    >
                      DA
                    </button>

                    <button
                      type="button"
                      className={[
                        "rounded-full border px-3 py-2 text-[12px] font-semibold",
                        "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                        progressDraftSide === "A"
                          ? "border-emerald-400/60 bg-emerald-400/10 text-slate-50"
                          : "border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-900/45",
                      ].join(" ")}
                      onClick={() => setProgressDraftSide("A")}
                      disabled={saving}
                      title="APP ARRIVO (A)"
                    >
                      A
                    </button>

                    <span className="ml-2 text-[12px] text-slate-500">
                      (mostrato solo se la percentuale è salvata)
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button type="button" className={ghostBtnClass()} onClick={closeProgressDrawer} disabled={saving}>
                    Annulla
                  </button>
                  <button
                    type="button"
                    className={primaryBtnClass()}
                    onClick={handleSaveProgress}
                    disabled={saving || !progressRow}
                    title="Salva"
                  >
                    Salva
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Picker modal (situazione INCA) */}
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
                  Stato <span className="text-slate-600">·</span>{" "}
                  <span className="text-slate-200">INCA (globale)</span>
                </div>
                <div className="mt-1 text-[14px] font-semibold text-slate-50">Seleziona stato</div>
                <div className="mt-1 text-[12px] text-slate-400">
                  Questa modifica aggiorna lo stato del cavo su INCA.
                </div>
              </div>

              <button type="button" onClick={closePicker} className={ghostBtnClass()}>
                Chiudi
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {SITUAZIONI_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={async () => {
                    setPickerValue(k);
                    await handleUpdateSituazioneSingle(pickerIncaCavoId, k);
                    closePicker();
                  }}
                  className={pillClass(k, pickerValue === k)}
                  title={SITUAZIONI_LABEL[k]}
                >
                  <span className={badgeLetterClass(k)}>{k}</span>
                  <span>{SITUAZIONI_LABEL[k]}</span>
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

              <button type="button" onClick={closeLinkModal} className={ghostBtnClass()}>
                Chiudi
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Contesto</div>
                <div className="mt-1 text-[13px] text-slate-50 font-semibold">
                  {costr && commessa ? `COSTR ${costr} / ${commessa}` : "—"}
                </div>
                <div className="mt-1 text-[12px] text-slate-400">
                  Rapportino:{" "}
                  <span className="font-semibold text-slate-200">{rapportinoId ? "OK" : "—"}</span>
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
                  {linkLoading ? <span className="text-[12px] text-slate-400">Caricamento…</span> : null}
                  {linkToast ? <span className="text-[12px] text-emerald-200">{linkToast}</span> : null}
                  {linkErr ? <span className="text-[12px] text-rose-200">{linkErr}</span> : null}
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
                  <div className="col-span-7 text-slate-200">Codice</div>
                  <div className="col-span-2 text-slate-200">Lung.</div>
                  <div className="col-span-2 text-slate-200">Stato</div>
                  <div className="col-span-1 text-right text-slate-200">+</div>
                </div>
              </div>

              <div className="max-h-[52vh] overflow-auto">
                {linkLoading && linkList.length === 0 ? (
                  <div className="px-3 py-6 text-[13px] text-slate-400">Caricamento lista…</div>
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
                        <div className="col-span-7 min-w-0">
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

                        <div className="col-span-2">
                          <span className={pillClass(c.situazioneKey)} title="Stato (INCA)">
                            <span className={badgeLetterClass(c.situazioneKey)}>{c.situazioneKey}</span>
                            <span className="whitespace-nowrap">{SITUAZIONI_LABEL[c.situazioneKey] || "—"}</span>
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

              <div className="px-3 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
                <div className="text-[12px] text-slate-500">
                  Mostrati: <span className="text-slate-200 font-semibold">{linkList.length}</span>
                </div>

                <button
                  type="button"
                  disabled={!linkHasMore || linkLoading}
                  onClick={() => fetchLinkPage({ page: linkPage + 1, append: true })}
                  className={ghostBtnClass()}
                  title="Carica altri"
                >
                  Carica altri
                </button>
              </div>
            </div>

            <div className="mt-3 text-[12px] text-slate-500">
              Nota: il collegamento crea una riga su{" "}
              <span className="text-slate-300 font-semibold">rapportino_inca_cavi</span>. INCA globale resta su{" "}
              <span className="text-slate-300 font-semibold">inca_cavi</span>.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
