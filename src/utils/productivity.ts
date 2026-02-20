// src/utils/productivity.js
// CORE / CNCS — Productivity (%) helper
// - Indice (%) = (Somme prodotto_alloc / Somme previsto_alloc) * 100
// - Allocation prorata tempo_hours sur chaque ligne (rapportino_row_operators)
//
// IMPORTANT:
// - On ne “devine” rien : on calcule uniquement à partir de rapportino_rows(previsto, prodotto)
//   et rapportino_row_operators(tempo_hours).
// - On ignore les tokens tempo_hours <= 0 ou NULL (pas de prod).
// - On ignore les lignes sans previsto ou previsto <= 0 (pas de % possible).

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function safePct(prod: number | null, prev: number | null): number | null {
  if (!prev || prev <= 0) return null;
  if (!prod || prod <= 0) return 0;
  return (prod / prev) * 100;
}

function displayNameFromOperator(o: { cognome?: unknown; nome?: unknown; name?: unknown } | null | undefined): string {
  const cognome = String(o?.cognome || "").trim();
  const nome = String(o?.nome || "").trim();
  const legacy = String(o?.name || "").trim();
  const full = `${cognome} ${nome}`.trim();
  return full || legacy || "Operatore";
}

/**
 * Compute productivity allocations for a set of rapportini.
 *
 * @param {object} supabase - supabase client
 * @param {Array<{id:string, capo_id?:string, report_date?:string}>} rapportini
 * @returns {Promise<{
 *   overall: { previsto_sum:number, prodotto_sum:number, pct:number|null },
 *   byCapo: Array<{ capo_id:string, previsto_sum:number, prodotto_sum:number, pct:number|null }>,
 *   byOperator: Array<{ operator_id:string, operator_name:string, previsto_sum:number, prodotto_sum:number, pct:number|null }>
 * }>}
 */
type RapportinoMini = { id?: string; capo_id?: string | null; report_date?: string | null };

type SupabaseQueryResult<T> = { data: T[] | null; error: unknown | null };
type SupabaseTableQuery<T> = {
  select: (sel: string) => SupabaseTableQuery<T>;
  in: (col: string, vals: Array<string>) => Promise<SupabaseQueryResult<T>>;
};
type SupabaseClientLike = { from: (table: string) => SupabaseTableQuery<unknown> };

