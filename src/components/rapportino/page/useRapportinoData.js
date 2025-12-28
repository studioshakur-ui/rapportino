// /src/components/rapportino/page/useRapportinoData.js
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { parseNumeric } from "../../../rapportinoUtils";
import { normalizeLegacyTempoAlignment, normalizeOperatorLabel } from "./rapportinoHelpers";

/**
 * useRapportinoData — hardened, no-regress
 *
 * Goal:
 * - Load rapportino + rows
 * - HYDRATE canonical operator_items from rapportino_row_operators (if present)
 * - Rebuild row.operatori + row.tempo from canonical items (strict alignment)
 * - If no canonical data exists for a row, keep legacy behavior (and keep legacy tempo alignment safe)
 *
 * Contract used by RapportinoPage.jsx:
 * returns:
 *  - rapportinoId, setRapportinoId
 *  - rapportinoCrewRole, setRapportinoCrewRole
 *  - costr, setCostr
 *  - commessa, setCommessa
 *  - status, setStatus
 *  - rows, setRows
 *  - loading, initialLoading
 *  - error, errorDetails, showError
 *  - effectiveCrewRoleForInca
 */

function safeStr(v) {
  return String(v ?? "").trim();
}

function buildOperatorLabelFromOperatorRow(op) {
  if (!op) return "";
  const cognome = safeStr(op.cognome);
  const nome = safeStr(op.nome);
  if (cognome || nome) return normalizeOperatorLabel(`${cognome} ${nome}`.trim());
  return normalizeOperatorLabel(op.name || "");
}

function joinLines(lines) {
  return (Array.isArray(lines) ? lines : []).map((x) => String(x ?? "")).join("\n");
}

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function normalizeStatus(s) {
  const v = safeStr(s).toUpperCase();
  if (!v) return "DRAFT";
  return v;
}

