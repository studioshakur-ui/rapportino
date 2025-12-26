// /src/components/RapportinoPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

import LoadingScreen from "./LoadingScreen";
import RapportinoHeader from "./rapportino/RapportinoHeader";
import RapportinoTable from "./rapportino/RapportinoTable";
import RapportinoIncaCaviSection from "./RapportinoIncaCaviSection";

import { getTodayISO, parseNumeric, getBaseRows, adjustOperatorTempoHeights } from "../rapportinoUtils";

const STATUS_LABELS = {
  DRAFT: "Bozza",
  VALIDATED_CAPO: "Validata dal Capo",
  APPROVED_UFFICIO: "Approvata dall'Ufficio",
  RETURNED: "Rimandata dall'Ufficio",
};

const CREW_LABELS = {
  ELETTRICISTA: "Elettricista",
  CARPENTERIA: "Carpenteria",
  MONTAGGIO: "Montaggio",
};

function normalizeCrewRole(value) {
  if (value === "ELETTRICISTA" || value === "CARPENTERIA" || value === "MONTAGGIO") return value;
  return "ELETTRICISTA";
}

function readRoleFromLocalStorage() {
  try {
    const stored = window.localStorage.getItem("core-current-role");
    return normalizeCrewRole(stored);
  } catch {
    return "ELETTRICISTA";
  }
}

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function splitLinesKeepEmpties(s) {
  return String(s || "").split(/\r?\n/);
}

