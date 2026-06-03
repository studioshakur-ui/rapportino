// src/modules/inca/IncaCenterPage.tsx
// Module 3 — INCA Center : recherche câble, situation/stato, mètres
// théoriques/posés/restants, et import Excel (PARSE + PREVIEW, lecture seule).
//
// L'import ne réécrit JAMAIS inca_cavi directement depuis le client : il parse et
// affiche un aperçu. La persistance reste à l'edge function inca-import (DRY_RUN).
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Card, Empty, Badge, useSurface } from "../_ui/kit";
import { searchCavi, computeSituation } from "./api";
import { parseIncaXlsx, type ParsedCavo } from "./parseIncaXlsx";

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);
}

function situToTone(s: string | null): "neutral" | "sky" | "emerald" | "amber" | "rose" {
  const v = (s ?? "").toUpperCase();
  if (v === "P" || v === "T") return "emerald";
  if (v === "B") return "rose";
  if (v === "R") return "amber";
  if (v === "L") return "sky";
  return "neutral";
}

export default function IncaCenterPage(): JSX.Element {
  const { input, subtle, btn } = useSurface();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [preview, setPreview] = useState<ParsedCavo[] | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [parsing, setParsing] = useState(false);

  const results = useQuery({
    queryKey: ["inca_search", debounced],
    queryFn: () => searchCavi(debounced),
  });

  // simple debounce on submit (Enter / button)
  const submit = () => setDebounced(term);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    try {
      const parsed = await parseIncaXlsx(file);
      setPreview(parsed);
      setPreviewName(file.name);
    } finally {
      setParsing(false);
    }
  };

  const previewStats = useMemo(() => {
    if (!preview) return null;
    const teo = preview.reduce((s, p) => s + (p.lunghezza_disegno ?? p.lunghezza_calcolo ?? 0), 0);
    return { count: preview.length, teo };
  }, [preview]);

  return (
    <div>
      <PageHeader
        title="INCA Center"
        subtitle="Recherche câble · situation · mètres · import Excel"
      />

      {/* Import Excel (parse + preview) */}
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className={`${btn} cursor-pointer`}>
            {parsing ? "Lecture…" : "Importer un Excel INCA"}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
          {previewStats && (
            <span className={`text-sm ${subtle}`}>
              {previewName} · {previewStats.count} câbles · {fmt(previewStats.teo)} m théoriques (aperçu, non persisté)
            </span>
          )}
        </div>
        {preview && preview.length > 0 && (
          <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-slate-700/30">
            <table className="w-full text-sm">
              <thead className={`sticky top-0 ${subtle}`}>
                <tr className="text-left">
                  <th className="px-3 py-2">Marca</th>
                  <th className="px-3 py-2">Codice</th>
                  <th className="px-3 py-2">Stato</th>
                  <th className="px-3 py-2 text-right">m disegno</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 200).map((p, i) => (
                  <tr key={`${p.marca_cavo}-${i}`} className="border-t border-slate-700/20">
                    <td className="px-3 py-1.5 font-medium">{p.marca_cavo ?? "—"}</td>
                    <td className="px-3 py-1.5">{p.codice_cavo ?? "—"}</td>
                    <td className="px-3 py-1.5">{p.stato_cantiere ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right">
                      {p.lunghezza_disegno != null ? fmt(p.lunghezza_disegno) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recherche câble */}
      <div className="mb-4 flex gap-2">
        <input
          className={input}
          placeholder="Rechercher (marca, codice, zona)…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button type="button" className={btn} onClick={submit}>
          Chercher
        </button>
      </div>

      <Card className="divide-y divide-slate-700/30">
        {results.isLoading && <Empty>Recherche…</Empty>}
        {results.isError && <Empty>Erreur INCA.</Empty>}
        {!results.isLoading && (results.data?.length ?? 0) === 0 && (
          <Empty>{debounced ? "Aucun câble." : "Lance une recherche."}</Empty>
        )}
        {results.data?.map((c) => {
          const s = computeSituation(c);
          return (
            <div key={c.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.marca_cavo ?? c.codice ?? "—"}</span>
                  <Badge tone={situToTone(s.situazione)}>{s.situazione ?? "—"}</Badge>
                </div>
                <span className={`text-xs ${subtle}`}>
                  {[c.zona_da, c.zona_a].filter(Boolean).join(" → ") || ""}
                </span>
              </div>
              <div className={`mt-1 flex gap-4 text-xs ${subtle}`}>
                <span>Théorique {fmt(s.theoretical)} m</span>
                <span className="text-emerald-400">Posé {fmt(s.posed)} m</span>
                <span className="text-amber-400">Restant {fmt(s.remaining)} m</span>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
