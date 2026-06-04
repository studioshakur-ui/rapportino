// src/modules/whatsapp/WhatsAppIntakePage.tsx
// Module 4 — WhatsApp Intake : import historique .txt, parsing, événements
// structurés en STAGING. Aucune écriture INCA directe (events pending uniquement).
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Card, Empty, Badge, useSurface } from "../_ui/kit";
import { importWhatsappTxt, listImports, listMessages, type ImportResult } from "./api";
import type { WhatsappMessage } from "../../core/db/types";

export default function WhatsAppIntakePage(): JSX.Element {
  const { subtle, btnPrimary } = useSurface();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  const imports = useQuery({ queryKey: ["wa_imports"], queryFn: listImports });
  const messages = useQuery({
    queryKey: ["wa_messages", selected],
    queryFn: () => listMessages(selected as string),
    enabled: !!selected,
  });

  const doImport = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      return importWhatsappTxt(file.name, text);
    },
    onSuccess: (res) => {
      setLastResult(res);
      setSelected(res.importId);
      void qc.invalidateQueries({ queryKey: ["wa_imports"] });
      void qc.invalidateQueries({ queryKey: ["core_events"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="WhatsApp Intake"
        subtitle="Import .txt → parsing → événements en staging (validation requise)"
      />

      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className={`${btnPrimary} cursor-pointer`}>
            {doImport.isPending ? "Import…" : "Importer un export WhatsApp (.txt)"}
            <input
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doImport.mutate(f);
              }}
            />
          </label>
          {lastResult && (
            <span className={`text-sm ${subtle}`}>
              {lastResult.messages} messages · {lastResult.eventsCreated} événements proposés
            </span>
          )}
        </div>
        <p className={`mt-2 text-xs ${subtle}`}>
          ⚠ Aucune écriture INCA : les messages structurables créent des événements <b>pending</b> à
          valider dans Priorités.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Imports list */}
        <Card className="divide-y divide-slate-700/30">
          {imports.isLoading && <Empty>Chargement…</Empty>}
          {!imports.isLoading && (imports.data?.length ?? 0) === 0 && <Empty>Aucun import.</Empty>}
          {imports.data?.map((imp) => (
            <button
              key={imp.id}
              type="button"
              onClick={() => setSelected(imp.id)}
              className={`block w-full px-4 py-3 text-left text-sm ${
                selected === imp.id ? "bg-sky-500/10" : ""
              }`}
            >
              <div className="truncate font-medium">{imp.file_name}</div>
              <div className={`text-xs ${subtle}`}>
                {imp.message_count} msg · {new Date(imp.imported_at).toLocaleDateString("fr-FR")}
              </div>
            </button>
          ))}
        </Card>

        {/* Messages of selected import */}
        <Card className="divide-y divide-slate-700/30">
          {!selected && <Empty>Sélectionne un import.</Empty>}
          {selected && messages.isLoading && <Empty>Chargement…</Empty>}
          {selected &&
            messages.data?.map((m: WhatsappMessage) => {
              const norm = m.parsed_payload as {
                kind?: string;
                cavo_code?: string;
                meters?: number;
                confidence?: number;
              };
              const structured = !!m.core_event_id;
              return (
                <div key={m.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{m.author ?? "système"}</span>
                    <span className={`text-xs ${subtle}`}>
                      {m.sent_at ? new Date(m.sent_at).toLocaleString("fr-FR") : "—"}
                    </span>
                  </div>
                  <div className="mt-0.5 whitespace-pre-wrap text-sm">{m.raw_text}</div>
                  {structured && (
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone="sky">{norm.kind}</Badge>
                      {norm.cavo_code && <span className="text-xs font-mono">{norm.cavo_code}</span>}
                      {norm.meters != null && <span className={`text-xs ${subtle}`}>{norm.meters} m</span>}
                      <Badge tone="amber">→ pending</Badge>
                    </div>
                  )}
                </div>
              );
            })}
        </Card>
      </div>
    </div>
  );
}