function splitLinesNonEmpty(s) {
  return String(s || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function joinLines(lines) {
  return (Array.isArray(lines) ? lines : []).map((x) => String(x ?? "")).join("\n");
}

function normalizeOperatorLabel(label) {
  const s = String(label || "")
    .replace(/\s+/g, " ")
    .trim();
  return s.replace(/^\*\s*/, "").trim();
}

function safeLower(s) {
  return String(s || "").toLowerCase();
}

/**
 * Tempo parsing (canonical KPI):
 * - Accept "8", "8.0", "8,5"
 * - Reject non-numeric tokens
 */
function parseTempoToHours(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const normalized = s.replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return n;
}

/**
 * Legacy normalization:
 * Align tempo lines to operator lines (keep empties, pad/truncate).
 * This prevents op/tempo getting desynced when user edits legacy fields.
 */
function normalizeLegacyTempoAlignment(operatoriText, tempoText) {
  const opLines = splitLinesKeepEmpties(operatoriText);
  const tmLines = splitLinesKeepEmpties(tempoText);

  const targetLen = Math.max(opLines.length, tmLines.length, 0);
  const paddedOps = opLines.concat(Array(Math.max(0, targetLen - opLines.length)).fill(""));
  const paddedTm = tmLines.concat(Array(Math.max(0, targetLen - tmLines.length)).fill(""));

  // Hard cap: if operator lines are clearly the intended source, trim tempo to match.
  // We match by raw length (not nonempty) to preserve user’s intended positioning.
  const finalLen = paddedOps.length;
  return joinLines(paddedTm.slice(0, finalLen));
}

function modalWrapClass() {
  return "fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center";
}
function modalOverlayClass() {
  return "absolute inset-0 bg-black/70";
}
function modalPanelClass() {
  return [
    "relative w-full sm:w-[min(760px,96vw)]",
    "rounded-t-3xl sm:rounded-3xl border border-slate-800",
    "bg-slate-950 shadow-[0_-40px_120px_rgba(0,0,0,0.70)]",
    "px-4 pb-4 pt-4",
  ].join(" ");
}

/** Tempo options (CNCS-safe): 0..12 step 0.5 + common integers */
function buildTempoOptions() {
  const out = [];
  for (let v = 0; v <= 12; v += 0.5) {
    const s = Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
    out.push({ label: s, value: s });
  }
  return out;
}

export default function RapportinoPage() {
  const { shipId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // from AppShell (optional)
  useOutletContext() || {};

  const [crewRole, setCrewRole] = useState(() => readRoleFromLocalStorage());
  const normalizedCrewRole = normalizeCrewRole(crewRole);
  const crewLabel = CREW_LABELS[normalizedCrewRole] || normalizedCrewRole;

  const [costr, setCostr] = useState("");
  const [commessa, setCommessa] = useState("");
  const [rapportinoId, setRapportinoId] = useState(null);
  const [reportDate, setReportDate] = useState(getTodayISO());
  const [status, setStatus] = useState("DRAFT");

  const [rapportinoCrewRole, setRapportinoCrewRole] = useState(null);
  const [rows, setRows] = useState(() => {
    const base = getBaseRows(normalizedCrewRole);
    return base.map((r) => ({ ...r, operator_items: [] }));
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // RETURNED inbox
  const [returnedCount, setReturnedCount] = useState(0);
  const [latestReturned, setLatestReturned] = useState(null);
  const [returnedLoading, setReturnedLoading] = useState(false);

  // INCA collapsible
  const [incaOpen, setIncaOpen] = useState(false);

  // Operator picker modal
  const [opModalOpen, setOpModalOpen] = useState(false);
  const [opModalRowIndex, setOpModalRowIndex] = useState(null);
  const [opListLoading, setOpListLoading] = useState(false);
  const [opListErr, setOpListErr] = useState("");
  const [opQuery, setOpQuery] = useState("");
  const [opList, setOpList] = useState([]);

  // Tempo picker modal (NEW)
  const [tmModalOpen, setTmModalOpen] = useState(false);
  const [tmModalRowIndex, setTmModalRowIndex] = useState(null);
  const [tmOptions] = useState(() => buildTempoOptions());

  const capoName = useMemo(() => {
    return (profile?.display_name || profile?.full_name || profile?.email || "Capo Squadra")
      .toUpperCase()
      .trim();
  }, [profile]);

  const statusLabel = STATUS_LABELS[status] || status;

  const formatDateIt = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return iso;
    }
  };

  const prodottoTotale = useMemo(() => {
    return rows.reduce((sum, r) => {
      const v = parseNumeric(r.prodotto);
      return sum + (v || 0);
    }, 0);
  }, [rows]);

  const canEditInca = !!rapportinoId && (status === "DRAFT" || status === "RETURNED");

  // gating INCA strict: only ELETTRICISTA
  const effectiveCrewRoleForInca = useMemo(() => {
    const fromRap = normalizeCrewRole(rapportinoCrewRole);
    if (rapportinoCrewRole) return fromRap;
    return readRoleFromLocalStorage();
  }, [rapportinoCrewRole]);

  const showIncaBlock = effectiveCrewRoleForInca === "ELETTRICISTA";

  useEffect(() => {
    setIncaOpen(false);
  }, [reportDate, normalizedCrewRole]);

  const loadReturnedInbox = async () => {
    if (!profile?.id) {
      setReturnedCount(0);
      setLatestReturned(null);
      return;
    }

    setReturnedLoading(true);
    try {
      const { count, error: countError } = await supabase
        .from("rapportini")
        .select("id", { count: "exact", head: true })
        .eq("capo_id", profile.id)
        .eq("crew_role", normalizedCrewRole)
        .eq("status", "RETURNED");

      if (countError) throw countError;

      const { data: last, error: lastError } = await supabase
        .from("rapportini")
        .select("id, report_date, costr, commessa, updated_at")
        .eq("capo_id", profile.id)
        .eq("crew_role", normalizedCrewRole)
        .eq("status", "RETURNED")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastError && lastError.code !== "PGRST116") throw lastError;

      setReturnedCount(Number(count || 0));
      setLatestReturned(last || null);
    } catch (e) {
      console.warn("[Rapportino] returned inbox load failed:", e);
      setReturnedCount(0);
      setLatestReturned(null);
    } finally {
      setReturnedLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await loadReturnedInbox();
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, normalizedCrewRole]);

  /**
   * Load a rapportino + rows + canonical row operators.
   */
  useEffect(() => {
    let active = true;

    async function loadRapportino() {
      if (!profile?.id) {
        setInitialLoading(false);
        return;
      }

      try {
        setLoading(true);
        setInitialLoading(true);
        setError(null);
        setErrorDetails(null);
        setShowErrorDetails(false);
        setSuccessMessage(null);

        const { data: rap, error: rapError } = await supabase
          .from("rapportini")
          .select("*")
          .eq("capo_id", profile.id)
          .eq("crew_role", normalizedCrewRole)
          .eq("report_date", reportDate)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rapError && rapError.code !== "PGRST116") throw rapError;
        if (!active) return;

        if (!rap) {
          setRapportinoId(null);
          setRapportinoCrewRole(null);
          setCostr("");
          setCommessa("");
          setStatus("DRAFT");
          const base = getBaseRows(normalizedCrewRole).map((r) => ({ ...r, operator_items: [] }));
          setRows(base);
          return;
        }

        setRapportinoId(rap.id);
        setRapportinoCrewRole(rap.crew_role || null);

        setCostr(rap.costr || "");
        setCommessa(rap.commessa || "");
        setStatus(rap.status || "DRAFT");

        const { data: righe, error: rowsError } = await supabase
          .from("rapportino_rows")
          .select("*")
          .eq("rapportino_id", rap.id)
          .order("row_index", { ascending: true });

        if (rowsError) throw rowsError;
        if (!active) return;

        if (!righe || righe.length === 0) {
          const base = getBaseRows(normalizedCrewRole).map((r) => ({ ...r, operator_items: [] }));
          setRows(base);
          return;
        }

        const rowIds = righe.map((x) => x.id).filter(Boolean);
        let opByRowId = new Map();

        if (rowIds.length > 0) {
          const { data: rops, error: ropsErr } = await supabase
            .from("rapportino_row_operators")
            .select(
              "rapportino_row_id, operator_id, line_index, tempo_raw, tempo_hours, operators ( id, cognome, nome, name )"
            )
            .in("rapportino_row_id", rowIds)
            .order("line_index", { ascending: true });

          if (ropsErr) throw ropsErr;

          const map = new Map();
          for (const it of rops || []) {
            const rid = it.rapportino_row_id;
            if (!map.has(rid)) map.set(rid, []);
            const o = it.operators || {};
            const display = normalizeOperatorLabel(
              [o.cognome, o.nome].filter(Boolean).join(" ").trim() || o.name || ""
            );
            map.get(rid).push({
              operator_id: it.operator_id,
              label: display,
              tempo_raw: it.tempo_raw ?? "",
              tempo_hours: it.tempo_hours ?? null,
              line_index: it.line_index ?? 0,
            });
          }
          opByRowId = map;
        }

        const mapped = righe.map((r, idx) => {
          const canonicalItems = opByRowId.get(r.id) || [];
          if (canonicalItems.length > 0) {
            const labels = canonicalItems.map((x) => x.label || "");
            const tempos = canonicalItems.map((x) => {
              if (x.tempo_raw && String(x.tempo_raw).trim()) return String(x.tempo_raw);
              if (x.tempo_hours !== null && x.tempo_hours !== undefined) return String(x.tempo_hours).replace(".", ",");
              return "";
            });

            return {
              id: r.id,
              row_index: r.row_index ?? idx,
              categoria: r.categoria ?? "",
              descrizione: r.descrizione ?? "",
              operatori: joinLines(labels),
              tempo: joinLines(tempos),
              previsto: r.previsto !== null && r.previsto !== undefined ? String(r.previsto) : "",
              prodotto: r.prodotto !== null && r.prodotto !== undefined ? String(r.prodotto) : "",
              note: r.note ?? "",
              operator_items: canonicalItems,
            };
          }

          // legacy
          return {
            id: r.id,
            row_index: r.row_index ?? idx,
            categoria: r.categoria ?? "",
            descrizione: r.descrizione ?? "",
            operatori: r.operatori ?? "",
            tempo: normalizeLegacyTempoAlignment(r.operatori ?? "", r.tempo ?? ""),
            previsto: r.previsto !== null && r.previsto !== undefined ? String(r.previsto) : "",
            prodotto: r.prodotto !== null && r.prodotto !== undefined ? String(r.prodotto) : "",
            note: r.note ?? "",
            operator_items: [],
          };
        });

        setRows(mapped);
      } catch (err) {
        console.error("[Rapportino] load error:", err);
        setError("Errore nel caricamento del rapportino.");
        setErrorDetails(err?.message || String(err));
      } finally {
        if (active) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    }

    loadRapportino();
    return () => {
      active = false;
    };
  }, [profile?.id, normalizedCrewRole, reportDate]);

  const handleRowChange = (index, field, value, targetForHeight) => {
    setRows((prev) => {
      const copy = [...prev];
      const row = { ...copy[index] };

      // Legacy guard: if user edits operatori or tempo manually (no operator_items), keep alignment.
      if (field === "operatori" && (!row.operator_items || row.operator_items.length === 0)) {
        row.operatori = value;
        row.tempo = normalizeLegacyTempoAlignment(value, row.tempo || "");
      } else if (field === "tempo" && (!row.operator_items || row.operator_items.length === 0)) {
        row.tempo = normalizeLegacyTempoAlignment(row.operatori || "", value);
      } else {
        row[field] = value;
      }

      copy[index] = row;
      return copy;
    });

    if (targetForHeight) {
      adjustOperatorTempoHeights(targetForHeight);
    }
  };

  const handleAddRow = () => {
    setRows((prev) => {
      const nextIndex = prev.length;
      const baseCategoria =
        normalizedCrewRole === "CARPENTERIA"
          ? "CARPENTERIA"
          : normalizedCrewRole === "MONTAGGIO"
          ? "MONTAGGIO"
          : "STESURA";

      return [
        ...prev,
        {
          id: null,
          row_index: nextIndex,
          categoria: baseCategoria,
          descrizione: "",
          operatori: "",
          tempo: "",
          previsto: "",
          prodotto: "",
          note: "",
          operator_items: [],
        },
      ];
    });
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => {
      if (prev.length === 1) {
        const base = getBaseRows(normalizedCrewRole).map((r) => ({ ...r, operator_items: [] }));
        return base;
      }
      const copy = [...prev];
      copy.splice(index, 1);
      return copy.map((r, idx) => ({ ...r, row_index: idx }));
    });
  };

  function buildCanonicalItemsFromRow(row) {
    const items = Array.isArray(row?.operator_items) ? row.operator_items : [];
    if (items.length > 0) {
      return items
        .slice()
        .sort((a, b) => (a.line_index ?? 0) - (b.line_index ?? 0))
        .map((it, idx) => ({
          operator_id: it.operator_id,
          label: normalizeOperatorLabel(it.label || ""),
          tempo_raw: String(it.tempo_raw ?? "").trim(),
          tempo_hours: parseTempoToHours(it.tempo_raw ?? it.tempo_hours),
          line_index: idx,
        }))
        .filter((x) => !!x.operator_id);
    }
    return [];
  }

  // ===== Operators Today (modal) — use capo_my_team_v2 (operator_id + cognome/nome)
  const loadTodayOperators = async () => {
    setOpListLoading(true);
    setOpListErr("");
    try {
      const { data, error } = await supabase
        .from("capo_my_team_v2")
        .select("operator_id, operator_display_name, operator_position, cognome, nome");

      if (error) throw error;

      const raw = Array.isArray(data) ? data : [];
      const mapped = raw
        .map((r) => {
          const id = r.operator_id || null;
          const name = normalizeOperatorLabel(r.operator_display_name || "");
          const position = r.operator_position ?? null;
          if (!id || !name) return null;
          return { id, name, position, raw: r };
        })
        .filter(Boolean);

      mapped.sort((a, b) => {
        const ap = a.position;
        const bp = b.position;
        const aHas = ap !== null && ap !== undefined;
        const bHas = bp !== null && bp !== undefined;

        if (aHas && bHas && ap !== bp) return ap - bp;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;

        const an = safeLower(a.name);
        const bn = safeLower(b.name);
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });

      const seen = new Set();
      const dedup = [];
      for (const it of mapped) {
        const k = String(it.id);
        if (seen.has(k)) continue;
        seen.add(k);
        dedup.push(it);
      }

      setOpList(dedup);
    } catch (e) {
      console.error("[RapportinoPage] loadTodayOperators error:", e);
      setOpListErr("Impossibile caricare gli operatori di oggi.");
      setOpList([]);
    } finally {
      setOpListLoading(false);
    }
  };

  const openOperatorPickerForRow = async (rowIndex) => {
    setOpModalRowIndex(rowIndex);
    setOpModalOpen(true);
    setOpQuery("");
    await loadTodayOperators();
  };

  const closeOperatorPicker = () => {
    setOpModalOpen(false);
    setOpModalRowIndex(null);
    setOpQuery("");
    setOpList([]);
    setOpListErr("");
    setOpListLoading(false);
  };

  // TEMPO modal open/close
  const openTempoPickerForRow = (rowIndex) => {
    setTmModalRowIndex(rowIndex);
    setTmModalOpen(true);
  };

  const closeTempoPicker = () => {
    setTmModalOpen(false);
    setTmModalRowIndex(null);
  };

  /**
   * Canonical add (operator_id)
   */
  const addOperatorToRow = (rowIndex, operator) => {
    if (rowIndex == null) return;
    const operator_id = operator?.id || null;
    const label = normalizeOperatorLabel(operator?.name || "");
    if (!operator_id || !label) return;

    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[rowIndex] };

      const items = Array.isArray(row.operator_items) ? row.operator_items.slice() : [];
      const exists = items.some((x) => String(x.operator_id) === String(operator_id));

      if (!exists) {
        const nextIndex = items.length;
        items.push({
          operator_id,
          label,
          tempo_raw: "",
          tempo_hours: null,
          line_index: nextIndex,
        });
      }

      // derive legacy text deterministically from items
      row.operator_items = items.map((it, idx) => ({ ...it, line_index: idx }));
      row.operatori = joinLines(row.operator_items.map((x) => x.label || ""));
      row.tempo = joinLines(row.operator_items.map((x) => String(x.tempo_raw ?? "")));

      next[rowIndex] = row;
      return next;
    });
  };

  /**
   * Canonical tempo set by line index (modal-driven)
   * CNCS-safe: only numeric options, no "." possible.
   */
  const setCanonicalTempoForLine = (rowIndex, lineIndex, tempoRaw) => {
    const raw = String(tempoRaw ?? "").trim();
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[rowIndex] };
      const items = Array.isArray(row.operator_items) ? row.operator_items.slice() : [];

      if (items.length === 0) return prev;
      if (lineIndex < 0 || lineIndex >= items.length) return prev;

      const patched = items.map((it, idx) => {
        if (idx !== lineIndex) return { ...it, line_index: idx };
        const hours = parseTempoToHours(raw);
        return { ...it, tempo_raw: raw, tempo_hours: hours, line_index: idx };
      });

      row.operator_items = patched;
      row.operatori = joinLines(patched.map((x) => x.label || ""));
      row.tempo = joinLines(patched.map((x) => String(x.tempo_raw ?? "")));

      next[rowIndex] = row;
      return next;
    });
  };

  /**
   * Legacy tempo change handler (kept for compatibility)
   */
  const handleTempoChange = (rowIndex, value, targetForHeight) => {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[rowIndex] };

      const items = Array.isArray(row.operator_items) ? row.operator_items.slice() : [];

      // If canonical, do not allow free edit (should never happen; table does not render textarea).
      if (items.length > 0) return prev;

      row.tempo = normalizeLegacyTempoAlignment(row.operatori || "", value);
      next[rowIndex] = row;
      return next;
    });

    if (targetForHeight) adjustOperatorTempoHeights(targetForHeight);
  };

  const filteredOpList = useMemo(() => {
    const qq = (opQuery || "").trim().toLowerCase();
    if (!qq) return opList;
    return opList.filter((x) => (x.name || "").toLowerCase().includes(qq));
  }, [opList, opQuery]);

  // ===== Save / Validate / Print (unchanged logic, but canonical tempo now stable)
  const handleSave = async (forcedStatus) => {
    if (!profile?.id) return false;

    setSaving(true);
    setError(null);
    setErrorDetails(null);
    setShowErrorDetails(false);
    setSuccessMessage(null);

    try {
      const newStatus = forcedStatus || status || "DRAFT";

      const cleanRows = rows.map((r, idx) => {
        const canonical = buildCanonicalItemsFromRow(r);

        const operatoriText =
          canonical.length > 0 ? joinLines(canonical.map((x) => x.label)) : String(r.operatori || "").trim();

        // Canonical source of truth: tempo_raw per operator index.
        // Legacy: align to operatori.
        const tempoText =
          canonical.length > 0
            ? joinLines(canonical.map((x) => String(x.tempo_raw || "").trim()))
            : normalizeLegacyTempoAlignment(operatoriText, String(r.tempo || "").trim());

        return {
          categoria: (r.categoria || "").trim(),
          descrizione: (r.descrizione || "").trim(),
          operatori: operatoriText,
          tempo: tempoText,
          previsto: parseNumeric(r.previsto),
          prodotto: parseNumeric(r.prodotto),
          note: (r.note || "").trim(),
          row_index: idx,
          __canonical_items: canonical,
        };
      });

      let newId = rapportinoId;

      if (!newId) {
        const { data: inserted, error: insertError } = await supabase
          .from("rapportini")
          .insert({
            capo_id: profile.id,
            crew_role: normalizedCrewRole,
            report_date: reportDate,
            data: reportDate,
            costr,
            commessa,
            status: newStatus,
            prodotto_totale: prodottoTotale,
          })
          .select("*")
          .single();

        if (insertError) throw insertError;

        newId = inserted.id;
        setRapportinoId(inserted.id);
        setRapportinoCrewRole(inserted.crew_role || normalizedCrewRole);
      } else {
        const { error: updateError } = await supabase
          .from("rapportini")
          .update({
            costr,
            commessa,
            status: newStatus,
            prodotto_totale: prodottoTotale,
            report_date: reportDate,
            data: reportDate,
          })
          .eq("id", newId);

        if (updateError) throw updateError;

        const { error: deleteError } = await supabase.from("rapportino_rows").delete().eq("rapportino_id", newId);

        if (deleteError) throw deleteError;
      }

      let insertedRows = [];
      if (cleanRows.length > 0) {
        const rowsToInsert = cleanRows.map((r) => ({
          categoria: r.categoria,
          descrizione: r.descrizione,
          operatori: r.operatori,
          tempo: r.tempo,
          previsto: r.previsto,
          prodotto: r.prodotto,
          note: r.note,
          row_index: r.row_index,
          rapportino_id: newId,
        }));

        const { data: rrInserted, error: insertRowsError } = await supabase
          .from("rapportino_rows")
          .insert(rowsToInsert)
          .select("id, row_index")
          .order("row_index", { ascending: true });

        if (insertRowsError) throw insertRowsError;
        insertedRows = Array.isArray(rrInserted) ? rrInserted : [];
      }

      if (insertedRows.length > 0) {
        const byIndex = new Map(insertedRows.map((x) => [x.row_index, x.id]));

        const canonicalInserts = [];
        for (const r of cleanRows) {
          const rowId = byIndex.get(r.row_index);
          if (!rowId) continue;

          const canon = r.__canonical_items || [];
          if (!Array.isArray(canon) || canon.length === 0) continue;

          for (const it of canon) {
            canonicalInserts.push({
              rapportino_row_id: rowId,
              operator_id: it.operator_id,
              line_index: it.line_index ?? 0,
              tempo_raw: it.tempo_raw ?? "",
              tempo_hours: it.tempo_hours ?? null,
            });
          }
        }

        if (canonicalInserts.length > 0) {
          const { error: canonErr } = await supabase.from("rapportino_row_operators").insert(canonicalInserts);
          if (canonErr) throw canonErr;
        }
      }

      setStatus(newStatus);
      setSuccessMessage("Salvataggio riuscito.");
      await loadReturnedInbox();
      return true;
    } catch (err) {
      console.error("Errore salvataggio rapportino:", err);
      setError("Errore durante il salvataggio del rapportino.");
      setErrorDetails(err?.message || String(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    await handleSave("VALIDATED_CAPO");
  };

  const handlePrint = async () => {
    const ok = await handleSave(status);
    if (!ok) return;

    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.warn("Print failed:", e);
      }
    }, 120);
  };

  if (initialLoading || loading) {
    return <LoadingScreen message="Caricamento del rapportino in corso." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-lg border p-5">
          <div className="font-semibold text-red-700">{error}</div>
          {errorDetails && (
            <pre className="mt-3 text-xs bg-slate-50 text-slate-800 p-2 rounded border whitespace-pre-wrap">
              {errorDetails}
            </pre>
          )}
          <button className="mt-4 px-3 py-2 rounded bg-slate-900 text-white" onClick={() => navigate(-1)}>
            Torna indietro
          </button>
        </div>
      </div>
    );
  }

  const currentTempoRow = tmModalRowIndex != null ? rows[tmModalRowIndex] : null;
  const currentTempoItems = Array.isArray(currentTempoRow?.operator_items) ? currentTempoRow.operator_items : [];
  const hasCanonicalTempo = currentTempoItems.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900/80">
      <main className="flex-1 px-2 md:px-4 py-4 md:py-6">
        {/* Banner RETURNED */}
        {latestReturned && returnedCount > 0 && (
          <div className="no-print w-full px-0 mb-4">
            <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-slate-900/60 to-slate-900/60 p-3 md:p-3.5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                      Rimandato
                    </span>
                    <span className="text-[11px] text-slate-300">{returnedCount} in attesa</span>
                  </div>

                  <div className="mt-1 text-[12px] md:text-[13px] text-slate-100 font-semibold truncate">
                    {formatDateIt(latestReturned.report_date)} · COSTR {latestReturned.costr || "—"}
                    {latestReturned.commessa ? ` / ${latestReturned.commessa}` : ""}
                  </div>

                  <div className="mt-0.5 text-[11px] text-slate-300">
                    {rapportinoId === latestReturned.id && status === "RETURNED"
                      ? "Documento aperto: correggi e salva, poi valida."
                      : "Documento rimandato dall'Ufficio: apri e correggi."}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={rapportinoId === latestReturned.id && status === "RETURNED"}
                    onClick={() => {
                      setError(null);
                      setErrorDetails(null);
                      setShowErrorDetails(false);
                      setSuccessMessage(null);
                      if (latestReturned?.report_date) setReportDate(latestReturned.report_date);
                    }}
                    className={
                      "px-3 py-1.5 rounded-full border text-[11px] font-semibold tracking-[0.06em] transition-colors " +
                      (rapportinoId === latestReturned.id && status === "RETURNED"
                        ? "border-slate-700 text-slate-400 bg-slate-900/40"
                        : "border-amber-300/40 text-amber-100 bg-amber-500/15 hover:bg-amber-500/25")
                    }
                  >
                    Apri e correggi
                  </button>

                  {returnedLoading && <span className="text-[11px] text-slate-400">Aggiornamento…</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <div
            id="rapportino-document"
            className={cn(
              "rapportino-document bg-white text-slate-900 border border-slate-200",
              "shadow-[0_18px_45px_rgba(0,0,0,0.25)]",
              "w-full"
            )}
            style={{ maxWidth: "min(1280px, 100%)" }}
          >
            <RapportinoHeader
              costr={costr}
              commessa={commessa}
              reportDate={reportDate}
              capoName={capoName}
              onChangeCostr={setCostr}
              onChangeCommessa={setCommessa}
              onChangeDate={setReportDate}
            />

            {/* META */}
            <div className="no-print mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Ruolo:</span> {crewLabel}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-900 border border-slate-200 text-[11px] font-semibold">
                  Stato: {statusLabel}
                </span>
                <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-semibold">
                  Prodotto totale: {prodottoTotale.toFixed(2)}
                </span>
              </div>
            </div>

            <RapportinoTable
              rows={rows}
              onRowChange={(idx, field, value, target) => {
                if (field === "tempo") {
                  handleTempoChange(idx, value, target);
                  return;
                }
                handleRowChange(idx, field, value, target);
              }}
              onRemoveRow={handleRemoveRow}
              onOpenOperatorPicker={openOperatorPickerForRow}
              onOpenTempoPicker={(rowIndex) => openTempoPickerForRow(rowIndex)}
              readOnly={false}
            />

            {/* INCA collapsible */}
            {showIncaBlock ? (
              <div className="mt-5 no-print">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">INCA</div>
                    <div className="text-[12px] text-slate-700">Cavi collegati (collapsible)</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIncaOpen((v) => !v)}
                    className={cn(
                      "rounded-full border px-3 py-2 text-[12px] font-semibold",
                      "border-slate-300 bg-white hover:bg-slate-100"
                    )}
                    title={incaOpen ? "Chiudi INCA" : "Apri INCA"}
                  >
                    {incaOpen ? "Chiudi" : "Apri"}
                  </button>
                </div>

                {incaOpen ? (
                  <div className="mt-3">
                    <RapportinoIncaCaviSection
                      rapportinoId={rapportinoId}
                      reportDate={reportDate}
                      costr={costr}
                      commessa={commessa}
                      canEdit={canEditInca}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] no-print">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-900"
                >
                  + Aggiungi riga
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {saving && <span className="text-slate-500">Salvataggio in corso…</span>}
                {successMessage && <span className="text-emerald-700 font-semibold">{successMessage}</span>}

                {errorDetails && (
                  <button
                    type="button"
                    onClick={() => setShowErrorDetails((v) => !v)}
                    className="px-2 py-1 rounded border border-red-400 text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    Dettagli errore
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-slate-50 hover:bg-slate-800"
                >
                  Salva
                </button>

                <button
                  type="button"
                  onClick={handleValidate}
                  className="px-3 py-1.5 rounded-md border border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Valida giornata
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-md border border-sky-700 bg-sky-600 text-white hover:bg-sky-700"
                  title="Stampa A4 orizzontale (stessa pagina)"
                >
                  Export / Print
                </button>
              </div>
            </div>

            {showErrorDetails && errorDetails && (
              <pre className="mt-3 text-[10px] bg-red-50 text-red-800 p-2 rounded border border-red-200 whitespace-pre-wrap no-print">
                {errorDetails}
              </pre>
            )}
          </div>
        </div>
      </main>

      {/* OPERATOR PICKER MODAL */}
      {opModalOpen ? (
        <div
          className={modalWrapClass()}
          role="dialog"
          aria-modal="true"
          aria-label="Seleziona operatore"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeOperatorPicker();
          }}
        >
          <div className={modalOverlayClass()} />

          <div className={modalPanelClass()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Operatori di oggi</div>
                <div className="mt-1 text-[14px] font-semibold text-slate-50">Tocca per aggiungere nella riga</div>
                <div className="mt-1 text-[12px] text-slate-400">
                  Riga:{" "}
                  <span className="text-slate-200 font-semibold">{opModalRowIndex != null ? opModalRowIndex + 1 : "—"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeOperatorPicker}
                className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/35 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
              >
                Chiudi
              </button>
            </div>

            <div className="mt-4">
              <input
                value={opQuery}
                onChange={(e) => setOpQuery(e.target.value)}
                placeholder="Cerca…"
                className={[
                  "w-full rounded-2xl border",
                  "border-slate-800 bg-slate-950/60",
                  "px-3 py-3 text-[13px] text-slate-50",
                  "placeholder:text-slate-500",
                  "outline-none focus:ring-2 focus:ring-sky-500/35",
                ].join(" ")}
              />
            </div>

            <div className="mt-3">
              {opListErr ? (
                <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
                  {opListErr}
                </div>
              ) : null}

              <div className="mt-2 max-h-[52vh] overflow-auto pr-1 space-y-2">
                {opListLoading ? (
                  <div className="text-[12px] text-slate-400">Caricamento…</div>
                ) : filteredOpList.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-[12px] text-slate-400">
                    Nessun operatore.
                  </div>
                ) : (
                  filteredOpList.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => {
                        if (opModalRowIndex == null) return;
                        addOperatorToRow(opModalRowIndex, it);
                      }}
                      className={[
                        "w-full text-left rounded-2xl border px-3 py-3",
                        "border-slate-800 bg-slate-950/50 hover:bg-slate-900/35",
                        "text-[13px] font-semibold text-slate-50",
                        "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                      ].join(" ")}
                      title="Aggiungi"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">{it.name}</span>
                        <span className="inline-flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="h-2 w-2 rounded-full bg-sky-400/80" />
                          Aggiungi
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeOperatorPicker}
                className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/35 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
              >
                Fine
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* TEMPO PICKER MODAL (NEW, canonical only) */}
      {tmModalOpen ? (
        <div
          className={modalWrapClass()}
          role="dialog"
          aria-modal="true"
          aria-label="Imposta ore"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeTempoPicker();
          }}
        >
          <div className={modalOverlayClass()} />

          <div className={modalPanelClass()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Tempo (ore)</div>
                <div className="mt-1 text-[14px] font-semibold text-slate-50">Imposta ore per operatore</div>
                <div className="mt-1 text-[12px] text-slate-400">
                  Riga:{" "}
                  <span className="text-slate-200 font-semibold">{tmModalRowIndex != null ? tmModalRowIndex + 1 : "—"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeTempoPicker}
                className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/35 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
              >
                Chiudi
              </button>
            </div>

            {!hasCanonicalTempo ? (
              <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
                Nessun operatore canonico in questa riga. Prima aggiungi almeno un operatore.
              </div>
            ) : (
              <div className="mt-4 space-y-3 max-h-[58vh] overflow-auto pr-1">
                {currentTempoItems.map((it, lineIndex) => {
                  const label = normalizeOperatorLabel(it?.label || "");
                  const currentRaw = String(it?.tempo_raw ?? "").trim();

                  return (
                    <div
                      key={`${String(it.operator_id || "op")}-${lineIndex}`}
                      className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-slate-50 truncate">{label || "Operatore"}</div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            Ore attuali:{" "}
                            <span className="text-slate-200 font-semibold">{currentRaw ? currentRaw : "—"}</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500">#{lineIndex + 1}</div>
                      </div>

                      <div className="mt-3 grid grid-cols-6 sm:grid-cols-8 gap-2">
                        {tmOptions.map((opt) => {
                          const active = opt.value === currentRaw;
                          return (
                            <button
                              key={`${lineIndex}-${opt.value}`}
                              type="button"
                              onClick={() => setCanonicalTempoForLine(tmModalRowIndex, lineIndex, opt.value)}
                              className={[
                                "rounded-xl border px-2 py-2 text-[12px] font-semibold",
                                active
                                  ? "border-sky-500/50 bg-sky-500/15 text-sky-100"
                                  : "border-slate-800 bg-slate-950/35 text-slate-100 hover:bg-slate-900/35",
                                "focus:outline-none focus:ring-2 focus:ring-sky-500/35",
                              ].join(" ")}
                              title="Imposta"
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setCanonicalTempoForLine(tmModalRowIndex, lineIndex, "")}
                          className="rounded-full border border-slate-800 bg-slate-950/35 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-900/35"
                          title="Svuota"
                        >
                          Svuota
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeTempoPicker}
                className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/35 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
              >
                Fine
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
