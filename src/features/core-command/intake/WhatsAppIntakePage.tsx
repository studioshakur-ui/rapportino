// src/features/core-command/intake/WhatsAppIntakePage.tsx
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { runIntakePipeline } from "../agents/intake.agent";
import { parseWhatsAppExport, summarizeParse } from "./parseWhatsApp";
import { runMemoryEngine } from "../agents/memoryEngine.agent";
import { generatePrioritiesFromFindings } from "../agents/priorities.agent";
import { listWhatsAppImports } from "../api/whatsappImports.api";
import { useWhatsAppImports, useInvalidateWhatsAppImports } from "../hooks/useWhatsAppImports";
import { fetchTopAuthors } from "../api/stats.api";
import type { AgentResult } from "../types";
import type { ParseSummary } from "./parseWhatsApp";
import type { EngineResult } from "../agents/memoryEngine.agent";

export default function WhatsAppIntakePage() {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [commessa, setCommessa] = useState("");
  const [running,  setRunning]  = useState(false);
  const [phase,    setPhase]    = useState<string>("");
  const [result,   setResult]   = useState<AgentResult | null>(null);
  const [engine,   setEngine]   = useState<EngineResult | null>(null);
  const [summary,  setSummary]  = useState<ParseSummary | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const { data: imports, isLoading } = useWhatsAppImports(20);
  const invalidate = useInvalidateWhatsAppImports();

  const { data: authors } = useQuery({
    queryKey: ["whatsapp_top_authors"],
    queryFn: () => fetchTopAuthors(10),
    staleTime: 60_000,
  });

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Sélectionner un fichier .txt"); return; }
    if (!file.name.endsWith(".txt")) { setError("Format attendu: .txt (export WhatsApp)"); return; }

    setRunning(true); setError(null); setResult(null); setEngine(null); setSummary(null);

    try {
      // Pré-parse pour résumé immédiat
      setPhase("Parsing…");
      const text = await file.text();
      const parsed = parseWhatsAppExport(text, file.name);
      setSummary(summarizeParse(parsed.messages));
      if (parsed.errors.length && parsed.messages.length === 0) {
        setError(parsed.errors.join(" | "));
        return;
      }

      // Import
      setPhase("Import en base…");
      const res = await runIntakePipeline(file, { commessa: commessa.trim() || null });
      setResult(res);
      invalidate();

      // Memory Engine V2 sur le dernier import
      const freshImports = await listWhatsAppImports(1);
      const lastImport = freshImports[0];
      if (lastImport) {
        const eng = await runMemoryEngine(lastImport.id, (msg, pct) => setPhase(`Engine ${pct}% — ${msg}`));
        setEngine(eng);

        // Priorities auto
        setPhase("Génération priorities…");
        await generatePrioritiesFromFindings();
      }

      invalidate();
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
      setPhase("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleReprocess(importId: string) {
    setRunning(true); setError(null); setEngine(null);
    try {
      const eng = await runMemoryEngine(importId, (msg, pct) => setPhase(`Engine ${pct}% — ${msg}`));
      setEngine(eng);
      setPhase("Génération priorities…");
      await generatePrioritiesFromFindings();
      invalidate();
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
      setPhase("");
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">WhatsApp Intake</h1>

      {/* Upload */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Fichier export WhatsApp (.txt)</label>
          <input ref={fileRef} type="file" accept=".txt"
            className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-zinc-100 dark:file:bg-zinc-800 file:text-sm cursor-pointer" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Commessa (optionnel)</label>
          <input type="text" value={commessa} onChange={(e) => setCommessa(e.target.value)}
            placeholder="ex: COMM-001"
            className="w-full border border-zinc-300 dark:border-zinc-600 rounded px-3 py-1.5 text-sm bg-transparent" />
        </div>
        <button onClick={handleImport} disabled={running}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded">
          {running ? phase || "En cours…" : "Lancer l'import complet"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Parse summary */}
      {summary && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded p-4 space-y-1 text-sm">
          <p className="font-semibold">Messages reconnus</p>
          <p>Total : <strong>{summary.count}</strong></p>
          {summary.first && <p>Premier : <strong>{new Date(summary.first.message_ts).toLocaleString("fr-FR")}</strong> — {summary.first.author}</p>}
          {summary.last  && <p>Dernier : <strong>{new Date(summary.last.message_ts).toLocaleString("fr-FR")}</strong>  — {summary.last.author}</p>}
          <p>Auteurs ({summary.authors.length}) : <span className="font-mono text-xs">{summary.authors.join(", ")}</span></p>
        </div>
      )}

      {/* Intake result */}
      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-4 space-y-1 text-sm">
          <p className="font-semibold">Import terminé</p>
          <p>Événements créés : <strong>{result.events_created}</strong></p>
          <p>Findings générés : <strong>{result.findings.length}</strong></p>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc list-inside text-amber-700 dark:text-amber-400">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Memory Engine result */}
      {engine && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded p-4 space-y-1 text-sm">
          <p className="font-semibold">Memory Engine V2</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
            <p>Messages traités : <strong>{engine.messages_processed}</strong></p>
            <p>Câbles extraits : <strong>{engine.cables_extracted}</strong></p>
            <p>Câbles uniques : <strong>{engine.cables_unique}</strong></p>
            <p>Match INCA : <strong>{engine.inca_matched}</strong></p>
            <p>Non matchés : <strong className="text-amber-600">{engine.inca_unmatched}</strong></p>
            <p>Core events créés : <strong>{engine.core_events_created}</strong></p>
            <p>Cable events créés : <strong className="text-green-600">{engine.cable_events_created}</strong></p>
            <p>Priorities : <strong>{engine.priorities_created}</strong></p>
            <p>Findings : <strong>{engine.findings_created}</strong></p>
          </div>
          {engine.top_unmatched.length > 0 && (
            <details className="mt-2">
              <summary className="text-amber-700 dark:text-amber-400 cursor-pointer text-xs">
                Top non matchés INCA ({engine.top_unmatched.length})
              </summary>
              <p className="mt-1 font-mono text-xs text-zinc-500 break-all">
                {engine.top_unmatched.join(" · ")}
              </p>
            </details>
          )}
          {engine.errors.length > 0 && (
            <details className="mt-1">
              <summary className="text-red-600 cursor-pointer text-xs">
                {engine.errors.length} erreur(s)
              </summary>
              <ul className="mt-1 list-disc list-inside text-red-600 text-xs">
                {engine.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Imports history */}
      <div>
        <h2 className="text-sm font-semibold mb-2 text-zinc-500">Imports récents</h2>
        {isLoading ? (
          <p className="text-sm text-zinc-400">Chargement…</p>
        ) : imports?.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucun import</p>
        ) : (
          <ul className="space-y-2">
            {imports?.map((imp) => (
              <li key={imp.id} className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2 text-sm">
                <div>
                  <p className="font-medium truncate max-w-xs">{imp.file_name ?? "—"}</p>
                  <p className="text-xs text-zinc-400">{new Date(imp.imported_at).toLocaleString("fr-FR")}</p>
                </div>
                <div className="flex items-center gap-3 text-zinc-500 shrink-0 ml-3">
                  <span>{imp.message_count} msg</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    imp.status === "imported" ? "bg-green-100 text-green-700"
                    : imp.status === "failed"  ? "bg-red-100 text-red-700"
                    : "bg-zinc-100 text-zinc-500"}`}>
                    {imp.status}
                  </span>
                  <button
                    onClick={() => handleReprocess(imp.id)}
                    disabled={running}
                    className="text-xs text-blue-600 underline hover:no-underline disabled:opacity-40">
                    Re-process
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Top auteurs */}
      {(authors?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2 text-zinc-500">Top auteurs</h2>
          <ul className="space-y-1">
            {authors?.map((a) => (
              <li key={a.author} className="flex justify-between text-sm">
                <span>{a.author}</span>
                <span className="text-zinc-400">{a.msg_count} msg</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
