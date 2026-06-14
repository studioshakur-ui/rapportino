import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppBar, Btn, Card, EmptyState, Pill, Screen, Section, StatCard } from "../../components/command-ui";
import ImportDropzone from "../daily-lists/components/ImportDropzone";
import { buildIncaUploadPath, inferIncaBucket, loadActiveIncaHead, syncIncaFile, uploadIncaFile, type ActiveIncaHead, type IncaSyncSummary } from "./importInca.api";

type FlowState = "idle" | "uploading" | "syncing" | "success" | "error";

function describeContext(head: ActiveIncaHead): string {
  return `${head.costr} · ${head.commessa}${head.project_code ? ` · ${head.project_code}` : ""}`;
}

export default function ImportIncaPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [result, setResult] = useState<IncaSyncSummary | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const { data: activeHead, isLoading, isError } = useQuery({
    queryKey: ["active_inca_head"],
    queryFn: loadActiveIncaHead,
    staleTime: 30_000,
  });

  const bucket = useMemo(() => {
    if (!activeHead) return null;
    try {
      return inferIncaBucket(activeHead);
    } catch {
      return null;
    }
  }, [activeHead]);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!activeHead) throw new Error("Nessun baseline INCA attivo");
      if (!bucket) throw new Error("Bucket INCA non determinabile");
      const storagePath = buildIncaUploadPath(activeHead, file.name);
      setFlowState("uploading");
      await uploadIncaFile(bucket, storagePath, file);
      setFlowState("syncing");
      return await syncIncaFile(activeHead, bucket, storagePath, file);
    },
    onSuccess: async (data) => {
      setResult(data);
      setFlowState("success");
      setErrorText(null);
      await queryClient.invalidateQueries({ queryKey: ["navemaster_view"] });
      await queryClient.invalidateQueries({ queryKey: ["navemaster_perimetro_board"] });
      await queryClient.invalidateQueries({ queryKey: ["active_inca_head"] });
    },
    onError: (error) => {
      setFlowState("error");
      setResult(null);
      setErrorText(error instanceof Error ? error.message : "Errore sconosciuto");
    },
  });

  function handleFile(file: File): void {
    setSelectedFile(file);
    setResult(null);
    setFlowState("idle");
    setErrorText(null);
  }

  function handleSync(): void {
    if (!selectedFile || importMutation.isPending) return;
    void importMutation.mutateAsync(selectedFile);
  }

  return (
    <Screen className="max-w-4xl space-y-6">
      <AppBar
        title="Import INCA"
        subtitle="Drop del nuovo XLSX, upload in Storage e sync del baseline attivo."
        action={
          <Btn onClick={handleSync} disabled={!selectedFile || !activeHead || !bucket || importMutation.isPending}>
            {flowState === "uploading" ? "Upload…" : flowState === "syncing" ? "Calcolo…" : "Sistema"}
          </Btn>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Baseline attivo" value={activeHead ? activeHead.file_name : "—"} helper={activeHead ? describeContext(activeHead) : "Carico…"} />
        <StatCard label="Bucket" value={bucket ?? "—"} helper={activeHead?.file_path ?? "Percorso INCA attivo"} />
        <StatCard label="Ship ID" value={activeHead?.ship_id ?? "—"} helper={activeHead ? `Ultimo upload ${new Date(activeHead.uploaded_at).toLocaleString("it-IT")}` : "—"} />
      </div>

      <Section title="Nuovo file XLSX" eyebrow="Storage-first">
        <Card className="space-y-4">
          <ImportDropzone
            onFile={handleFile}
            disabled={importMutation.isPending || isLoading}
            accept=".xlsx"
            title="Importa file INCA"
            description="Trascina qui il nuovo XLSX INCA oppure tocca per sceglierlo."
            badges={["XLSX", "Storage-first", "inca-sync"]}
          />

          {selectedFile ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-stone-950">{selectedFile.name}</p>
                <p className="text-xs text-stone-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <Btn
                variant="secondary"
                onClick={() => {
                  setSelectedFile(null);
                  setResult(null);
                  setFlowState("idle");
                  setErrorText(null);
                }}
                disabled={importMutation.isPending}
              >
                Rimuovi
              </Btn>
            </div>
          ) : null}

          {flowState === "uploading" ? (
            <Pill tone="sky">Upload in corso sul bucket INCA…</Pill>
          ) : null}
          {flowState === "syncing" ? (
            <Pill tone="amber">Calcolo del nuovo baseline in corso…</Pill>
          ) : null}
          {flowState === "success" && result ? (
            <Pill tone="emerald">Sync completata con successo.</Pill>
          ) : null}
          {flowState === "error" && errorText ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="font-semibold">Errore nel caricamento INCA</div>
              <div className="mt-1 whitespace-pre-wrap">{errorText}</div>
            </div>
          ) : null}
        </Card>
      </Section>

      {result ? (
        <Section title="Esito sync" eyebrow="Riepilogo">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label="Totale" value={result.total ?? 0} />
            <StatCard label="Aggiunti" value={result.diff?.addedCount ?? 0} tone={(result.diff?.addedCount ?? 0) > 0 ? "emerald" : "neutral"} />
            <StatCard label="Rimossi" value={result.diff?.removedCount ?? 0} tone={(result.diff?.removedCount ?? 0) > 0 ? "amber" : "neutral"} />
            <StatCard label="Modificati" value={result.diff?.changedCount ?? 0} tone={(result.diff?.changedCount ?? 0) > 0 ? "sky" : "neutral"} />
          </div>

          <Card>
            <p className="text-sm font-semibold text-stone-950">Counts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(result.counts ?? {}).map(([key, value]) => (
                <Pill key={key} tone="neutral">{key}: {value}</Pill>
              ))}
            </div>
          </Card>
        </Section>
      ) : null}

      {!isLoading && (!activeHead || !bucket) ? (
        <EmptyState
          title="Baseline INCA non disponibile"
          description="Serve una testa inca_files attiva con file_path valido per precompilare il contesto della sync."
          icon="📦"
          tone={isError ? "red" : "amber"}
        />
      ) : null}
    </Screen>
  );
}
