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

function isAbortError(err) {
  if (!err) return false;
  const name = String(err?.name || "").toLowerCase();
  const msg = String(err?.message || err?.error_description || err?.error || "").toLowerCase();
  // Supabase/PostgREST may throw AbortError when a request is intentionally cancelled
  // (route change, role/date change, hydration re-run, etc.)
  if (name === "aborterror") return true;
  if (msg.includes("signal is aborted")) return true;
  if (msg.includes("aborted")) return true;
  return false;
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

        // If no rapportino exists, initialize empty
        if (!rData?.id) {
          setRapportinoId(null);
          setRapportinoCrewRole(crewRole);
          setCostr("");
          setCommessa("");
          setStatus("DRAFT");
          setRows([]);
          setInitialLoading(false);
          return;
        }

        const rid = String(rData.id);

        // 2) Load rows
        const { data: rowsData, error: rowsErr } = await supabase
          .from("rapportino_rows")
          .select("*")
          .eq("rapportino_id", rid)
          .order("position", { ascending: true })
          .abortSignal(ac.signal);

        if (rowsErr) throw rowsErr;

        const rowsArr = Array.isArray(rowsData) ? rowsData : [];

        // 3) Load canonical operators mapping (if any)
        const { data: roData, error: roErr } = await supabase
          .from("rapportino_row_operators")
          .select("row_id, operator_id, tempo_raw, tempo_hours, line_index")
          .eq("rapportino_id", rid)
          .order("row_id", { ascending: true })
          .order("line_index", { ascending: true })
          .abortSignal(ac.signal);

        if (roErr) {
          console.warn("[useRapportinoData] rapportino_row_operators read warning:", roErr);
        }

        const canonItems = Array.isArray(roData) ? roData : [];

        // 4) Load operators referenced (to resolve labels) — best effort
        const operatorIds = Array.from(
          new Set(
            canonItems
              .map((x) => x?.operator_id)
              .filter(Boolean)
              .map((x) => String(x))
          )
        );

        let operatorsById = new Map();
        if (operatorIds.length > 0) {
          const { data: opData, error: opErr } = await supabase
            .from("operators")
            .select("id, name, nome, cognome")
            .in("id", operatorIds)
            .abortSignal(ac.signal);

          if (opErr) {
            console.warn("[useRapportinoData] operators read warning:", opErr);
          } else {
            const ops = Array.isArray(opData) ? opData : [];
            operatorsById = new Map(ops.map((o) => [String(o.id), o]));
          }
        }

        const canonByRowId = new Map();
        for (const it of canonItems) {
          const rowId = String(it?.row_id || "");
          if (!rowId) continue;
          const arr = canonByRowId.get(rowId) || [];
          arr.push(it);
          canonByRowId.set(rowId, arr);
        }

        // 5) Hydrate rows: canonical if operator_items exist, else legacy fallback
        const hydrated = rowsArr.map((r) => {
          const rowId = String(r?.id || "");
          const canonical = canonByRowId.get(rowId) || [];

          // Legacy behavior: keep operatori/tempo but fix alignment
          if (!canonical.length) {
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
              const op = operatorsById.get(String(it.operator_id));
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
        // AbortError is expected when requests are cancelled (e.g. params change). It must not surface as a UI error.
        if (isAbortError(e)) return;

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
