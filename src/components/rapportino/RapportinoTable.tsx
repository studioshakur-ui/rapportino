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

function countLegacyOperators(operatori: any): number {
  const lines = splitLinesKeepEmpties(operatori);
  return lines.filter((l) => String(l ?? "").trim().length > 0).length;
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
              <th className="px-2 py-2 text-center w-[80px]">INDICE</th>
              {!ro ? <th className="px-2 py-2 text-center w-[44px]">×</th> : null}
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
              const descKey = norm((r as any)?.descrizione);

              const indiceText = (() => {
                const m = productivityIndexMap;
                if (!m || m.size === 0) {
                  // Keep the column stable even when KPI data is not available.
                  return "";
                }

                // Canonical rows: 1 line per operator_item
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

                // Legacy rows: no operator_id => show placeholders (avoid wrong attribution)
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
                      value={r.descrizione || ""}
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

                            // fallback -> legacy text
                            if (!onRowChange) return;
                            const next = appendLegacyOperatorLine(r.operatori, String(dropped.name || "").trim());
                            onRowChange(idx, "operatori", next);
                          }}
                        >
                          <div className="flex flex-wrap gap-2">
                            {canonItems.length === 0 ? (
                              <span className="text-slate-400 text-[12px]">Tocca per scegliere…</span>
                            ) : (
                              canonItems.map((it) => {
                                const operatorId = it?.operator_id;
                                const label = String(it?.label || "").trim() || "Operatore";
                                return (
                                  <span
                                    key={String(operatorId)}
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-900"
                                    title={label}
                                  >
                                    <span className="max-w-[180px] truncate">{label}</span>
                                    {!ro ? (
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        className="rounded-full border border-slate-200 w-6 h-6 inline-flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                        title="Rimuovi operatore"
                                        aria-label={`Rimuovi ${label}`}
                                        onClick={(ev) => {
                                          ev.stopPropagation();
                                          if (!operatorId) return;
                                          onRemoveOperatorFromRow?.(idx, String(operatorId));
                                        }}
                                        onKeyDown={(ev) => {
                                          if (ev.key === "Enter" || ev.key === " ") {
                                            ev.preventDefault();
                                            ev.stopPropagation();
                                            if (!operatorId) return;
                                            onRemoveOperatorFromRow?.(idx, String(operatorId));
                                          }
                                        }}
                                      >
                                        ×
                                      </span>
                                    ) : null}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </button>

                        <div className="print-only">
                          <PrintLines value={r.operatori} />
                        </div>
                      </>
                    ) : (
                      <>
                        {ro ? (
                          <div className="no-print w-full rounded-md border border-slate-200 bg-white/60 px-2 py-2 text-[12px] text-slate-900 whitespace-pre-wrap">
                            {prettyMultiline(r.operatori) ? (
                              prettyMultiline(r.operatori)
                            ) : (
                              <span className="text-slate-400">Nomi operatori (uno per riga)</span>
                            )}
                          </div>
                        ) : (
                          <textarea
                            className="no-print w-full min-h-[72px] rounded-md border border-slate-200 bg-white/70 px-2 py-2 text-[12px] text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/35"
                            value={String(r.operatori ?? "")}
                            placeholder="Nomi operatori (uno per riga)"
                            onChange={(e) => onRowChange?.(idx, "operatori", e.target.value)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              try {
                                e.dataTransfer.dropEffect = "copy";
                              } catch {
                                // ignore
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const dropped = readDroppedOperator(e);
                              if (!dropped) return;
                              const next = appendLegacyOperatorLine(r.operatori, String(dropped.name || "").trim());
                              onRowChange?.(idx, "operatori", next);
                            }}
                          />
                        )}
                        <div className="print-only">
                          <PrintLines value={r.operatori} />
                        </div>
                      </>
                    )}

                    {isIncomplete ? (
                      <div className="no-print mt-1 text-[11px] text-amber-600">
                        Attenzione: operatori inseriti ma valori mancanti (o viceversa).
                      </div>
                    ) : null}
                  </td>

                  {/* TEMPO */}
                  <td className="px-2 py-2 text-center">
                    <div
                      className={cn(
                        "no-print w-full rounded-xl border border-slate-200 bg-white/80 px-2.5 py-2",
                        tempoPillEnabled
                          ? "cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
                          : "opacity-70 cursor-not-allowed"
                      )}
                      role={tempoPillEnabled ? "button" : undefined}
                      tabIndex={tempoPillEnabled ? 0 : -1}
                      title={!hasOperators ? "Prima inserisci almeno un operatore" : ro ? undefined : "Tocca per impostare le ore…"}
                      onClick={() => {
                        if (!tempoPillEnabled) return;
                        onOpenTempoPicker?.(idx);
                      }}
                      onPointerUp={() => {
                        if (!tempoPillEnabled) return;
                        onOpenTempoPicker?.(idx);
                      }}
                      onKeyDown={(e) => {
                        if (!tempoPillEnabled) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpenTempoPicker?.(idx);
                        }
                      }}
                    >
                      <div className="text-[10px] font-semibold tracking-[0.14em] text-slate-500">TEMPO</div>
                      <div className="mt-1 text-[12px] font-semibold text-slate-900 text-center whitespace-pre-wrap leading-5">
                        {prettyMultiline(r.tempo) ? prettyMultiline(r.tempo) : "Tocca per impostare…"}
                      </div>
                    </div>

                    <div className="print-only text-center">
                      <PrintLines value={r.tempo} numeric={true} align="center" />
                    </div>
                  </td>

                  {/* PREVISTO (LOCKED) */}
                  <td className="px-2 py-2 text-right">
                    <input
                      className={cn("w-full bg-transparent outline-none text-right", "opacity-90 cursor-not-allowed")}
                      value={formatPrevisto(r.previsto)}
                      onChange={undefined}
                      disabled={true}
                      readOnly={true}
                      title="Colonna gestita dal Catalogo"
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
                    <input
                      className={cn("w-full bg-transparent outline-none", ro ? "opacity-80 cursor-not-allowed" : "")}
                      value={String(r.note ?? "")}
                      onChange={ro ? undefined : (e) => onRowChange?.(idx, "note", e.target.value)}
                      disabled={ro}
                      readOnly={ro}
                      placeholder="Note…"
                    />
                  </td>

                  {/* INDICE */}
                  <td className="px-2 py-2 text-center">
                    <div className="print-only text-center">
                      <PrintLines value={indiceText} numeric={true} align="center" />
                    </div>

                    <div className="no-print text-[12px] font-semibold text-slate-700 whitespace-pre-wrap leading-5">
                      {indiceText || "—"}
                    </div>
                  </td>

                  {!ro ? (
                    <td className="px-2 py-2 text-center no-print">
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
