// src/features/core-command/inca/IncaImportPage.tsx
// Page CORE COMMAND pour l'import INCA.
// Réutilise useIncaImporter + uploadIncaFileToStorage du legacy.
// Aucune écriture directe dans inca_cavi depuis le client.
// inca-sync (Edge Function, service_role) est la seule écriture INCA.

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIncaImporter } from "../../../features/inca/useIncaImporter";
import { supabase } from "../../../lib/supabaseClient";

// UUID fixe du ship virtuel CORE COMMAND (migration 20260603150000)
const CORE_COMMAND_SHIP_ID = "cc000000-0000-0000-0000-000000000001";

type DryRunResult = {
  ok: boolean;
  total?: number;
  meta?: {
    totalRows: number;
    rowsWithCode: number;
    rowsInvalid: number;
    sheetName: string;
    fileName: string;
    sizeBytes: number;
  };
  counts?: Record<string, number>;
  samples?: {
    errors?: Array<{ row: number; reason: string; detail?: string }>;
  };
};

type SyncResult = {
  ok: boolean;
  total?: number;
  skipped?: boolean;
  reason?: string;
  diff?: {
    addedCount: number;
    removedCount: number;
    changedCount: number;
  };
  counts?: Record<string, number>;
  debug?: {
    sheetName: string;
    totalRows: number;
  };
};

function fmt(n: number | undefined) {
  return n == null ? "—" : n.toLocaleString("fr-FR");
}

