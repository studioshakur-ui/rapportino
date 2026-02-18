import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import LoadingScreen from "../components/LoadingScreen";
import IncaCaviTable, { IncaCavoRow, IncaTableViewMode } from "../features/inca/IncaCaviTable";

type IncaFileRow = {
  id: string;
  group_key: string | null;
  costr: string | null;
  commessa: string | null;
  project_code: string | null;
  file_name: string | null;
  file_type: string | null;
  uploaded_at: string | null;
  previous_inca_file_id: string | null;
  import_run_id: string | null;
  content_hash: string | null;
};

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function isoLocal(ts: string | null | undefined): string {
  const s = norm(ts);
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString();
  } catch {
    return s;
  }
}

function shortHash(h: string | null | undefined): string {
  const s = norm(h);
  if (!s) return "—";
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

type Counts = {
  P: number;
  T: number;
  R: number;
  B: number;
  E: number;
  NP: number;
  p50: number;
  p70: number;
  p100: number;
};

function emptyCounts(): Counts {
  return { P: 0, T: 0, R: 0, B: 0, E: 0, NP: 0, p50: 0, p70: 0, p100: 0 };
}

export default function UfficioIncaAuditPage(): JSX.Element {
  const [sp] = useSearchParams();

  // You can enter with either:
  // - ?headId=<inca_files.id>  (recommended)
  // - ?incaFileId=<inca_files.id> (backwards compatibility)
  const headId = norm(sp.get("headId") || sp.get("incaFileId"));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [head, setHead] = useState<IncaFileRow | null>(null);
  const [uploads, setUploads] = useState<IncaFileRow[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string>("");

  const [rows, setRows] = useState<IncaCavoRow[]>([]);
  const [counts, setCounts] = useState<Counts>(emptyCounts());

  const [viewMode, setViewMode] = useState<IncaTableViewMode>("standard");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHead(null);
    setUploads([]);
    setSelectedUploadId("");
    setRows([]);
    setCounts(emptyCounts());

    try {
      if (!headId) {
        setLoading(false);
        return;
      }

      const { data: headRow, error: eHead } = await supabase
        .from("inca_files")
        .select("id,group_key,costr,commessa,project_code,file_name,file_type,uploaded_at,previous_inca_file_id,import_run_id,content_hash")
        .eq("id", headId)
        .maybeSingle();
      if (eHead) throw eHead;

      const h = (headRow || null) as IncaFileRow | null;
      setHead(h);

      const groupKey = norm(h?.group_key);
      const costr = norm(h?.costr);
      const commessa = norm(h?.commessa);
      if (!groupKey && (!costr || !commessa)) {
        setLoading(false);
        return;
      }

      const q = supabase
        .from("inca_files")
        .select("id,group_key,costr,commessa,project_code,file_name,file_type,uploaded_at,previous_inca_file_id,import_run_id,content_hash")
        .eq("file_type", "XLSX")
        .order("uploaded_at", { ascending: false })
        .limit(200);

      const { data: uploadRows, error: eUploads } = groupKey
        ? await q.eq("group_key", groupKey)
        : await q.eq("costr", costr).eq("commessa", commessa);
      if (eUploads) throw eUploads;

      const list = (uploadRows || []) as IncaFileRow[];
      setUploads(list);

      // Default selection: latest archive (previous_inca_file_id NOT NULL), else head.
      const latestArchive = list.find((r) => !!r.previous_inca_file_id);
      const pickId = latestArchive?.id || list[0]?.id || headId;
      setSelectedUploadId(pickId);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [headId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadCavi = useCallback(async (incaFileId: string) => {
    if (!incaFileId) {
      setRows([]);
      setCounts(emptyCounts());
      return;
    }

    // NOTE: for archive snapshots we query base table (NOT the "last posa" view),
    // because archive IDs don't have rapportino links.
    const { data, error } = await supabase
      .from("inca_cavi")
      .select(
        "id,codice,marca_cavo,tipo,sezione,livello_disturbo,impianto,situazione,progress_percent,stato_cantiere,stato_tec,zona_da,zona_a,apparato_da,apparato_a,descrizione_da,descrizione_a,metri_teo,metri_dis,wbs,pagina_pdf",
      )
      .eq("inca_file_id", incaFileId)
      .order("codice", { ascending: true })
      .limit(2500);

    if (error) {
      setError(error.message);
      setRows([]);
      setCounts(emptyCounts());
      return;
    }

    const rr = (data || []) as any[];

    const nextRows: IncaCavoRow[] = rr.map((r) => ({
      id: String(r.id),
      codice: r.codice ?? null,
      marca_cavo: r.marca_cavo ?? null,
      tipo: r.tipo ?? null,
      sezione: r.sezione ?? null,
      livello_disturbo: r.livello_disturbo ?? null,
      impianto: r.impianto ?? null,
      situazione: r.situazione ?? null,
      progress_percent: r.progress_percent ?? null,
      stato_cantiere: r.stato_cantiere ?? null,
      stato_tec: r.stato_tec ?? null,
      zona_da: r.zona_da ?? null,
      zona_a: r.zona_a ?? null,
      apparato_da: r.apparato_da ?? null,
      apparato_a: r.apparato_a ?? null,
      descrizione_da: r.descrizione_da ?? null,
      descrizione_a: r.descrizione_a ?? null,
      metri_teo: r.metri_teo == null ? null : Number(r.metri_teo),
      metri_dis: r.metri_dis == null ? null : Number(r.metri_dis),
      metri_totali: null,
      wbs: r.wbs ?? null,
      pagina_pdf: r.pagina_pdf ?? null,
      data_posa: null,
      capo_label: null,
    }));

    const c: Counts = emptyCounts();

    for (const r of nextRows) {
      const s = norm(r.situazione).toUpperCase();
      if (s === "P") c.P += 1;
      else if (s === "T") c.T += 1;
      else if (s === "R") c.R += 1;
      else if (s === "B") c.B += 1;
      else if (s === "E") c.E += 1;
      else c.NP += 1;

      const pp = typeof r.progress_percent === "number" ? r.progress_percent : null;
      if (pp === 50) c.p50 += 1;
      else if (pp === 70) c.p70 += 1;
      else if (pp === 100) c.p100 += 1;
    }

    setRows(nextRows);
    setCounts(c);
  }, []);

  useEffect(() => {
    void loadCavi(selectedUploadId);
  }, [selectedUploadId, loadCavi]);

  const selectedUpload = useMemo(() => uploads.find((u) => u.id === selectedUploadId) || null, [uploads, selectedUploadId]);

  const header = useMemo(() => {
    const costr = norm(head?.costr);
    const commessa = norm(head?.commessa);
    const pc = norm(head?.project_code);
    const gk = norm(head?.group_key);
    return {
      title: `${costr || "?"} / ${commessa || "?"}${pc ? ` / ${pc}` : ""}`,
      groupKey: gk,
    };
  }, [head]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] text-slate-400">UFFICIO → INCA → Audit archives</div>
          <h1 className="mt-1 text-[20px] font-semibold text-slate-100">{header.title}</h1>
          <div className="mt-1 text-[12px] text-slate-500">Group key: <span className="font-mono">{header.groupKey || "—"}</span></div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/ufficio/inca"
            className="rounded-xl border border-slate-700/70 bg-white/5 px-3 py-2 text-[12px] font-semibold text-slate-200 hover:bg-white/10"
          >
            ← Hub INCA
          </Link>

          {headId ? (
            <Link
              to={`/ufficio/inca-diff?incaFileId=${encodeURIComponent(headId)}`}
              className="rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-[12px] font-semibold text-emerald-200 hover:bg-emerald-400/15"
            >
              Diff (runs)
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-3">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold text-slate-200">Uploads (archives)</div>
            <div className="text-[11px] text-slate-500">{uploads.length} items</div>
          </div>
          <div className="mt-2 max-h-[560px] overflow-auto">
            {uploads.map((u) => {
              const isHead = !u.previous_inca_file_id;
              const active = u.id === selectedUploadId;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUploadId(u.id)}
                  className={
                    "w-full rounded-xl border px-3 py-2 text-left transition " +
                    (active ? "border-emerald-300/30 bg-emerald-400/10" : "border-slate-700/70 bg-white/0 hover:bg-white/5")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-semibold text-slate-100">{norm(u.file_name) || "—"}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500">{isoLocal(u.uploaded_at)}</div>
                      <div className="mt-0.5 text-[11px] text-slate-600 font-mono">hash: {shortHash(u.content_hash)}</div>
                    </div>
                    <div className="shrink-0">
                      <span className={
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold " +
                        (isHead ? "border-sky-300/25 bg-sky-400/10 text-sky-200" : "border-slate-700/70 bg-white/5 text-slate-300")
                      }>
                        {isHead ? "HEAD" : "ARCH"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>run: {shortHash(u.import_run_id)}</span>
                    <span className="font-mono">{shortHash(u.id)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[12px] font-semibold text-slate-200">Snapshot</div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {selectedUpload ? (
                  <>
                    <span className="font-mono">{shortHash(selectedUpload.id)}</span>
                    <span className="mx-2 text-slate-600">•</span>
                    <span>{isoLocal(selectedUpload.uploaded_at)}</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">P {counts.P}</span>
              <span className="rounded-full border border-slate-700/70 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">NP {counts.NP}</span>
              <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">T {counts.T}</span>
              <span className="rounded-full border border-rose-300/25 bg-rose-400/10 px-2.5 py-1 text-[11px] font-semibold text-rose-200">R {counts.R}</span>
              <span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-2.5 py-1 text-[11px] font-semibold text-violet-200">B {counts.B}</span>
              <span className="rounded-full border border-slate-700/70 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-400">E {counts.E}</span>
              <span className="ml-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">5→ {counts.p50}</span>
              <span className="rounded-full border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold text-sky-200">7→ {counts.p70}</span>
              <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">P→ {counts.p100}</span>
            </div>
          </div>

          <div className="mt-3">
            <IncaCaviTable
              rows={rows}
              loading={false}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              title="Cavi (snapshot)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
