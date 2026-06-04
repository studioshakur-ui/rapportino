// src/features/core-command/inca/IncaImportPage.tsx
// Import INCA via inca-sync Edge Function.
// Aucune écriture directe dans inca_cavi depuis le client.
// inca-sync (service_role) est la seule source d'écriture INCA.

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../../lib/supabaseClient";

const BUCKET = "core-drive";
const CORE_COMMAND_SHIP_ID = "cc000000-0000-0000-0000-000000000001";

async function uploadToStorage(file: File, costr: string, commessa: string): Promise<{
  bucket: string; path: string; fileName: string;
}> {
  const safe = (s: string) => s.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 64) || "na";
  const date = new Date().toISOString().slice(0, 10);
  const uid  = crypto.randomUUID();
  const path = `inca/${safe(costr)}/${safe(commessa)}/${date}/${uid}-${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw new Error(`Upload INCA échoué: ${error.message}`);
  return { bucket: BUCKET, path, fileName: file.name };
}

async function cleanupArchives(costr: string, commessa: string) {
  const { data: files } = await supabase
    .from("inca_files").select("id, previous_inca_file_id")
    .eq("costr", costr).eq("commessa", commessa);
  const archives = (files ?? []).filter((f) => f.previous_inca_file_id !== null);
  if (!archives.length) return;
  const ids = archives.map((f) => f.id);
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    await supabase.from("inca_cavi").delete().in("inca_file_id", chunk);
    await supabase.from("inca_files").delete().in("id", chunk);
  }
}

type SyncResult = {
  ok: boolean; total?: number; skipped?: boolean; reason?: string;
  diff?: { addedCount: number; removedCount: number; changedCount: number };
  counts?: Record<string, number>;
  debug?: { sheetName: string; totalRows: number };
};

function fmt(n: number | undefined) {
  return n == null ? "—" : n.toLocaleString("fr-FR");
}

export default function IncaImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [costr,       setCostr]       = useState("SDC");
  const [commessa,    setCommessa]    = useState("6368");
  const [projectCode, setProjectCode] = useState("");
  const [force,       setForce]       = useState(false);
  const [phase,       setPhase]       = useState<"idle"|"uploading"|"syncing">("idle");
  const [result,      setResult]      = useState<SyncResult | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const { data: incaCount, refetch: refetchCount } = useQuery({
    queryKey: ["inca_cavi_count"],
    queryFn: async () => {
      const { count } = await supabase.from("inca_cavi").select("id", { count: "exact", head: true });
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  const { data: recentRuns, refetch: refetchRuns } = useQuery({
    queryKey: ["inca_import_runs_recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inca_import_runs").select("id, created_at, costr, commessa, summary")
        .order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  async function handleSync() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Sélectionner un fichier .xlsx"); return; }
    if (!costr.trim() || !commessa.trim()) { setError("costr + commessa obligatoires"); return; }

    setError(null); setResult(null);

    try {
      setPhase("uploading");
      const ref = await uploadToStorage(file, costr.trim(), commessa.trim());

      setPhase("syncing");
      const { data, error: fnErr } = await supabase.functions.invoke("inca-sync", {
        body: {
          storage_bucket: ref.bucket,
          storage_path:   ref.path,
          file_name:      ref.fileName,
          costr:          costr.trim(),
          commessa:       commessa.trim(),
          projectCode:    projectCode.trim(),
          shipId:         CORE_COMMAND_SHIP_ID,
          force,
        },
      });

      if (fnErr) throw new Error(fnErr.message);
      const d = data as SyncResult;
      if (!d?.ok && !d?.skipped) throw new Error((d as any)?.error ?? "Erreur inca-sync");

      setResult(d);
      await cleanupArchives(costr.trim(), commessa.trim());
      await refetchCount();
      await refetchRuns();
    } catch (e) {
      setError(String(e));
    } finally {
      setPhase("idle");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const busy = phase !== "idle";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Import INCA</h1>
        <span className="text-sm text-zinc-500">
          inca_cavi : <strong className="text-zinc-800 dark:text-zinc-200">{fmt(incaCount ?? undefined)}</strong> câbles
        </span>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Fichier Excel INCA (.xlsx)</label>
          <input ref={fileRef} type="file" accept=".xlsx,.xls"
            className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-zinc-100 dark:file:bg-zinc-800 file:text-sm cursor-pointer"
            onChange={() => { setResult(null); setError(null); }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-500">costr <span className="text-red-500">*</span></label>
            <input value={costr} onChange={(e) => setCostr(e.target.value)} placeholder="ex: SDC"
              className="w-full border border-zinc-300 dark:border-zinc-600 rounded px-3 py-1.5 text-sm bg-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-500">commessa <span className="text-red-500">*</span></label>
            <input value={commessa} onChange={(e) => setCommessa(e.target.value)} placeholder="ex: 6368"
              className="w-full border border-zinc-300 dark:border-zinc-600 rounded px-3 py-1.5 text-sm bg-transparent" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-zinc-500">Project code (optionnel)</label>
          <input value={projectCode} onChange={(e) => setProjectCode(e.target.value)} placeholder="ex: SDC"
            className="w-full border border-zinc-300 dark:border-zinc-600 rounded px-3 py-1.5 text-sm bg-transparent" />
        </div>
        <div className="flex items-center gap-6">
          <button onClick={handleSync} disabled={busy}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded">
            {busy
              ? phase === "uploading" ? "Upload…" : "Sync INCA…"
              : "Importer INCA"}
          </button>
          <label className="flex items-center gap-2 text-sm text-zinc-500 cursor-pointer">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            Force re-import
          </label>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-4 space-y-2 text-sm">
          {result.skipped ? (
            <p className="font-semibold text-amber-600">Fichier identique — import ignoré (force pour réimporter)</p>
          ) : (
            <>
              <p className="font-semibold">Import INCA terminé</p>
              <p>Câbles importés : <strong>{fmt(result.total)}</strong></p>
              {result.diff && (
                <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                  <p>Ajoutés : {result.diff.addedCount} · Supprimés : {result.diff.removedCount} · Modifiés : {result.diff.changedCount}</p>
                </div>
              )}
              {result.counts && (
                <div className="flex flex-wrap gap-2 text-xs mt-1">
                  {Object.entries(result.counts).filter(([k]) => ["P","T","R","B","L","E"].includes(k)).map(([k, v]) => (
                    <span key={k} className="px-2 py-0.5 bg-white dark:bg-zinc-800 border rounded border-zinc-200 dark:border-zinc-700">
                      {k} : {v}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-zinc-500 mt-1">inca_cavi : {fmt(incaCount ?? undefined)} câbles — relancer Re-process dans WhatsApp Intake</p>
            </>
          )}
        </div>
      )}

      {/* Recent runs */}
      {(recentRuns?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2 text-zinc-500">Imports récents</h2>
          <ul className="space-y-1">
            {recentRuns?.map((run) => {
              const s = run.summary as Record<string, unknown> | null;
              return (
                <li key={run.id} className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                  <span>{run.costr} / {run.commessa}</span>
                  <span className="text-xs">
                    {s?.totalCables != null ? `${s.totalCables} câbles · ` : ""}
                    {new Date(run.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