export async function computeProductivityPctForRapportini(
  supabase: SupabaseClientLike,
  rapportini: RapportinoMini[] | null | undefined
): Promise<{
  overall: { previsto_sum: number; prodotto_sum: number; pct: number | null };
  byCapo: Array<{ capo_id: string; previsto_sum: number; prodotto_sum: number; pct: number | null }>;
  byOperator: Array<{ operator_id: string; operator_name: string; previsto_sum: number; prodotto_sum: number; pct: number | null }>;
}> {
  const rapList = Array.isArray(rapportini) ? rapportini : [];
  const rapIds = rapList.map((r) => r?.id).filter((id): id is string => Boolean(id));

  if (rapIds.length === 0) {
    return {
      overall: { previsto_sum: 0, prodotto_sum: 0, pct: null },
      byCapo: [],
      byOperator: [],
    };
  }

  const capoByRap = new Map<string, string | null>();
  for (const r of rapList) {
    if (r?.id) capoByRap.set(r.id, r?.capo_id || null);
  }

  // 1) load rows (previsto + prodotto)
  const { data: rows, error: rowsErr } = await supabase
    .from("rapportino_rows")
    .select("id, rapportino_id, previsto, prodotto")
    .in("rapportino_id", rapIds);

  if (rowsErr) throw rowsErr;

  const rowById = new Map<string, { rowId: string; rapId: string; previsto: number | null; prodotto: number | null }>();
  const rowIds: string[] = [];

  for (const rr of rows || []) {
    const rowId = (rr as any)?.id as string | undefined;
    const rapId = (rr as any)?.rapportino_id as string | undefined;
    if (!rowId || !rapId) continue;

    const previsto = toNum((rr as any)?.previsto);
    const prodotto = toNum((rr as any)?.prodotto);

    rowById.set(rowId, {
      rowId,
      rapId,
      previsto,
      prodotto,
    });
    rowIds.push(rowId);
  }

  if (rowIds.length === 0) {
    return {
      overall: { previsto_sum: 0, prodotto_sum: 0, pct: null },
      byCapo: [],
      byOperator: [],
    };
  }

  // 2) load operator tokens
  const { data: tokens, error: tokErr } = await supabase
    .from("rapportino_row_operators")
    .select("rapportino_row_id, operator_id, tempo_hours")
    .in("rapportino_row_id", rowIds);

  if (tokErr) throw tokErr;

  // 3) sum_line_hours per row (only tempo_hours > 0)
  const sumLineHours = new Map<string, number>();
  for (const t of tokens || []) {
    const rowId = (t as any)?.rapportino_row_id as string | undefined;
    if (!rowId) continue;
    const h = toNum((t as any)?.tempo_hours);
    if (!h || h <= 0) continue;
    sumLineHours.set(rowId, (sumLineHours.get(rowId) || 0) + h);
  }

  // 4) aggregate allocations
  const aggOverall = { previsto_sum: 0, prodotto_sum: 0 };

  const aggByOperator = new Map<string, { previsto_sum: number; prodotto_sum: number }>(); // operator_id -> {previsto_sum, prodotto_sum}
  const aggByCapo = new Map<string, { previsto_sum: number; prodotto_sum: number }>(); // capo_id -> {previsto_sum, prodotto_sum}

  for (const t of tokens || []) {
    const rowId = (t as any)?.rapportino_row_id as string | undefined;
    const operatorId = (t as any)?.operator_id as string | undefined;
    if (!rowId || !operatorId) continue;

    const row = rowById.get(rowId);
    if (!row) continue;

    const lineSum = sumLineHours.get(rowId) || 0;
    const h = toNum((t as any)?.tempo_hours);

    // Only valid time tokens
    if (!h || h <= 0) continue;
    if (!lineSum || lineSum <= 0) continue;

    const previstoRow = toNum(row?.previsto);
    const prodottoRow = toNum(row?.prodotto);

    // previsto is mandatory to define a %
    if (!previstoRow || previstoRow <= 0) continue;

    const share = h / lineSum;

    const previstoAlloc = previstoRow * share;
    const prodottoAlloc = (prodottoRow && prodottoRow > 0 ? prodottoRow : 0) * share;

    aggOverall.previsto_sum += previstoAlloc;
    aggOverall.prodotto_sum += prodottoAlloc;

    // operator
    const o = aggByOperator.get(operatorId) || { previsto_sum: 0, prodotto_sum: 0 };
    o.previsto_sum += previstoAlloc;
    o.prodotto_sum += prodottoAlloc;
    aggByOperator.set(operatorId, o);

    // capo
    const capoId = capoByRap.get(row.rapId) || null;
    if (capoId) {
      const c = aggByCapo.get(capoId) || { previsto_sum: 0, prodotto_sum: 0 };
      c.previsto_sum += previstoAlloc;
      c.prodotto_sum += prodottoAlloc;
      aggByCapo.set(capoId, c);
    }
  }

  // 5) operator names
  const operatorIds = Array.from(aggByOperator.keys()).filter(Boolean);

  const opNameById = new Map<string, string>();
  if (operatorIds.length > 0) {
    const { data: ops, error: opsErr } = await supabase
      .from("operators")
      .select("id, cognome, nome, name")
      .in("id", operatorIds);

    if (opsErr) throw opsErr;

    for (const o of ops || []) {
      const row = o as { id?: string; cognome?: unknown; nome?: unknown; name?: unknown };
      if (!row.id) continue;
      opNameById.set(row.id, displayNameFromOperator(row));
    }
  }

  const overallPct = safePct(aggOverall.prodotto_sum, aggOverall.previsto_sum);

  const byCapo = Array.from(aggByCapo.entries())
    .map(([capo_id, v]) => ({
      capo_id,
      previsto_sum: v.previsto_sum,
      prodotto_sum: v.prodotto_sum,
      pct: safePct(v.prodotto_sum, v.previsto_sum),
    }))
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

  const byOperator = Array.from(aggByOperator.entries())
    .map(([operator_id, v]) => ({
      operator_id,
      operator_name: opNameById.get(operator_id) || "Operatore",
      previsto_sum: v.previsto_sum,
      prodotto_sum: v.prodotto_sum,
      pct: safePct(v.prodotto_sum, v.previsto_sum),
    }))
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

  return {
    overall: {
      previsto_sum: aggOverall.previsto_sum,
      prodotto_sum: aggOverall.prodotto_sum,
      pct: overallPct,
    },
    byCapo,
    byOperator,
  };
}

export function formatPct(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(0)}%`;
}

export function formatNum(v: unknown, digits = 1): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}