export function useRapportinoData({ profileId, crewRole, reportDate }) {
  const [rapportinoId, setRapportinoId] = useState(null);
  const [rapportinoCrewRole, setRapportinoCrewRole] = useState(null);

  const [costr, setCostr] = useState("");
  const [commessa, setCommessa] = useState("");

  const [status, setStatus] = useState("DRAFT");
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [showError, setShowError] = useState(false);

  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const effectiveCrewRoleForInca = useMemo(() => {
    // for now: INCA block is only for ELETTRICISTA in your page logic
    return crewRole || "ELETTRICISTA";
  }, [crewRole]);

  useEffect(() => {
    const ac = new AbortController();

    async function run() {
      setShowError(false);
      setError("");
      setErrorDetails("");

      // Guard: no profile -> nothing to load yet
      if (!profileId || !reportDate) {
        setInitialLoading(false);
        setLoading(false);
        setRapportinoId(null);
        setRapportinoCrewRole(null);
        setCostr("");
        setCommessa("");
        setStatus("DRAFT");
        setRows([]);
        return;
      }

      setLoading(true);

      try {
        // 1) Find the rapportino for this CAPO + crewRole + reportDate
        const { data: rData, error: rErr } = await supabase
          .from("rapportini")
          .select("id, crew_role, report_date, data, costr, commessa, status, prodotto_totale, created_at, updated_at")
          .eq("capo_id", profileId)
          .eq("crew_role", crewRole)
          .eq("report_date", reportDate)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .abortSignal(ac.signal);

        if (rErr) throw rErr;

        if (!aliveRef.current) return;

        if (!rData?.id) {
          // No rapportino yet: keep local editable empty doc
          setRapportinoId(null);
          setRapportinoCrewRole(crewRole);
          setCostr("");
          setCommessa("");
          setStatus("DRAFT");
          setRows([
            { id: null, row_index: 0, categoria: "STESURA", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "", activity_id: null, operator_items: [] },
            { id: null, row_index: 1, categoria: "STESURA", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "", activity_id: null, operator_items: [] },
            { id: null, row_index: 2, categoria: "STESURA", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "", activity_id: null, operator_items: [] },
          ]);
          setInitialLoading(false);
          return;
        }

        // 2) Load rows
        const rid = rData.id;

        const { data: rowsData, error: rowsErr } = await supabase
          .from("rapportino_rows")
          .select("id, rapportino_id, row_index, categoria, descrizione, operatori, tempo, previsto, prodotto, note, activity_id")
          .eq("rapportino_id", rid)
          .order("row_index", { ascending: true })
          .abortSignal(ac.signal);

        if (rowsErr) throw rowsErr;

        if (!aliveRef.current) return;

        const baseRows = (Array.isArray(rowsData) ? rowsData : []).map((r) => ({
          id: r.id ?? null,
          rapportino_id: r.rapportino_id ?? rid,
          row_index: typeof r.row_index === "number" ? r.row_index : 0,
          categoria: r.categoria ?? "",
          descrizione: r.descrizione ?? "",
          operatori: r.operatori ?? "",
          tempo: r.tempo ?? "",
          previsto: r.previsto ?? "",
          prodotto: r.prodotto ?? "",
          note: r.note ?? "",
          activity_id: r.activity_id ?? null,
          operator_items: [], // hydrated below if canonical exists
        }));

        // 3) Hydrate canonical operator_items from rapportino_row_operators (if any)
        const rowIds = baseRows.map((x) => x.id).filter(Boolean);

        let opById = new Map();
        let roByRowId = new Map(); // row_id -> [{operator_id,line_index,tempo_raw,tempo_hours}...]

        if (rowIds.length > 0) {
          const { data: roData, error: roErr } = await supabase
            .from("rapportino_row_operators")
            .select("rapportino_row_id, operator_id, line_index, tempo_raw, tempo_hours")
            .in("rapportino_row_id", rowIds)
            .order("rapportino_row_id", { ascending: true })
            .order("line_index", { ascending: true })
            .abortSignal(ac.signal);

          if (roErr) {
            // IMPORTANT: do NOT fail the whole page if canonical table not available yet
            console.warn("[useRapportinoData] rapportino_row_operators read warning:", roErr);
          } else {
            const raw = Array.isArray(roData) ? roData : [];
            const tmp = new Map();
            for (const it of raw) {
              const rowId = it.rapportino_row_id;
              const opId = it.operator_id;
              if (!rowId || !opId) continue;
              const arr = tmp.get(String(rowId)) || [];
              arr.push({
                operator_id: opId,
                line_index: typeof it.line_index === "number" ? it.line_index : 0,
                tempo_raw: safeStr(it.tempo_raw),
                tempo_hours: isFiniteNumber(it.tempo_hours) ? it.tempo_hours : null,
              });
              tmp.set(String(rowId), arr);
            }
            roByRowId = tmp;

            const operatorIds = Array.from(
              new Set(raw.map((x) => x.operator_id).filter(Boolean).map((x) => String(x)))
            );

            if (operatorIds.length > 0) {
              // Operators table is your safest canonical source.
              const { data: opData, error: opErr } = await supabase
                .from("operators")
                .select("id, name, cognome, nome")
                .in("id", operatorIds)
                .abortSignal(ac.signal);

              if (opErr) {
                console.warn("[useRapportinoData] operators read warning:", opErr);
              } else {
                const m = new Map();
                for (const op of opData || []) {
                  if (!op?.id) continue;
                  m.set(String(op.id), op);
                }
                opById = m;
              }
            }
          }
        }

        if (!aliveRef.current) return;

        const hydrated = baseRows.map((r) => {
          const rowId = r.id ? String(r.id) : null;
          const canonical = rowId ? (roByRowId.get(rowId) || []) : [];

          if (canonical.length === 0) {
            // Legacy safe: normalize tempo alignment against operator lines
            const operatoriText = safeStr(r.operatori);
            const tempoText = safeStr(r.tempo);
            return {
              ...r,
              operator_items: [],
              operatori: operatoriText,
              tempo: normalizeLegacyTempoAlignment(operatoriText, tempoText),
            };
          }

          // Canonical: rebuild operator_items + operatori + tempo strictly
          const sorted = canonical
            .slice()
            .sort((a, b) => (a.line_index ?? 0) - (b.line_index ?? 0))
            .map((it, idx) => {
              const op = opById.get(String(it.operator_id));
              const label = buildOperatorLabelFromOperatorRow(op) || normalizeOperatorLabel(String(it.operator_id));
              const tempoRaw = safeStr(it.tempo_raw);
              const tempoHours = isFiniteNumber(it.tempo_hours)
                ? it.tempo_hours
                : (tempoRaw ? parseNumeric(tempoRaw) : null);

              return {
                operator_id: it.operator_id,
                label,
                tempo_raw: tempoRaw,
                tempo_hours: isFiniteNumber(tempoHours) ? tempoHours : null,
                line_index: idx,
              };
            });

          return {
            ...r,
            operator_items: sorted,
            operatori: joinLines(sorted.map((x) => x.label || "")),
            tempo: joinLines(sorted.map((x) => safeStr(x.tempo_raw))),
          };
        });

        setRapportinoId(rid);
        setRapportinoCrewRole(rData.crew_role || crewRole);
        setCostr(rData.costr || "");
        setCommessa(rData.commessa || "");
        setStatus(normalizeStatus(rData.status));
        setRows(hydrated);

        setInitialLoading(false);
      } catch (e) {
        console.error("[useRapportinoData] load error:", e);
        if (!aliveRef.current) return;

        setShowError(true);
        setError("Errore caricamento rapportino.");
        setErrorDetails(e?.message || String(e));
        setInitialLoading(false);
      } finally {
        if (!aliveRef.current) return;
        setLoading(false);
      }
    }

    run();
    return () => ac.abort();
  }, [profileId, crewRole, reportDate]);

  return {
    rapportinoId,
    setRapportinoId,
    rapportinoCrewRole,
    setRapportinoCrewRole,
    costr,
    setCostr,
    commessa,
    setCommessa,
    status,
    setStatus,
    rows,
    setRows,
    loading,
    initialLoading,
    error,
    errorDetails,
    showError,
    effectiveCrewRoleForInca,
  };
}