export default function IncaImportPage() {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [costr,   setCostr]   = useState("");
  const [commessa, setCommessa] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [force,   setForce]   = useState(false);

  const [dryResult, setDryResult] = useState<DryRunResult | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const importer = useIncaImporter();

  // Historique des imports récents
  const { data: recentRuns, refetch: refetchRuns } = useQuery({
    queryKey: ["inca_import_runs_recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inca_import_runs")
        .select("id, created_at, costr, commessa, mode, summary")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // Compteur inca_cavi
  const { data: incaCount, refetch: refetchCount } = useQuery({
    queryKey: ["inca_cavi_count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("inca_cavi")
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  function getFile(): File | null {
    return fileRef.current?.files?.[0] ?? null;
  }

  function validate(): string | null {
    if (!getFile()) return "Sélectionner un fichier .xlsx";
    if (!costr.trim()) return "costr obligatoire";
    if (!commessa.trim()) return "commessa obligatoire";
    return null;
  }

  async function handleDryRun() {
    const err = validate();
    if (err) { alert(err); return; }
    setDryResult(null); setSyncResult(null);
    try {
      const res = await importer.dryRun({
        file: getFile()!,
        costr: costr.trim(),
        commessa: commessa.trim(),
        projectCode: projectCode.trim(),
        shipId: CORE_COMMAND_SHIP_ID,
      });
      setDryResult(res as unknown as DryRunResult);
    } catch {
      // error displayed by importer.error
    }
  }

  // Supprime les copies archives (previous_inca_file_id IS NOT NULL) pour costr+commessa.
  // inca-sync crée toujours un doublon archive — inutile pour CORE COMMAND single-user.
  async function cleanupIncaArchives(targetCostr: string, targetCommessa: string) {
    // Charger toutes les inca_files pour ce costr+commessa
    const { data: files } = await supabase
      .from("inca_files")
      .select("id, previous_inca_file_id")
      .eq("costr", targetCostr)
      .eq("commessa", targetCommessa);

    if (!files || files.length <= 1) return; // rien à nettoyer

    // Les archives ont previous_inca_file_id non null
    const archives = files.filter((f) => f.previous_inca_file_id !== null);
    if (archives.length === 0) return;

    const archiveIds = archives.map((f) => f.id);

    // Supprimer les câbles des archives
    for (let i = 0; i < archiveIds.length; i += 50) {
      const chunk = archiveIds.slice(i, i + 50);
      await supabase.from("inca_cavi").delete().in("inca_file_id", chunk);
    }
    // Supprimer les inca_files archives
    for (let i = 0; i < archiveIds.length; i += 50) {
      const chunk = archiveIds.slice(i, i + 50);
      await supabase.from("inca_files").delete().in("id", chunk);
    }
  }

  async function handleSync() {
    const err = validate();
    if (err) { alert(err); return; }
    setSyncResult(null);
    try {
      const res = await importer.commit({
        file: getFile()!,
        costr: costr.trim(),
        commessa: commessa.trim(),
        projectCode: projectCode.trim(),
        shipId: CORE_COMMAND_SHIP_ID,
        force,
      });
      setSyncResult(res as unknown as SyncResult);

      // Nettoyer les archives automatiquement — CORE COMMAND n'en a pas besoin
      await cleanupIncaArchives(costr.trim(), commessa.trim());

      await refetchCount();
      await refetchRuns();
    } catch {
      // error displayed by importer.error
    }
  }

  const canSync = !!dryResult?.ok && !importer.loading;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Import INCA</h1>
        <div className="text-sm text-zinc-500">
          inca_cavi : <strong className="text-zinc-800 dark:text-zinc-200">{fmt(incaCount ?? undefined)}</strong> câbles
        </div>
      </div>

      {/* Formulaire */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Fichier Excel INCA (.xlsx)</label>
          <input ref={fileRef} type="file" accept=".xlsx,.xls"
            className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-zinc-100 dark:file:bg-zinc-800 file:text-sm cursor-pointer"
            onChange={() => { setDryResult(null); setSyncResult(null); }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-zinc-500">costr <span className="text-red-500">*</span></label>
            <input value={costr} onChange={(e) => setCostr(e.target.value)} placeholder="ex: RIVA"
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
          <input value={projectCode} onChange={(e) => setProjectCode(e.target.value)} placeholder="ex: SDC-01"
            className="w-full border border-zinc-300 dark:border-zinc-600 rounded px-3 py-1.5 text-sm bg-transparent" />
        </div>

        <div className="flex items-center gap-4 pt-1">
          <button onClick={handleDryRun} disabled={importer.loading}
            className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded">
            {importer.phase === "analyzing" ? "Analyse…" : "1 — Analyser"}
          </button>
          <button onClick={handleSync} disabled={!canSync || importer.loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded">
            {importer.phase === "importing" ? "Import…" : "2 — Importer INCA"}
          </button>
          <label className="flex items-center gap-1.5 text-sm text-zinc-500 cursor-pointer select-none">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)}
              className="rounded" />
            Force re-import
          </label>
        </div>
      </div>

      {/* Erreur */}
      {importer.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded p-3 text-sm text-red-700 dark:text-red-300 font-mono">
          {importer.error.message}
        </div>
      )}

      {/* Dry-run result */}
      {dryResult?.ok && (
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded p-4 space-y-2 text-sm">
          <p className="font-semibold">Analyse OK — prêt à importer</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <p>Lignes lues : <strong>{fmt(dryResult.meta?.totalRows)}</strong></p>
            <p>Câbles valides : <strong>{fmt(dryResult.meta?.rowsWithCode)}</strong></p>
            <p>Lignes invalides : <strong>{fmt(dryResult.meta?.rowsInvalid)}</strong></p>
            <p>Feuille : <strong>{dryResult.meta?.sheetName ?? "—"}</strong></p>
          </div>
          {dryResult.counts && (
            <div className="flex flex-wrap gap-2 text-xs pt-1">
              {[
                { k: "P", label: "Posato",    color: "bg-green-100 text-green-800" },
                { k: "T", label: "Da posare", color: "bg-amber-100 text-amber-800" },
                { k: "R", label: "Rifiutato", color: "bg-red-100 text-red-800" },
                { k: "B", label: "Bloccato",  color: "bg-zinc-200 text-zinc-700" },
                { k: "L", label: "Libero",    color: "bg-zinc-100 text-zinc-500" },
              ].map(({ k, label, color }) => (
                (dryResult.counts![k] ?? 0) > 0 && (
                  <span key={k} className={`px-2 py-0.5 rounded font-semibold ${color}`}>
                    {k}: {fmt(dryResult.counts![k])} {label}
                  </span>
                )
              ))}
            </div>
          )}
          {(dryResult.samples?.errors?.length ?? 0) > 0 && (
            <details className="mt-1">
              <summary className="text-amber-600 cursor-pointer text-xs">{dryResult.samples!.errors!.length} erreur(s) lignes</summary>
              <ul className="mt-1 text-xs font-mono space-y-0.5">
                {dryResult.samples!.errors!.slice(0, 10).map((e, i) => (
                  <li key={i} className="text-zinc-500">L{e.row} — {e.reason}{e.detail ? ` (${e.detail})` : ""}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Sync result */}
      {syncResult?.ok && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-4 space-y-2 text-sm">
          {syncResult.skipped ? (
            <p className="font-semibold text-amber-600">Import ignoré — contenu identique (même hash)</p>
          ) : (
            <>
              <p className="font-semibold text-green-700">Import INCA terminé ✓</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                <p>Câbles importés : <strong>{fmt(syncResult.total)}</strong></p>
                <p>Feuille : <strong>{syncResult.debug?.sheetName ?? "—"}</strong></p>
                {syncResult.diff && (
                  <>
                    <p>Ajoutés : <strong className="text-green-600">{fmt(syncResult.diff.addedCount)}</strong></p>
                    <p>Supprimés : <strong className="text-red-600">{fmt(syncResult.diff.removedCount)}</strong></p>
                    <p>Modifiés : <strong className="text-amber-600">{fmt(syncResult.diff.changedCount)}</strong></p>
                  </>
                )}
              </div>
            </>
          )}
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
            → Aller dans <strong>/command/intake</strong> et cliquer <strong>Re-process</strong> sur l'import WhatsApp pour relancer le matching INCA.
          </div>
        </div>
      )}

      {/* Historique imports */}
      {(recentRuns?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 mb-2">Imports récents</h2>
          <ul className="space-y-1.5">
            {recentRuns?.map((run) => {
              const summary = (run.summary as Record<string, unknown>) ?? {};
              return (
                <li key={run.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium">{run.costr} / {run.commessa}</span>
                    <span className="ml-2 text-xs text-zinc-500">{typeof summary["fileName"] === "string" ? summary["fileName"] : ""}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 shrink-0 ml-2">
                    <span>{typeof summary["totalCables"] === "number" ? `${summary["totalCables"]} câbles` : ""}</span>
                    <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{run.mode}</span>
                    <span>{new Date(run.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
