// src/components/rapportino/page/useRapportinoData.js
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { parseNumeric } from "../../../rapportinoUtils";
import { normalizeLegacyTempoAlignment, normalizeOperatorLabel } from "./rapportinoHelpers";

/**
 * useRapportinoData — aligned to DB schema
 *
 * Key facts:
 * - rapportini has both `data` (NOT NULL) and `report_date`
 * - rapportino_row_operators columns:
 *   - rapportino_row_id (uuid)  ✅ (NOT rapportino_id / NOT row_id)
 *   - operator_id, line_index, tempo_raw, tempo_hours
 *
 * Behavior:
 * - Load rapportino header by (capo_id, crew_role, report_date)
 * - Load rapportino_rows by rapportino_id
 * - Load canonical operator mapping by IN(rapportino_row_id)
 * - Hydrate each row:
 *   - If canonical exists: build operator_items and rebuild legacy operatori/tempo aligned
 *   - Else: keep legacy operatori/tempo but normalize alignment defensively
 */

type RowRecord = Record<string, unknown>;
type CanonItem = {
  rapportino_row_id?: unknown;
  operator_id?: unknown;
  tempo_raw?: unknown;
  tempo_hours?: unknown;
  line_index?: unknown;
};

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

function joinLines(lines: unknown): string {
  return (Array.isArray(lines) ? lines : []).map((x) => String(x ?? "")).join("\n");
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function normalizeStatus(s: unknown): string {
  const v = safeStr(s).toUpperCase();
  if (!v) return "DRAFT";
  return v;
}

function isAbortError(err: unknown): boolean {
  if (!err) return false;
  const obj = err as Record<string, unknown>;
  const name = String(obj?.name || "").toLowerCase();
  const msg = String(obj?.message || obj?.error_description || obj?.error || "").toLowerCase();
  if (name === "aborterror") return true;
  if (msg.includes("signal is aborted")) return true;
  if (msg.includes("aborted")) return true;
  return false;
}

function buildOperatorLabelFromOperatorRow(op: unknown): string {
  if (!op) return "";
  const obj = op as Record<string, unknown>;
  const cognome = safeStr(obj.cognome);
  const nome = safeStr(obj.nome);
  if (cognome || nome) return normalizeOperatorLabel(`${cognome} ${nome}`.trim());
  return normalizeOperatorLabel(obj.name || "");
}

export function useRapportinoData({
  profileId,
  crewRole,
  reportDate,
}: {
  profileId: unknown;
  crewRole: unknown;
  reportDate: unknown;
}) {
  const [rapportinoId, setRapportinoId] = useState<string | null>(null);
  const [rapportinoCrewRole, setRapportinoCrewRole] = useState<string | null>(null);
  const [rapportinoUpdatedAt, setRapportinoUpdatedAt] = useState<string | null>(null);

  const [costr, setCostr] = useState("");
  const [commessa, setCommessa] = useState("");

  const [status, setStatus] = useState<string>("DRAFT");
  const [rows, setRows] = useState<RowRecord[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  const [error, setError] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [showError, setShowError] = useState<boolean>(false);

  const aliveRef = useRef<boolean>(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const effectiveCrewRoleForInca = useMemo<string>(() => {
    return (crewRole || "ELETTRICISTA") as string;
  }, [crewRole]);

  useEffect(() => {
    const ac = new AbortController();

    async function run() {
      setShowError(false);
      setError("");
      setErrorDetails("");

      if (!profileId || !reportDate) {
        setInitialLoading(false);
        setLoading(false);

        setRapportinoId(null);
        setRapportinoCrewRole(null);
        setRapportinoUpdatedAt(null);

        setCostr("");
        setCommessa("");
        setStatus("DRAFT");
        setRows([]);
        return;
      }

      setLoading(true);

      try {
        // 1) Find rapportino header (CAPO + crew_role + report_date)
        const headerQuery = supabase
          .from("rapportini")
          .select("id, crew_role, report_date, data, costr, commessa, status, prodotto_totale, created_at, updated_at")
          .eq("capo_id", profileId)
          .eq("crew_role", crewRole)
          .eq("report_date", reportDate)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const { data: rData, error: rErr } = await (
          headerQuery as unknown as { abortSignal: (signal: AbortSignal) => typeof headerQuery }
        ).abortSignal(ac.signal);

        if (rErr) throw rErr;

        // No rapportino yet => init empty UI state
        if (!rData?.id) {
          setRapportinoId(null);
        setRapportinoCrewRole(crewRole as string | null);
          setRapportinoUpdatedAt(null);

          setCostr("");
          setCommessa("");
          setStatus("DRAFT");
          setRows([]);
          setInitialLoading(false);
          return;
        }

        const rid = String(rData.id);

        // 2) Load rows
        const rowsQuery = supabase
          .from("rapportino_rows")
          .select("*")
          .eq("rapportino_id", rid)
          .order("position", { ascending: true });
        const { data: rowsData, error: rowsErr } = await (
          rowsQuery as unknown as { abortSignal: (signal: AbortSignal) => typeof rowsQuery }
        ).abortSignal(ac.signal);

        if (rowsErr) throw rowsErr;

        const rowsArr: RowRecord[] = Array.isArray(rowsData) ? (rowsData as RowRecord[]) : [];
        const rowIds = rowsArr
          .map((r) => r?.id)
          .filter(Boolean)
          .map((x) => String(x));

        // 3) Load canonical operator mapping by rapportino_row_id IN (...)
        let canonItems: CanonItem[] = [];
        if (rowIds.length > 0) {
          const roQuery = supabase
            .from("rapportino_row_operators")
            .select("rapportino_row_id, operator_id, tempo_raw, tempo_hours, line_index")
            .in("rapportino_row_id", rowIds)
            .order("rapportino_row_id", { ascending: true })
            .order("line_index", { ascending: true });
          const { data: roData, error: roErr } = await (
            roQuery as unknown as { abortSignal: (signal: AbortSignal) => typeof roQuery }
          ).abortSignal(ac.signal);

          if (roErr) {
            console.warn("[useRapportinoData] rapportino_row_operators read warning:", roErr);
          } else {
            canonItems = Array.isArray(roData) ? (roData as CanonItem[]) : [];
          }
        }

        // 4) Resolve operator labels (best effort)
        const operatorIds = Array.from(
          new Set(
            canonItems
              .map((x) => x?.operator_id)
              .filter(Boolean)
              .map((x) => String(x))
          )
        );

        let operatorsById = new Map<string, Record<string, unknown>>();
        if (operatorIds.length > 0) {
          const opQuery = supabase.from("operators").select("id, name, nome, cognome").in("id", operatorIds);
          const { data: opData, error: opErr } = await (
            opQuery as unknown as { abortSignal: (signal: AbortSignal) => typeof opQuery }
          ).abortSignal(ac.signal);

          if (opErr) {
            console.warn("[useRapportinoData] operators read warning:", opErr);
          } else {
            const ops: Array<Record<string, unknown>> = Array.isArray(opData) ? (opData as Array<Record<string, unknown>>) : [];
            operatorsById = new Map(ops.map((o) => [String(o.id), o]));
          }
        }

        // 5) Group canon items per row id
        const canonByRowId = new Map<string, CanonItem[]>();
        for (const it of canonItems) {
          const rowId = String(it?.rapportino_row_id || "");
          if (!rowId) continue;
          const arr = canonByRowId.get(rowId) || [];
          arr.push(it);
          canonByRowId.set(rowId, arr);
        }

        // 6) Hydrate rows (canonical if mapping exists)
        const hydrated: RowRecord[] = rowsArr.map((r) => {
          const rowId = String(r?.id || "");
          const canonical = canonByRowId.get(rowId) || [];

          // Legacy fallback: keep operatori/tempo but normalize alignment defensively
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

          // Canonical: strict rebuild
          const sorted = canonical
            .slice()
            .sort((a, b) => Number(a?.line_index ?? 0) - Number(b?.line_index ?? 0))
            .map((it, idx) => {
              const op = operatorsById.get(String(it.operator_id));
              const label =
                buildOperatorLabelFromOperatorRow(op) || normalizeOperatorLabel(String(it.operator_id || "Operatore"));

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

        // 7) Commit state
        setRapportinoId(rid);
        setRapportinoCrewRole((rData.crew_role || crewRole) as string | null);
        setRapportinoUpdatedAt(rData.updated_at || null);

        setCostr(rData.costr || "");
        setCommessa(rData.commessa || "");
        setStatus(normalizeStatus(rData.status));
        setRows(hydrated);

        setInitialLoading(false);
      } catch (e) {
        if (isAbortError(e)) return;

        console.error("[useRapportinoData] load error:", e);
        if (!aliveRef.current) return;

        setShowError(true);
        setError("Errore caricamento rapportino.");
          setErrorDetails((e as { message?: string } | null | undefined)?.message || String(e));
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
    rapportinoUpdatedAt,
    setRapportinoUpdatedAt,

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
