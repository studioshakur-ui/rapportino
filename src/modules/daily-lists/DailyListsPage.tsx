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
import { AppBar, EmptyState, Pill, Screen, Section, StatCard } from "../../components/command-ui";
import { formatCableDisplay } from "../../core/cable/cableDisplay";

interface AuthSession { user?: { id?: string } }

export default function DailyListsPage(): JSX.Element {
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

  const recentImports = imports ?? [];
  const importedCount = recentImports.filter((imp) => imp.status === "imported").length;
  const draftOrFailedCount = recentImports.length - importedCount;

  return (
    <Screen className="max-w-4xl space-y-6">
      <AppBar
        title="Listes journalières"
        subtitle="Importer PDF ou Excel L1/L2/L3 — plan d'action chantier du jour."
        action={<Pill tone="sky">Importer liste PDF</Pill>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Imports récents" value={recentImports.length} tone="neutral" />
        <StatCard label="Listes prêtes" value={importedCount} tone={importedCount > 0 ? "emerald" : "neutral"} />
        <StatCard label="À contrôler" value={draftOrFailedCount} tone={draftOrFailedCount > 0 ? "amber" : "neutral"} />
      </div>

      <Section title="Nouvelle liste" eyebrow="Upload chantier">
        {!parseResult ? <ImportDropzone onFile={handleFile} disabled={parsing} /> : null}

        {parsing ? (
          <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 text-sm text-zinc-400">
            <svg className="h-4 w-4 animate-spin text-sky-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Lecture du fichier…
          </div>
        ) : null}

        {parseError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <strong>Erreur : </strong>{parseError}
            <button onClick={resetParse} className="ml-3 text-xs font-semibold underline">Réessayer</button>
          </div>
        ) : null}

        {parseResult && !parsing ? (
          <div className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{parsedFileName}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {parseResult.rows.length} lignes détectées · {parseResult.source_kind.toUpperCase()} · {parseResult.detected_date ?? "date non détectée"}
                </p>
              </div>
              <button onClick={resetParse} className="shrink-0 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 transition hover:text-white">
                Annuler
              </button>
            </div>

            {parseResult.warnings.map((warning, index) => (
              <div key={`${warning}-${index}`} className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                ⚠ {warning}
              </div>
            ))}

            {parseResult.rows.length > 0 ? (
              <div className="max-h-72 overflow-auto rounded-2xl border border-zinc-800">
                <table className="w-full min-w-[720px] border-collapse text-xs">
                  <thead className="sticky top-0 bg-zinc-900">
                    <tr>
                      {["Lista", "Résolut.", "Câble", "État", "Périmètre", "Sit. INCA", "Note"].map((h) => (
                        <th key={h} className="border-b border-zinc-800 px-3 py-2 text-left font-medium text-zinc-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.rows.slice(0, 20).map((row, index) => (
                      <tr key={`${row.marca_pezzo}-${index}`} className="border-t border-zinc-800/70">
                        <td className="px-3 py-2 text-zinc-500">{row.lista ?? "—"}</td>
                        <td className="px-3 py-2 text-zinc-500">{row.risoluzione ?? "—"}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-white">{formatCableDisplay(row.marca_pezzo)}</td>
                        <td className="px-3 py-2 text-zinc-500">{row.stato_collegamento ?? "—"}</td>
                        <td className="px-3 py-2 text-zinc-500">{row.perimetro ?? "—"}</td>
                        <td className="px-3 py-2 text-zinc-500">{row.situazione_inca ?? "—"}</td>
                        <td className="max-w-[180px] truncate px-3 py-2 text-zinc-500">{row.note ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parseResult.rows.length > 20 ? (
                  <p className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-500">
                    … et {parseResult.rows.length - 20} lignes supplémentaires
                  </p>
                ) : null}
              </div>
            ) : null}

            {parseResult.rows.length > 0 ? (
              <button
                onClick={handleImport}
                disabled={importMutation.isPending}
                className="min-h-12 w-full rounded-2xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
              >
                {importMutation.isPending ? "Importation en cours…" : `Importer ${parseResult.rows.length} câbles dans CORE COMMAND`}
              </button>
            ) : null}
          </div>
        ) : null}
      </Section>

      <Section title="Imports récents" eyebrow="Historique" count={recentImports.length}>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900" />)}
          </div>
        ) : null}

        {!isLoading && recentImports.length === 0 ? (
          <EmptyState title="Aucun import" description="Déposer une liste L1/L2/L3 pour commencer le suivi chantier." icon="📋" />
        ) : null}

        <div className="space-y-3">
          {recentImports.map((imp) => (
            <article key={imp.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4 transition hover:border-sky-500/40">
              <div className="flex items-start justify-between gap-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => navigate(`/command/daily-lists/${imp.id}`)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white">{imp.file_name}</span>
                    <Pill tone={imp.status === "imported" ? "emerald" : imp.status === "failed" ? "red" : "amber"}>{imp.status}</Pill>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {imp.list_date ?? "date inconnue"} · {imp.rows_count} câbles · {imp.source_kind.toUpperCase()} · {new Date(imp.imported_at).toLocaleString("fr-FR", {
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
                  className="min-h-10 shrink-0 rounded-xl border border-zinc-800 px-3 text-xs font-medium text-zinc-500 transition hover:border-red-500/40 hover:text-red-300"
                >
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      </Section>
    </Screen>
  );
}
