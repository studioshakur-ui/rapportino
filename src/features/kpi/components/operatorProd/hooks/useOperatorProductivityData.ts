// src/components/kpi/operatorProd/hooks/useOperatorProductivityData.js
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../../lib/supabaseClient";
import { safeText, toNumber, uniq } from "../utils/kpiHelpers";

type GlobalRow = {
  report_date: string | null;
  operator_id: string | null;
  operator_name: string;
  ore: number;
  previsto_eff: number;
  prodotto: number;
  productivity_index: number | null;
  costr: unknown;
  commessa: unknown;
  manager_id: unknown;
};
type FamilyRow = GlobalRow & {
  categoria: string;
  descrizione: string;
};

export function useOperatorProductivityData({
  profileId,
  scope,
  dateFrom,
  dateTo,
  showCostrCommessaFilters,
  costrFilter,
  commessaFilter,
  selectedIds,
  search,
}: {
  profileId: unknown;
  scope: unknown;
  dateFrom: string | null;
  dateTo: string | null;
  showCostrCommessaFilters: boolean;
  costrFilter: string | null;
  commessaFilter: string | null;
  selectedIds: string[] | null;
  search: string;
}) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [globalRows, setGlobalRows] = useState<GlobalRow[]>([]);
  const [familyRows, setFamilyRows] = useState<FamilyRow[]>([]);

  // Load
  useEffect(() => {
    if (!profileId) return;
    if (!dateFrom || !dateTo) return;

    let alive = true;
    const ac = new AbortController();

    function normalizeGlobal(rows: unknown): GlobalRow[] {
      const list = Array.isArray(rows) ? rows : [];
      return list.map((r) => ({
        report_date: r?.report_date ? String(r.report_date) : null,
        operator_id: r?.operator_id || null,
        operator_name: safeText(r?.operator_name),
        ore: toNumber(r?.total_hours_indexed),
        previsto_eff: toNumber(r?.total_previsto_eff),
        prodotto: toNumber(r?.total_prodotto_alloc),
        productivity_index: r?.productivity_index == null ? null : toNumber(r?.productivity_index),
        costr: r?.costr ?? null,
        commessa: r?.commessa ?? null,
        manager_id: r?.manager_id ?? null,
      }));
    }

    function normalizeFamily(rows: unknown): FamilyRow[] {
      const list = Array.isArray(rows) ? rows : [];
      return list.map((r) => ({
        report_date: r?.report_date ? String(r.report_date) : null,
        operator_id: r?.operator_id || null,
        operator_name: safeText(r?.operator_name),
        categoria: safeText(r?.categoria),
        descrizione: safeText(r?.descrizione),
        ore: toNumber(r?.total_hours_indexed),
        previsto_eff: toNumber(r?.total_previsto_eff),
        prodotto: toNumber(r?.total_prodotto_alloc),
        productivity_index: r?.productivity_index == null ? null : toNumber(r?.productivity_index),
        costr: r?.costr ?? null,
        commessa: r?.commessa ?? null,
        manager_id: r?.manager_id ?? null,
      }));
    }

    async function loadFromView({ view, kind }: { view: string; kind: "GLOBAL" | "FAMILY" }) {
      const isV3 = String(view).endsWith("_v3");

      if (kind === "GLOBAL") {
        let q = supabase
          .from(view)
          .select(
            "report_date, operator_id, operator_name, manager_id, costr, commessa, total_hours_indexed, total_previsto_eff, total_prodotto_alloc, productivity_index" +
              (isV3 ? ", capo_id" : "")
          )
          .gte("report_date", dateFrom)
          .lte("report_date", dateTo)
          .order("report_date", { ascending: true })
          .abortSignal(ac.signal);

        if (scope === "MANAGER") q = q.eq("manager_id", profileId);
        if (scope === "CAPO") {
          if (!isV3) return [];
          q = q.eq("capo_id", profileId);
        }

        if (showCostrCommessaFilters) {
          if (costrFilter) q = q.eq("costr", costrFilter);
          if (commessaFilter) q = q.eq("commessa", commessaFilter);
        } else {
          // Even if the UI filters are hidden, allow fixed filters to be applied.
          if (costrFilter) q = q.eq("costr", costrFilter);
          if (commessaFilter) q = q.eq("commessa", commessaFilter);
        }

        const ids = Array.isArray(selectedIds) ? selectedIds : [];
        if (ids.length > 0 && ids.length <= 250) {
          q = q.in("operator_id", ids);
        }

        const { data, error } = await q;
        if (error) throw error;
        return normalizeGlobal(data);
      }

      // FAMILY
      let q = supabase
        .from(view)
        .select(
          "report_date, operator_id, operator_name, manager_id, costr, commessa, categoria, descrizione, total_hours_indexed, total_previsto_eff, total_prodotto_alloc, productivity_index" +
            (isV3 ? ", capo_id" : "")
        )
        .gte("report_date", dateFrom)
        .lte("report_date", dateTo)
        .order("report_date", { ascending: true })
        .abortSignal(ac.signal);

      if (scope === "MANAGER") q = q.eq("manager_id", profileId);
      if (scope === "CAPO") {
        if (!isV3) return [];
        q = q.eq("capo_id", profileId);
      }

      if (showCostrCommessaFilters) {
        if (costrFilter) q = q.eq("costr", costrFilter);
        if (commessaFilter) q = q.eq("commessa", commessaFilter);
      } else {
        if (costrFilter) q = q.eq("costr", costrFilter);
        if (commessaFilter) q = q.eq("commessa", commessaFilter);
      }

      const ids = Array.isArray(selectedIds) ? selectedIds : [];
      if (ids.length > 0 && ids.length <= 250) {
        q = q.in("operator_id", ids);
      }

      const { data, error } = await q;
      if (error) throw error;
      return normalizeFamily(data);
    }

    async function loadWithFallback<T>({ views, kind }: { views: string[]; kind: "GLOBAL" | "FAMILY" }): Promise<{
      view: string | null;
      rows: T[];
    }> {
      let lastErr = null;
      for (const view of views) {
        try {
          const rows = (await loadFromView({ view, kind })) as T[];
          return { view, rows };
        } catch (e) {
          const msg = String((e as { message?: unknown } | null | undefined)?.message || "");
          const code = String((e as { code?: unknown } | null | undefined)?.code || "");
          lastErr = e;
          // Fallback only for "relation does not exist" cases.
          const isMissingRelation =
            code === "42P01" || /relation .* does not exist/i.test(msg) || /does not exist/i.test(msg);
          if (!isMissingRelation) throw e;
        }
      }
      if (lastErr) throw lastErr;
      return { view: null, rows: [] };
    }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const globalViews = ["kpi_operator_global_day_v3", "kpi_operator_global_day_v2"];
        const familyViews = ["kpi_operator_family_day_v3", "kpi_operator_family_day_v2"];

        const gRes = await loadWithFallback<GlobalRow>({ views: globalViews, kind: "GLOBAL" });
        const fRes = await loadWithFallback<FamilyRow>({ views: familyViews, kind: "FAMILY" });

        if (!alive) return;
        setGlobalRows(Array.isArray(gRes.rows) ? gRes.rows : []);
        setFamilyRows(Array.isArray(fRes.rows) ? fRes.rows : []);
      } catch (e) {
        const msg = String((e as { message?: unknown } | null | undefined)?.message || "");
        const hint = String((e as { hint?: unknown } | null | undefined)?.hint || "");
        const isAbort =
          msg.includes("AbortError") ||
          msg.toLowerCase().includes("aborted") ||
          hint.toLowerCase().includes("aborted");
        if (isAbort) return;
        console.error("[useOperatorProductivityData] load error:", e);
        if (!alive) return;
        setError(
          (e as { message?: string } | null | undefined)?.message ||
            "Errore nel caricamento KPI operatori. Verifica view kpi_operator_global_day_v2/v3 / kpi_operator_family_day_v2/v3 e RLS."
        );
        setGlobalRows([]);
        setFamilyRows([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [
    profileId,
    scope,
    dateFrom,
    dateTo,
    showCostrCommessaFilters,
    costrFilter,
    commessaFilter,
    selectedIds,
  ]);

  const operators = useMemo(() => {
    const m = new Map<string, { operator_id: string; operator_name: string }>();
    (globalRows || []).forEach((r) => {
      const id = r?.operator_id || null;
      if (!id) return;
      const name = safeText(r?.operator_name);
      if (!m.has(id)) m.set(id, { operator_id: id, operator_name: name });
      else {
        const prev = m.get(id);
        if ((prev?.operator_name || "—") === "—" && name !== "—") m.set(id, { operator_id: id, operator_name: name });
      }
    });
    return Array.from(m.values()).sort((a, b) =>
      String(a.operator_name || "").localeCompare(String(b.operator_name || ""))
    );
  }, [globalRows]);

  const filteredOperators = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return operators;
    return (operators || []).filter((o) => String(o.operator_name || "").toLowerCase().includes(q));
  }, [operators, search]);

    const selectedSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);

  const perOperator = useMemo(() => {
    const m = new Map<string, {
      operator_id: string;
      operator_name: string;
      ore_sum: number;
      prodotto_sum: number;
      previsto_eff_sum: number;
      days_set: Set<string>;
    }>();

    (globalRows || []).forEach((r) => {
      const opId = r?.operator_id || null;
      if (!opId) return;
      if (selectedSet.size > 0 && !selectedSet.has(opId)) return;

      const ore = toNumber(r?.ore);
      const prod = toNumber(r?.prodotto);
      const prevEff = toNumber(r?.previsto_eff);
      const day = r?.report_date ? String(r.report_date) : null;

      const cur =
        m.get(opId) || {
          operator_id: opId,
          operator_name: safeText(r?.operator_name),
          ore_sum: 0,
          prodotto_sum: 0,
          previsto_eff_sum: 0,
          days_set: new Set(),
        };

      if (ore > 0) cur.ore_sum += ore;
      cur.prodotto_sum += prod;
      cur.previsto_eff_sum += prevEff;
      if (day) cur.days_set.add(day);

      const name = safeText(r?.operator_name);
      if ((cur.operator_name || "—") === "—" && name !== "—") cur.operator_name = name;

      m.set(opId, cur);
    });

    const out = Array.from(m.values()).map((x) => {
      const idx = x.previsto_eff_sum > 0 ? x.prodotto_sum / x.previsto_eff_sum : null;
      return {
        operator_id: x.operator_id,
        operator_name: x.operator_name,
        ore_sum: x.ore_sum,
        previsto_eff_sum: x.previsto_eff_sum,
        prodotto_sum: x.prodotto_sum,
        productivity_index_range: idx,
        days_active: x.days_set.size,
      };
    });

    return out.sort((a, b) => {
      const ap = a.productivity_index_range;
      const bp = b.productivity_index_range;
      const aNull = ap == null ? 1 : 0;
      const bNull = bp == null ? 1 : 0;
      if (aNull !== bNull) return aNull - bNull;
      if (ap != null && bp != null && bp !== ap) return bp - ap;
      return String(a.operator_name || "").localeCompare(String(b.operator_name || ""));
    });
  }, [globalRows, selectedSet]);

  const perOperatorFamilies = useMemo(() => {
    const byOp = new Map<string, Map<string, {
      categoria: string;
      descrizione: string;
      ore_sum: number;
      prodotto_sum: number;
      previsto_eff_sum: number;
    }>>();

    (familyRows || []).forEach((r) => {
      const opId = r?.operator_id || null;
      if (!opId) return;
      if (selectedSet.size > 0 && !selectedSet.has(opId)) return;

      const cat = safeText(r?.categoria);
      const desc = safeText(r?.descrizione);
      const key = `${cat}::${desc}`;

      const ore = toNumber(r?.ore);
      const prod = toNumber(r?.prodotto);
      const prevEff = toNumber(r?.previsto_eff);

      if (!byOp.has(opId)) byOp.set(opId, new Map());
      const m = byOp.get(opId);
      if (!m) return;

      const cur =
        m.get(key) || {
          categoria: cat,
          descrizione: desc,
          ore_sum: 0,
          prodotto_sum: 0,
          previsto_eff_sum: 0,
        };

      if (ore > 0) cur.ore_sum += ore;
      cur.prodotto_sum += prod;
      cur.previsto_eff_sum += prevEff;

      m.set(key, cur);
    });

      const out = new Map<string, Array<{
        categoria: string;
        descrizione: string;
        ore_sum: number;
        prodotto_sum: number;
        previsto_eff_sum: number;
        productivity_index: number | null;
      }>>();
    byOp.forEach((m, opId) => {
      const arr = Array.from(m.values()).map((x) => ({
        ...x,
        productivity_index: x.previsto_eff_sum > 0 ? x.prodotto_sum / x.previsto_eff_sum : null,
      }));

      arr.sort((a, b) => {
        const ap = a.productivity_index;
        const bp = b.productivity_index;
        const aNull = ap == null ? 1 : 0;
        const bNull = bp == null ? 1 : 0;
        if (aNull !== bNull) return aNull - bNull;
        if (ap != null && bp != null && bp !== ap) return bp - ap;
        const ak = `${a.categoria} ${a.descrizione}`;
        const bk = `${b.categoria} ${b.descrizione}`;
        return ak.localeCompare(bk);
      });

      out.set(opId, arr);
    });

    return out;
  }, [familyRows, selectedSet]);

  const totalsSelected = useMemo(() => {
    const sumOre = (perOperator || []).reduce((a, r) => a + toNumber(r.ore_sum), 0);
    const sumProd = (perOperator || []).reduce((a, r) => a + toNumber(r.prodotto_sum), 0);
    const sumPrev = (perOperator || []).reduce((a, r) => a + toNumber(r.previsto_eff_sum), 0);
    const idx = sumPrev > 0 ? sumProd / sumPrev : null;
    return { sumOre, sumProd, sumPrev, idx };
  }, [perOperator]);

  const costrOptions = useMemo(() => {
    const vals = (globalRows || [])
      .map((r) => (r?.costr ?? "").toString().trim())
      .filter(Boolean);
    return uniq(vals).sort((a, b) => a.localeCompare(b));
  }, [globalRows]);

  const commessaOptions = useMemo(() => {
    const vals = (globalRows || [])
      .map((r) => (r?.commessa ?? "").toString().trim())
      .filter(Boolean);
    return uniq(vals).sort((a, b) => a.localeCompare(b));
  }, [globalRows]);

  return {
    loading,
    error,
    globalRows,
    familyRows,
    operators,
    filteredOperators,
    perOperator,
    perOperatorFamilies,
    totalsSelected,
    costrOptions,
    commessaOptions,
  };
}
