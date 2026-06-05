// src/modules/daily-lists/DailyListsPage.tsx
// CORE COMMAND — liste des imports + upload
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { parseFile } from "./dailyLists.parser";
import { createDailyListImport, listRecentImports, deleteImport } from "./dailyLists.repo";
import ImportDropzone from "./components/ImportDropzone";
import type { ParseResult } from "./dailyLists.types";

interface AuthSession { user?: { id?: string } }

export default function DailyListsPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth() as { session: AuthSession | null };
  const uid = session?.user?.id ?? null;

  const [parseResult, setParseResult]   = useState<ParseResult | null>(null);
  const [parsedFileName, setParsedFileName] = useState<string>("");
  const [parsing, setParsing]           = useState(false);
  const [parseError, setParseError]     = useState<string | null>(null);

  const { data: imports, isLoading } = useQuery({
    queryKey: ["daily_list_imports"],
    queryFn:  () => listRecentImports(20),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const importMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createDailyListImport>[0]) =>
      createDailyListImport(payload),
    onSuccess: (importId) => {
      void queryClient.invalidateQueries({ queryKey: ["daily_list_imports"] });
      navigate(`/command/daily-lists/${importId}`);
    },
    onError: (err: Error) => setParseError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteImport(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["daily_list_imports"] });
    },
  });

  async function handleFile(file: File) {
    setParseError(null);
    setParsing(true);
    setParsedFileName(file.name);
    try {
      const result = await parseFile(file);
      setParseResult(result);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    } finally {
      setParsing(false);
    }
  }

  function handleImport() {
    if (!parseResult || parseResult.rows.length === 0) return;
    importMutation.mutate({
      file_name:   parsedFileName,
      list_date:   parseResult.detected_date,
      source_kind: parseResult.source_kind,
      imported_by: uid,
      rows:        parseResult.rows,
      raw_metadata: { warnings: parseResult.warnings },
    });
  }

  function resetParse() {
    setParseResult(null);
    setParsedFileName("");
    setParseError(null);
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Listes journalières</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Importer PDF ou Excel (L1/L2/L3) — plan d'action chantier du jour
          </p>
        </div>
      </div>

      {/* Upload zone */}
      {!parseResult && (
        <ImportDropzone onFile={handleFile} disabled={parsing} />
      )}

      {/* Parsing spinner */}
      {parsing && (
        <div className="flex items-center gap-3 text-sm text-zinc-500">
          <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          Lecture du fichier…
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-400">
          <strong>Erreur : </strong>{parseError}
          <button onClick={resetParse} className="ml-3 underline text-xs">Réessayer</button>
        </div>
      )}

      {/* Parse preview */}
      {parseResult && !parsing && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{parsedFileName}</p>
              <p className="text-xs text-zinc-500">
                {parseResult.rows.length} lignes détectées ·{" "}
                {parseResult.source_kind.toUpperCase()} ·{" "}
                {parseResult.detected_date ?? "date non détectée"}
              </p>
            </div>
            <button onClick={resetParse} className="text-xs text-zinc-400 hover:text-zinc-600">
              ✕ Annuler
            </button>
          </div>

          {/* Warnings */}
          {parseResult.warnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg">
              ⚠ {w}
            </div>
          ))}

          {/* Preview table */}
          {parseResult.rows.length > 0 && (
            <div className="overflow-x-auto max-h-64 rounded-lg border border-zinc-100 dark:border-zinc-800">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
                  <tr>
                    {["Lista","Résolut.","Câble","État","Périmètre","Sit. INCA","Note"].map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium text-zinc-500 border-b border-zinc-200 dark:border-zinc-700">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-2 py-1 text-zinc-400">{row.lista ?? "—"}</td>
                      <td className="px-2 py-1 text-zinc-400">{row.risoluzione ?? "—"}</td>
                      <td className="px-2 py-1 font-mono font-semibold">{row.marca_pezzo}</td>
                      <td className="px-2 py-1 text-zinc-500">{row.stato_collegamento ?? "—"}</td>
                      <td className="px-2 py-1 text-zinc-500">{row.perimetro ?? "—"}</td>
                      <td className="px-2 py-1 text-zinc-500">{row.situazione_inca ?? "—"}</td>
                      <td className="px-2 py-1 text-zinc-400 truncate max-w-[160px]">{row.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parseResult.rows.length > 20 && (
                <p className="text-xs text-zinc-400 px-3 py-1.5">
                  … et {parseResult.rows.length - 20} lignes supplémentaires
                </p>
              )}
            </div>
          )}

          {parseResult.rows.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="w-full rounded-xl bg-blue-600 text-white text-sm font-semibold py-2.5 hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {importMutation.isPending
                ? "Importation en cours…"
                : `Importer ${parseResult.rows.length} câbles dans CORE COMMAND`}
            </button>
          )}
        </div>
      )}

      {/* Recent imports */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-500 mb-3">
          Imports récents
        </h2>

        {isLoading && (
          <p className="text-sm text-zinc-400">Chargement…</p>
        )}

        {!isLoading && (imports ?? []).length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-sm text-zinc-400">
            Aucun import. Déposer un fichier L1/L2/L3 ci-dessus.
          </div>
        )}

        <ul className="space-y-2">
          {(imports ?? []).map((imp) => {
            const statusColor = imp.status === "imported"
              ? "text-emerald-600 dark:text-emerald-400"
              : imp.status === "failed"
              ? "text-red-500"
              : "text-amber-500";

            return (
              <li
                key={imp.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 hover:border-blue-300 dark:hover:border-blue-700 transition"
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => navigate(`/command/daily-lists/${imp.id}`)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{imp.file_name}</span>
                    <span className={`text-xs font-medium ${statusColor}`}>
                      {imp.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {imp.list_date ?? "date inconnue"} · {imp.rows_count} câbles ·{" "}
                    {imp.source_kind.toUpperCase()} ·{" "}
                    {new Date(imp.imported_at).toLocaleString("fr-FR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Supprimer l'import "${imp.file_name}" ?`)) {
                      deleteMutation.mutate(imp.id);
                    }
                  }}
                  className="text-xs text-zinc-400 hover:text-red-500 transition shrink-0"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
