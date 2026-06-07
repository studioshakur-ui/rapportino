// src/modules/daily-lists/DailyListsPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { parseFile } from "./dailyLists.parser";
import { createDailyListImport, listRecentImports, deleteImport } from "./dailyLists.repo";
import ImportDropzone from "./components/ImportDropzone";
import type { ParseResult } from "./dailyLists.types";
import { AppBar, Screen, Pill, EmptyState } from "../../components/command-ui";
import { formatCableDisplay } from "../../core/cable/cableDisplay";

interface AuthSession { user?: { id?: string } }

export default function DailyListsPage(): JSX.Element {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth() as { session: AuthSession | null };
  const uid = session?.user?.id ?? null;

  const [parseResult, setParseResult]     = useState<ParseResult | null>(null);
  const [parsedFileName, setParsedFileName] = useState<string>("");
  const [parsing, setParsing]             = useState(false);
  const [parseError, setParseError]       = useState<string | null>(null);

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
      navigate(`/import/${importId}`);
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
      file_name:    parsedFileName,
      list_date:    parseResult.detected_date,
      source_kind:  parseResult.source_kind,
      imported_by:  uid,
      rows:         parseResult.rows,
      raw_metadata: { warnings: parseResult.warnings },
    });
  }

  const recentImports   = imports ?? [];
  const importedCount   = recentImports.filter((i) => i.status === "imported").length;
  const pendingCount    = recentImports.length - importedCount;

  return (
    <Screen className="max-w-4xl space-y-6">
      <AppBar
        title="Liste giornaliere"
        subtitle="Importa PDF o Excel L1/L2/L3 — piano d'azione cantiere del giorno."
      />

      {/* ── Stats ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Import recenti", value: recentImports.length, tone: "neutral" },
          { label: "Liste pronte",   value: importedCount,        tone: importedCount > 0 ? "emerald" : "neutral" },
          { label: "Da controllare", value: pendingCount,         tone: pendingCount > 0 ? "amber" : "neutral" },
        ].map(({ label, value, tone }) => (
          <div key={label} className={`rounded-xl border p-4 ${tone === "emerald" ? "border-emerald-200 bg-emerald-50" : tone === "amber" ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"} shadow-sm`}>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-500">{label}</p>
            <div className={`mt-1 text-3xl font-bold ${tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-gray-900"}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Upload zone ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Nuova lista</h2>

        {!parseResult && !parsing && <ImportDropzone onFile={handleFile} disabled={parsing} />}

        {parsing && (
          <div className="flex min-h-16 items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-500">
            <svg className="h-4 w-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Lettura file…
          </div>
        )}

        {parseError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Errore: </strong>{parseError}
            <button onClick={() => setParseError(null)} className="ml-3 text-xs font-semibold underline">
              Riprova
            </button>
          </div>
        )}

        {parseResult && !parsing && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{parsedFileName}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {parseResult.rows.length} righe · {parseResult.source_kind.toUpperCase()} · {parseResult.detected_date ?? "data non rilevata"}
                </p>
              </div>
              <button
                onClick={() => { setParseResult(null); setParsedFileName(""); setParseError(null); }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Annulla
              </button>
            </div>

            {parseResult.warnings.map((w, i) => (
              <div key={`${w}-${i}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                ⚠ {w}
              </div>
            ))}

            {parseResult.rows.length > 0 && (
              <div className="max-h-72 overflow-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[640px] border-collapse text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      {["Lista", "Cavo", "Stato", "Perimetro", "Sit. INCA", "Nota"].map((h) => (
                        <th key={h} className="border-b border-gray-200 px-3 py-2 text-left font-semibold uppercase tracking-wider text-gray-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parseResult.rows.slice(0, 20).map((row, i) => (
                      <tr key={`${row.marca_pezzo}-${i}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{row.lista ?? "—"}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-gray-900">{formatCableDisplay(row.marca_pezzo)}</td>
                        <td className="px-3 py-2 text-gray-500">{row.stato_collegamento ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-500">{row.perimetro ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-500">{row.situazione_inca ?? "—"}</td>
                        <td className="max-w-[160px] truncate px-3 py-2 text-gray-500">{row.note ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parseResult.rows.length > 20 && (
                  <p className="border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                    … e altre {parseResult.rows.length - 20} righe
                  </p>
                )}
              </div>
            )}

            {parseResult.rows.length > 0 && (
              <button
                onClick={handleImport}
                disabled={importMutation.isPending}
                className="w-full min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {importMutation.isPending
                  ? "Importazione in corso…"
                  : `Importa ${parseResult.rows.length} cavi in CORE COMMAND`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Import history ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Import recenti</h2>
          {recentImports.length > 0 && (
            <span className="text-xs text-gray-400">{recentImports.length} liste</span>
          )}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
            ))}
          </div>
        )}

        {!isLoading && recentImports.length === 0 && (
          <EmptyState title="Nessun import" description="Carica una lista L1/L2/L3 per iniziare il monitoraggio." icon="📋" />
        )}

        {!isLoading && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {recentImports.map((imp, idx) => (
              <div
                key={imp.id}
                className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? "border-t border-gray-100" : ""} hover:bg-gray-50 transition`}
              >
                <button
                  onClick={() => navigate(`/import/${imp.id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{imp.file_name}</span>
                    <Pill tone={imp.status === "imported" ? "emerald" : imp.status === "failed" ? "red" : "amber"}>
                      {imp.status}
                    </Pill>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {imp.list_date
                      ? new Date(imp.list_date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                      : "data sconosciuta"
                    } · {imp.rows_count} cavi · {imp.source_kind.toUpperCase()} ·{" "}
                    {new Date(imp.imported_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Eliminare "${imp.file_name}"?`)) deleteMutation.mutate(imp.id);
                  }}
                  className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                >
                  Elimina
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}
