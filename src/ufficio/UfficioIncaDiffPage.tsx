import { useCallback, useEffect, useMemo, useState  } from "react";
import { useSearchParams, Link } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import LoadingScreen from "../components/LoadingScreen";

type IncaFileRow = {
  id: string;
  group_key: string | null;
  costr: string | null;
  commessa: string | null;
  project_code: string | null;
  file_name: string | null;
  uploaded_at: string | null;
};

type IncaImportRunRow = {
  id: string;
  group_key: string;
  costr: string | null;
  commessa: string | null;
  project_code: string | null;
  mode: string;
  created_at: string;
  created_by: string | null;
  previous_inca_file_id: string | null;
  new_inca_file_id: string | null;
  content_hash: string | null;
  summary: any | null;
  diff: any | null;
};

type DiffItem = {
  codice: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function shortId(id: string | null | undefined): string {
  const s = String(id ?? "").trim();
  if (!s) return "—";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function toIsoLocal(ts: string | null | undefined): string {
  const s = String(ts ?? "").trim();
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString();
  } catch {
    return s;
  }
}

function computeChangedFields(before: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined): string[] {
  const b = before || {};
  const a = after || {};
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  const changed: string[] = [];
  for (const k of keys) {
    const bv = b[k];
    const av = a[k];
    const same = JSON.stringify(bv ?? null) === JSON.stringify(av ?? null);
    if (!same) changed.push(k);
  }
  return changed;
}

export default function UfficioIncaDiffPage(): JSX.Element {
  const [sp] = useSearchParams();
  const incaFileId = (sp.get("incaFileId") || "").trim();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [head, setHead] = useState<IncaFileRow | null>(null);
  const [runs, setRuns] = useState<IncaImportRunRow[]>([]);

  const [runAId, setRunAId] = useState<string>("");
  const [runBId, setRunBId] = useState<string>("");

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      if (!incaFileId) {
        setHead(null);
        setRuns([]);
        return;
      }

      const { data: headRow, error: eHead } = await supabase
        .from("inca_files")
        .select("id,group_key,costr,commessa,project_code,file_name,uploaded_at")
        .eq("id", incaFileId)
        .maybeSingle();

      if (eHead) throw eHead;
      const h = (headRow || null) as IncaFileRow | null;
      setHead(h);

      const groupKey = (h?.group_key || "").trim();
      if (!groupKey) {
        setRuns([]);
        setRunAId("");
        setRunBId("");
        return;
      }

      const { data: runRows, error: eRuns } = await supabase
        .from("inca_import_runs")
        .select("id,group_key,costr,commessa,project_code,mode,created_at,created_by,previous_inca_file_id,new_inca_file_id,content_hash,summary,diff")
        .eq("group_key", groupKey)
        .order("created_at", { ascending: false })
        .limit(50);

      if (eRuns) throw eRuns;

      const list = ((runRows || []) as IncaImportRunRow[]).filter((r) => r && r.id);
      setRuns(list);

      const a = list[0]?.id ?? "";
      const b = list[1]?.id ?? "";
      setRunAId((prev) => prev || a);
      setRunBId((prev) => prev || b);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[UfficioIncaDiffPage] load error:", err);
      setError("Impossibile caricare il confronto import.");
      setHead(null);
      setRuns([]);
      setRunAId("");
      setRunBId("");
    } finally {
      setLoading(false);
    }
  }, [incaFileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runA = useMemo(() => runs.find((r) => r.id === runAId) || null, [runs, runAId]);

  const diffA = runA?.diff ?? null;

  const added = useMemo<string[]>(() => asArray<string>(diffA?.added), [diffA]);
  const removed = useMemo<string[]>(() => asArray<string>(diffA?.removed), [diffA]);
  const changed = useMemo<DiffItem[]>(() => asArray<DiffItem>(diffA?.changed), [diffA]);

  const summaryTitle = useMemo(() => {
    const c = (head?.costr || "").trim();
    const m = (head?.commessa || "").trim();
    const p = (head?.project_code || "").trim();
    const a = [c, m, p].filter(Boolean).join(" · ");
    return a || "Confronto import INCA";
  }, [head]);

  if (loading) return <LoadingScreen message="Caricamento confronto import…" />;

  if (!incaFileId) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-[13px] text-slate-200 font-semibold">Confronto import INCA</div>
          <div className="mt-2 text-[12px] text-slate-500">
            Apri questa pagina dal modulo INCA (Hub) con un file selezionato.
          </div>
          <div className="mt-3">
            <Link
              to="/ufficio/inca"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-[12px] text-slate-200 hover:bg-slate-900/60"
            >
              Torna a INCA
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">INCA · Diff import</div>
          <div className="text-2xl font-semibold text-slate-50">{summaryTitle}</div>
          <div className="text-[12px] text-slate-400 mt-1">
            HEAD: {shortId(head?.id)} · file: {head?.file_name || "—"} · uploaded: {toIsoLocal(head?.uploaded_at)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/ufficio/inca`}
            className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-[12px] text-slate-200 hover:bg-slate-900/60"
          >
            Indietro
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-[12px] text-slate-200 hover:bg-slate-900/60"
          >
            Aggiorna
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-[12px] text-amber-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Selezione runs</div>

          <div className="mt-3">
            <div className="text-[12px] text-slate-500">Run A (diff mostrato)</div>
            <select
              value={runAId}
              onChange={(e) => setRunAId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {toIsoLocal(r.created_at)} · {r.mode} · {shortId(r.id)}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3">
            <div className="text-[12px] text-slate-500">Run B (riferimento)</div>
            <select
              value={runBId}
              onChange={(e) => setRunBId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200"
            >
              <option value="">(auto)</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {toIsoLocal(r.created_at)} · {r.mode} · {shortId(r.id)}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/35 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">KPI diff (run A)</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-2">
                <div className="text-[11px] text-slate-500">Added</div>
                <div className="text-[14px] text-slate-50 font-semibold">{added.length}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-2">
                <div className="text-[11px] text-slate-500">Removed</div>
                <div className="text-[14px] text-slate-50 font-semibold">{removed.length}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-2">
                <div className="text-[11px] text-slate-500">Changed</div>
                <div className="text-[14px] text-slate-50 font-semibold">{changed.length}</div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-500">
              Run: {shortId(runA?.id)} · {toIsoLocal(runA?.created_at)} · mode {runA?.mode || "—"}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Changements</div>
              <div className="text-[13px] text-slate-200 font-semibold">
                Liste (run A)
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2 pr-3">Codice</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Champs</th>
                  <th className="py-2 pr-3">Avant → Après</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {added.map((c) => (
                  <tr key={`a-${c}`} className="border-t border-slate-900/80">
                    <td className="py-2 pr-3 font-semibold text-slate-50">{c}</td>
                    <td className="py-2 pr-3 text-emerald-200">ADDED</td>
                    <td className="py-2 pr-3">—</td>
                    <td className="py-2 pr-3">—</td>
                  </tr>
                ))}

                {removed.map((c) => (
                  <tr key={`r-${c}`} className="border-t border-slate-900/80">
                    <td className="py-2 pr-3 font-semibold text-slate-50">{c}</td>
                    <td className="py-2 pr-3 text-rose-200">REMOVED</td>
                    <td className="py-2 pr-3">—</td>
                    <td className="py-2 pr-3">—</td>
                  </tr>
                ))}

                {changed.map((it, idx) => {
                  const codice = String(it?.codice || "").trim() || `#${idx + 1}`;
                  const before = (it?.before || {}) as Record<string, unknown>;
                  const after = (it?.after || {}) as Record<string, unknown>;
                  const fields = computeChangedFields(before, after);

                  const brief = fields.slice(0, 4).join(", ");
                  const more = fields.length > 4 ? ` +${fields.length - 4}` : "";

                  return (
                    <tr key={`c-${codice}-${idx}`} className="border-t border-slate-900/80">
                      <td className="py-2 pr-3 font-semibold text-slate-50">{codice}</td>
                      <td className="py-2 pr-3 text-amber-200">UPDATED</td>
                      <td className="py-2 pr-3 text-slate-300">{brief}{more}</td>
                      <td className="py-2 pr-3 text-slate-400">
                        {fields.includes("situazione") ? (
                          <>
                            sit: {String(before["situazione"] ?? "—")} → {String(after["situazione"] ?? "—")}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}

                {added.length === 0 && removed.length === 0 && changed.length === 0 && (
                  <tr className="border-t border-slate-900/80">
                    <td className="py-3 text-slate-500" colSpan={4}>
                      Nessun cambiamento disponibile per questo run (diff vuoto).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-[11px] text-slate-500">
            Nota: la diff è generata dal backend (inca-sync) e rappresenta i cambiamenti INCA ufficiali (non terreno).
          </div>
        </div>
      </div>
    </div>
  );
}

