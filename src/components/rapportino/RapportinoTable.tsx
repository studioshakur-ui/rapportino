import React, { useMemo } from "react";

import { cn } from "../../ui/cn";
import { splitLinesKeepEmpties } from "../../utils/text";

export type RapportinoOperatorItem = {
  operator_id?: string;
  label?: string;
};

export type RapportinoRow = {
  id?: string;
  categoria?: string;
  descrizione?: string;
  descrizione_attivita?: string;
  operatori?: string;
  operator_items?: RapportinoOperatorItem[];
  tempo?: string;
  previsto?: string | number;
  prodotto?: string | number;
  note?: string;
};

type Props = {
  rows: RapportinoRow[];
  /**
   * Productivity index per operator + activity.
   * Key format: `${operatorId}||${categoria}||${descrizione}` (lowercased + trimmed)
   */
  productivityIndexMap?: Map<string, number>;
  onRowChange?: (rowIndex: number, field: keyof RapportinoRow | string, value: string) => void;
  onRemoveRow?: (rowIndex: number) => void;
  onOpenOperatorPicker?: (rowIndex: number) => void;
  onOpenTempoPicker?: (rowIndex: number) => void;
  onRemoveOperatorFromRow?: (rowIndex: number, operatorId: string) => void;
  onDropOperatorToRow?: (rowIndex: number, dropped: { id: string; name: string }) => void;
  readOnly?: boolean;
};

function hasNonZeroNumber(v: any): boolean {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && Math.abs(n) > 0;
}

function hasAnyTempoValue(tempo: any): boolean {
  const lines = splitLinesKeepEmpties(tempo);
  return lines.some((l) => hasNonZeroNumber(l));
}

function hasAnyOperatorValueLegacy(operatori: any): boolean {
  const lines = splitLinesKeepEmpties(operatori);
  return lines.some((l) => String(l ?? "").trim().length > 0);
}

function prettyMultiline(value: any): string {
  const lines = splitLinesKeepEmpties(value).map((x) => String(x ?? "").trim());
  const filtered = lines.filter((x) => x.length > 0);
  return filtered.join("\n");
}

function readDroppedOperator(e: React.DragEvent): { id?: string; name?: string } | null {
  try {
    const raw = e.dataTransfer.getData("application/json");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id || parsed.name)) return parsed;
    }
  } catch {
    // ignore
  }
  try {
    const text = e.dataTransfer.getData("text/plain");
    if (text && text.trim()) return { name: text.trim() };
  } catch {
    // ignore
  }
  return null;
}

function appendLegacyOperatorLine(operatori: any, name: string): string {
  const current = splitLinesKeepEmpties(operatori);
  const trimmed = current.map((l) => String(l ?? "").trim()).filter((x) => x.length > 0);
  if (!trimmed.includes(name)) trimmed.push(name);
  return trimmed.join("\n");
}

function formatPrevisto(v: any): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s;
}

function PrintLines({ value, numeric, align }: { value: any; numeric?: boolean; align?: "left" | "center" | "right" }) {
  const text = String(value ?? "");
  const cls = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <div className={cn("whitespace-pre-wrap leading-5 text-[11px]", cls)}>
      {numeric ? text : text}
    </div>
  );
}

