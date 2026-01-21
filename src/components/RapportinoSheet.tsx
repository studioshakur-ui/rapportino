// src/components/RapportinoSheet.tsx
// Print-only Rapportino (1 page, A4 landscape) + discrete CORE signature footer.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "../lib/supabaseClient";

type CrewRole = "ELETTRICISTA" | "MECCANICO" | "CARPENTIERE" | string;

type OperatorItem = {
  operator_id?: string | null;
  label?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  tempo_raw?: string | null;
  tempo?: string | null;
};

type SheetRow = {
  categoria: string;
  descrizione: string;
  operatori: string;
  tempo: string;
  previsto: string;
  prodotto: string;
  note: string;
  operator_items?: OperatorItem[] | null;
};

const EMPTY_ROWS_BY_CREW: Record<string, SheetRow[]> = {
  ELETTRICISTA: [
    { categoria: "STESURA", descrizione: "STESURA", operatori: "", tempo: "", previsto: "150,0", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
  ],
  MECCANICO: [
    { categoria: "MECC", descrizione: "MECCANICA", operatori: "", tempo: "", previsto: "150,0", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
  ],
  CARPENTIERE: [
    { categoria: "CARP", descrizione: "CARPENTERIA", operatori: "", tempo: "", previsto: "150,0", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
    { categoria: "", descrizione: "", operatori: "", tempo: "", previsto: "", prodotto: "", note: "" },
  ],
};

function safeText(v: unknown): string {
  return (v == null ? "" : String(v)).trim();
}

function splitLinesKeepEmpties(v: unknown): string[] {
  const s = safeText(v);
  if (!s) return [];
  return s.split(/\r?\n/);
}

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatPrevisto(value: unknown): string {
  const n = parseNumeric(value);
  if (n === null) return "";
  if (Number.isInteger(n)) return n.toFixed(1).replace(".", ",");
  return String(n).replace(".", ",");
}

function computeCanonicalOperatorLines(items: OperatorItem[]): { operators: string[]; tempos: string[] } {
  const ops: string[] = [];
  const tms: string[] = [];

  items.forEach((it) => {
    const first = safeText(it.first_name);
    const last = safeText(it.last_name);

    // Nom + prenom; fallback: label/name (legacy)
    const full = safeText(`${first} ${last}`);
    const legacy = safeText(it.label) || safeText(it.name);

    ops.push(full || legacy);

    const tempo = safeText(it.tempo_raw) || safeText(it.tempo);
    tms.push(tempo);
  });

  return { operators: ops, tempos: tms };
}

function computeLegacyAlignedLines(row: SheetRow): { operators: string[]; tempos: string[] } {
  const opLines = splitLinesKeepEmpties(row.operatori);
  const tmLines = splitLinesKeepEmpties(row.tempo);
  const len = Math.max(opLines.length, tmLines.length, 0);
  const ops = opLines.concat(Array(Math.max(0, len - opLines.length)).fill(""));
  const tms = tmLines.concat(Array(Math.max(0, len - tmLines.length)).fill(""));
  return { operators: ops, tempos: tms };
}

function MultiLineAligned({ lines, nowrap = false }: { lines: string[]; nowrap?: boolean }): JSX.Element | null {
  const usable = Array.isArray(lines) ? lines : [];
  if (usable.length === 0) return null;

  return (
    <div className={nowrap ? "core-print-ml core-print-ml-nowrap" : "core-print-ml"}>
      {usable.map((line, idx) => (
        <div key={idx} className="core-print-ml-line">
          {safeText(line)}
        </div>
      ))}
    </div>
  );
}

const IT_MONTHS = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

export default function RapportinoSheet(): JSX.Element {
  const { profile } = useAuth();

  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rapportinoId, setRapportinoId] = useState<string | null>(null);

  const [costr, setCostr] = useState("");
  const [commessa, setCommessa] = useState("");
  const [crewRole, setCrewRole] = useState<CrewRole>("ELETTRICISTA");
  const [reportDate, setReportDate] = useState("");
  const [rows, setRows] = useState<SheetRow[]>(EMPTY_ROWS_BY_CREW.ELETTRICISTA);

  const totals = useMemo(() => rows.reduce((sum, r) => sum + (parseNumeric(r.prodotto) ?? 0), 0), [rows]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    if (idParam) setRapportinoId(idParam);
    else setLoading(false);
  }, []);

  // Enable print isolation ONLY on this route.
  useEffect(() => {
    try {
      document.body.classList.add("core-print-rapportino");
    } catch {
      // ignore
    }

    return () => {
      try {
        document.body.classList.remove("core-print-rapportino");
      } catch {
        // ignore
      }
    };
  }, []);

  // Neutraliser preview classes (si l’utilisateur arrive depuis un preview)
  useEffect(() => {
    try {
      document.documentElement.classList.remove("print-preview");
      document.body.classList.remove("print-preview");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        if (!rapportinoId) {
          setLoading(false);
          return;
        }

        const { data: rap, error: rapErr } = await supabase.from("rapportini").select("*").eq("id", rapportinoId).single();
        if (rapErr) throw rapErr;

        setCostr(safeText(rap?.costr));
        setCommessa(safeText(rap?.commessa));
        setCrewRole(String(rap?.crew_role || "ELETTRICISTA").toUpperCase());
        setReportDate(safeText(rap?.report_date));

        const { data: righe, error: rowsErr } = await supabase
          .from("rapportino_rows")
          .select("*")
          .eq("rapportino_id", rapportinoId)
          .order("row_index", { ascending: true });

        if (rowsErr) throw rowsErr;

        const base = EMPTY_ROWS_BY_CREW[String(rap?.crew_role || "ELETTRICISTA").toUpperCase()] || EMPTY_ROWS_BY_CREW.ELETTRICISTA;

        if (!righe || righe.length === 0) {
          setRows(base);
        } else {
          const mapped: SheetRow[] = righe.map((r: any) => ({
            categoria: safeText(r?.categoria),
            descrizione: safeText(r?.descrizione),
            operatori: safeText(r?.operatori),
            tempo: safeText(r?.tempo),
            previsto: r?.previsto != null ? String(r.previsto) : "",
            prodotto: r?.prodotto != null ? String(r.prodotto) : "",
            note: safeText(r?.note),
            operator_items: Array.isArray(r?.operator_items) ? (r.operator_items as OperatorItem[]) : null,
          }));
          setRows(mapped);
        }

        setLoading(false);

        // After render, scale-to-fit 1 page, then print.
        setTimeout(() => {
          try {
            // scale first
            requestAnimationFrame(() => {
              try {
                const outer = outerRef.current;
                const inner = innerRef.current;
                if (!outer || !inner) {
                  window.print();
                  return;
                }

                // Reset
                outer.style.setProperty("--core-print-scale", "1");

                const maxW = outer.clientWidth;
                const maxH = outer.clientHeight;

                const contentW = inner.scrollWidth;
                const contentH = inner.scrollHeight;

                if (maxW > 0 && maxH > 0 && contentW > 0 && contentH > 0) {
                  const scaleW = maxW / contentW;
                  const scaleH = maxH / contentH;
                  const s = Math.min(1, scaleW, scaleH);

                  // Safety: do not shrink too aggressively; if it still overflows, browser will paginate.
                  const clamped = Math.max(0.78, s);
                  outer.style.setProperty("--core-print-scale", String(clamped));
                }

                // print after scale applied
                setTimeout(() => {
                  try {
                    window.print();
                  } catch {
                    // ignore
                  }
                }, 120);
              } catch {
                try {
                  window.print();
                } catch {
                  // ignore
                }
              }
            });
          } catch {
            try {
              window.print();
            } catch {
              // ignore
            }
          }
        }, 220);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Errore caricamento rapportino (print):", err);
        setLoadError("Errore nel caricamento del rapportino per la stampa.");
        setLoading(false);
      }
    }

    loadData();
  }, [rapportinoId]);

  const capoName = safeText((profile as any)?.display_name || (profile as any)?.full_name || (profile as any)?.email || "")
    .toUpperCase()
    .trim();

  let formattedDate = "";
  if (reportDate) {
    try {
      const d = new Date(`${reportDate}T00:00:00`);
      const day = String(d.getDate()).padStart(2, "0");
      const month = IT_MONTHS[d.getMonth()] || "";
      const year = d.getFullYear();
      formattedDate = `${day} ${month} ${year}`;
    } catch {
      formattedDate = reportDate;
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-700">Caricamento per la stampa…</div>;
  }

  if (loadError) {
    return <div className="min-h-screen flex items-center justify-center text-red-700">{loadError}</div>;
  }

  return (
    <div id="rapportino-document" className="min-h-screen bg-white text-black print:bg-white print:text-black">

      {/* Page box (A4 landscape inner area), scaled if needed to stay on 1 page */}
      <div className="core-print-page" ref={outerRef}>
        <div className="core-print-scale" ref={innerRef}>
          <div className="text-center text-[16px] font-semibold mb-3 tracking-wide">RAPPORTINO GIORNALIERO</div>

          <div className="mb-1.5 text-[11px]">
            <span className="font-semibold mr-2">COSTR.:</span>
            <span>{costr}</span>
          </div>

          <div className="mb-2.5 text-[11px]">
            <span className="font-semibold mr-2">COMMESSA:</span>
            <span>{commessa}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2.5 text-[11px]">
            <div className="text-left">
              <span className="font-semibold mr-2">Ruolo:</span>
              <span>{crewRole}</span>
            </div>
            <div className="text-center">
              <span className="font-semibold mr-2">Capo Squadra:</span>
              <span>{capoName}</span>
            </div>
            <div className="text-right">
              <span className="font-semibold mr-2">Data:</span>
              <span>{formattedDate}</span>
            </div>
          </div>

          <table className="rapportino-table text-[10px]">
            <thead>
              <tr>
                <th className="px-1 py-1 text-left">CATEGORIA</th>
                <th className="px-1 py-1 text-left">DESCRIZIONE</th>
                <th className="px-1 py-1 text-left">OPERATORE</th>
                <th className="px-1 py-1 text-left">TEMPO IMPIEGATO</th>
                <th className="px-1 py-1 text-right">PREVISTO</th>
                <th className="px-1 py-1 text-right">PRODOTTO</th>
                <th className="px-1 py-1 textext-left">NOTE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const items = Array.isArray(r.operator_items) ? r.operator_items : [];

                const aligned =
                  items.length > 0
                    ? computeCanonicalOperatorLines(items)
                    : computeLegacyAlignedLines(r);

                const operatorLines = aligned.operators;
                const tempoLines = aligned.tempos;

                return (
                  <tr key={idx} className="align-top">
                    <td className="px-1 py-1">{r.categoria}</td>
                    <td className="px-1 py-1 core-print-wrap">{r.descrizione}</td>
                    <td className="px-1 py-1">
                      <MultiLineAligned lines={operatorLines} nowrap={true} />
                    </td>
                    <td className="px-1 py-1">
                      <MultiLineAligned lines={tempoLines} nowrap={true} />
                    </td>
                    <td className="px-1 py-1 text-right tabular-nums">{formatPrevisto(r.previsto)}</td>
                    <td className="px-1 py-1 text-right tabular-nums">{r.prodotto}</td>
                    <td className="px-1 py-1 core-print-wrap">{r.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-2 text-[11px] flex justify-end">
            <span className="font-semibold mr-2">Totale prodotto:</span>
            <span className="tabular-nums">{totals ? String(totals).replace(".", ",") : ""}</span>
          </div>
        </div>
        <div className="core-print-signature print-only">Copyright © 2026 CNCS — CORE</div>
      </div>
    </div>
  );
}