export default function RapportinoTable({
  rows,
  productivityIndexMap,
  onRowChange,
  onRemoveRow,
  onRemoveOperatorFromRow,
  readOnly = false,
  onOpenOperatorPicker,
  onOpenTempoPicker,
  onDropOperatorToRow,
}: Props): JSX.Element {
  const ro = readOnly || !onRowChange;

  const norm = (v: unknown) =>
    String(v ?? "")
      .trim()
      .toLowerCase();

  const canonicalByIdx = useMemo(() => {
    return (rows || []).map((r) => Array.isArray((r as any)?.operator_items));
  }, [rows]);

  return (
    <div className="mt-3">
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="rapportino-table text-[11px] w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-2 py-2 text-left w-[120px]">CATEGORIA</th>
              <th className="px-2 py-2 text-left w-[300px]">DESCRIZIONE ATTIVITÀ</th>
              <th className="px-2 py-2 text-left w-[240px]">
                OPERATORE
                <div className="text-[10px] font-normal text-slate-500">(tap per scegliere / drag&drop)</div>
              </th>
              <th className="px-2 py-2 text-center w-[110px]">
                TEMPO
                <div className="text-[10px] font-normal text-slate-500">(ORE)</div>
              </th>
              <th className="px-2 py-2 text-right w-[90px]">PREVISTO</th>
              <th className="px-2 py-2 text-right w-[90px]">
                PRODOTTO
                <div className="text-[10px] font-normal text-slate-500">(MT)</div>
              </th>
              <th className="px-2 py-2 text-left">NOTE</th>
              <th className="px-2 py-2 text-center w-[80px] rapportino-col-indice">INDICE</th>
              {!ro ? <th className="px-2 py-2 text-center w-[44px] no-print rapportino-col-actions">×</th> : null}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, idx) => {
              const isCanonical = canonicalByIdx[idx];

              const canonItems = Array.isArray(r.operator_items) ? r.operator_items : [];
              const legacyHasOps = hasAnyOperatorValueLegacy(r.operatori);

              const hasOperators = isCanonical ? canonItems.length > 0 : legacyHasOps;
              const hasValues = hasNonZeroNumber(r.previsto) || hasNonZeroNumber(r.prodotto) || hasAnyTempoValue(r.tempo);
              const isIncomplete = hasOperators !== hasValues;
              const catKey = norm((r as any)?.categoria);
              const descText = String((r as any)?.descrizione_attivita ?? (r as any)?.descrizione ?? "");
              const descKey = norm(descText);

              const indiceText = (() => {
                const m = productivityIndexMap;
                if (!m || m.size === 0) {
                  return "";
                }

                if (isCanonical) {
                  const items = Array.isArray((r as any)?.operator_items) ? (r as any).operator_items : [];
                  const lines = items.map((it: any) => {
                    const opId = String(it?.operator_id ?? "").trim();
                    if (!opId) return "—";
                    const key = `${opId}||${catKey}||${descKey}`;
                    const v = m.get(key);
                    return typeof v === "number" && Number.isFinite(v) ? v.toFixed(2) : "—";
                  });
                  return lines.join("\n");
                }

                const opLines = splitLinesKeepEmpties((r as any)?.operatori);
                return opLines.map(() => "—").join("\n");
              })();

              const tempoPillEnabled = !ro && hasOperators;

              return (
                <tr key={String(r.id ?? idx)} className="align-top" data-ot-wrap>
                  {/* CATEGORIA (LOCKED) */}
                  <td className="px-2 py-2">
                    <input
                      className={cn("w-full bg-transparent outline-none", "opacity-90 cursor-not-allowed")}
                      value={r.categoria || ""}
                      onChange={undefined}
                      disabled={true}
                      readOnly={true}
                      title="Colonna gestita dal Catalogo"
                    />
                  </td>

                  {/* DESCRIZIONE (LOCKED) */}
                  <td className="px-2 py-2">
                    <input
                      className={cn("w-full bg-transparent outline-none", "opacity-90 cursor-not-allowed")}
                      value={(r.descrizione_attivita ?? r.descrizione) || ""}
                      onChange={undefined}
                      disabled={true}
                      readOnly={true}
                      title="Colonna gestita dal Catalogo"
                    />
                  </td>

                  {/* OPERATORE */}
                  <td className="px-2 py-2">
                    {isCanonical ? (
                      <>
                        <button
                          type="button"
                          className={cn(
                            "no-print w-full rounded-md border border-slate-200 bg-white/70 px-2 py-2 text-left",
                            ro ? "cursor-not-allowed opacity-70" : "hover:bg-slate-50"
                          )}
                          onClick={() => {
                            if (ro) return;
                            onOpenOperatorPicker?.(idx);
                          }}
                          onDragOver={(e) => {
                            if (ro) return;
                            e.preventDefault();
                            try {
                              e.dataTransfer.dropEffect = "copy";
                            } catch {
                              // ignore
                            }
                          }}
                          onDrop={(e) => {
                            if (ro) return;
                            e.preventDefault();
                            const dropped = readDroppedOperator(e);
                            if (!dropped) return;

                            if (onDropOperatorToRow) {
                              onDropOperatorToRow(idx, { id: String(dropped.id || ""), name: String(dropped.name || "") });
                              return;
                            }

                            if (!onRowChange) return;
                            const next = appendLegacyOperatorLine(r.operatori, String(dropped.name || "").trim());
                            onRowChange(idx, "operatori", next);
                          }}
                        >
                          {/* PRINT VIEW */}
                          <div className="print-only whitespace-pre-wrap leading-5 text-[11px]">
                            {prettyMultiline(canonItems.map((it) => it?.label).filter(Boolean).join("\n"))}
                          </div>

                          {/* SCREEN VIEW */}
                          <div className="no-print">
                            {canonItems.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {canonItems.map((it: any, i: number) => {
                                  const label = String(it?.label ?? "").trim();
                                  const opId = String(it?.operator_id ?? "").trim();
                                  if (!label) return null;

                                  return (
                                    <span
                                      key={`${opId || "op"}-${i}`}
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold"
                                    >
                                      {label}
                                      {!ro ? (
                                        <button
                                          type="button"
                                          className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 text-[10px] text-slate-700 hover:bg-slate-50"
                                          title="Rimuovi"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const id = String((it as any)?.operator_id ?? "").trim();
                                            if (id) onRemoveOperatorFromRow?.(idx, id);
                                          }}
                                        >
                                          ×
                                        </button>
                                      ) : null}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-slate-400">—</div>
                            )}
                          </div>
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="print-only whitespace-pre-wrap leading-5 text-[11px]">
                          {prettyMultiline(r.operatori)}
                        </div>

                        <textarea
                          className={cn(
                            "no-print w-full resize-none bg-transparent outline-none",
                            ro ? "opacity-80 cursor-not-allowed" : ""
                          )}
                          value={String(r.operatori ?? "")}
                          onChange={ro ? undefined : (e) => onRowChange?.(idx, "operatori", e.target.value)}
                          disabled={ro}
                          readOnly={ro}
                          placeholder="—"
                          rows={Math.max(2, splitLinesKeepEmpties(r.operatori).length || 2)}
                        />
                      </>
                    )}
                  </td>

                  {/* TEMPO */}
                  <td className="px-2 py-2 text-center">
                    <div className="print-only text-center">
                      <PrintLines value={prettyMultiline(r.tempo)} numeric={true} align="center" />
                    </div>

                    <div className="no-print">
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded-md border border-slate-200 bg-white/70 px-2 py-2 text-center",
                          ro || !tempoPillEnabled ? "cursor-not-allowed opacity-70" : "hover:bg-slate-50"
                        )}
                        onClick={() => {
                          if (ro) return;
                          if (!tempoPillEnabled) return;
                          onOpenTempoPicker?.(idx);
                        }}
                        disabled={ro || !tempoPillEnabled}
                      >
                        <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-500">TEMPO</div>
                        <div className="mt-1 whitespace-pre-wrap text-[12px] font-semibold leading-5 text-slate-900">
                          {prettyMultiline(r.tempo) || "—"}
                        </div>
                      </button>
                    </div>
                  </td>

                  {/* PREVISTO */}
                  <td className="px-2 py-2 text-right">
                    <input
                      className={cn("w-full bg-transparent outline-none text-right", ro ? "opacity-80 cursor-not-allowed" : "")}
                      value={formatPrevisto(r.previsto)}
                      onChange={ro ? undefined : (e) => onRowChange?.(idx, "previsto", e.target.value)}
                      disabled={ro}
                      readOnly={ro}
                      placeholder="0"
                      inputMode="decimal"
                    />
                  </td>

                  {/* PRODOTTO */}
                  <td className="px-2 py-2 text-right">
                    <input
                      className={cn("w-full bg-transparent outline-none text-right", ro ? "opacity-80 cursor-not-allowed" : "")}
                      value={String(r.prodotto ?? "")}
                      onChange={ro ? undefined : (e) => onRowChange?.(idx, "prodotto", e.target.value)}
                      disabled={ro}
                      readOnly={ro}
                      placeholder="0"
                      inputMode="decimal"
                    />
                  </td>

                  {/* NOTE */}
                  <td className="px-2 py-2">
                    {/* ✅ PRINT: texte wrap (pas d’input, pas de placeholder) */}
                    <div className="print-only whitespace-pre-wrap leading-5 text-[11px] text-slate-900">
                      {String(r.note ?? "").trim()}
                    </div>

                    {/* ✅ SCREEN: input inchangé */}
                    <input
                      className={cn("no-print w-full bg-transparent outline-none", ro ? "opacity-80 cursor-not-allowed" : "")}
                      value={String(r.note ?? "")}
                      onChange={ro ? undefined : (e) => onRowChange?.(idx, "note", e.target.value)}
                      disabled={ro}
                      readOnly={ro}
                      placeholder="Note…"
                    />
                  </td>

                  {/* INDICE */}
                  <td className="px-2 py-2 text-center rapportino-col-indice">
                    <div className="print-only text-center">
                      <PrintLines value={indiceText} numeric={true} align="center" />
                    </div>

                    <div className="no-print text-[12px] font-semibold text-slate-700 whitespace-pre-wrap leading-5">
                      {indiceText || "—"}
                    </div>
                  </td>

                  {!ro ? (
                    <td className="px-2 py-2 text-center no-print rapportino-col-actions">
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-[12px] font-semibold text-slate-900"
                        title="Rimuovi riga"
                        onClick={() => onRemoveRow?.(idx)}
                      >
                        ×
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>

        {!ro && rows.length === 0 ? (
          <div className="no-print mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-700">
            Nessuna riga: usa <span className="font-semibold">Catalogo</span> per aggiungere attività.
          </div>
        ) : null}
      </div>
    </div>
  );
}
