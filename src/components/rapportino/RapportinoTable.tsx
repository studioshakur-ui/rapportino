// src/components/rapportino/RapportinoTable.tsx
import React, { useMemo } from "react";
import { formatPrevisto } from "../../rapportinoUtils";
import { splitLinesKeepEmpties } from "./page/rapportinoHelpers.js";

type OperatorItem = {
  operator_id?: string | number | null;
  label?: string | null;
};

export type RapportinoRow = {
  id?: string | number | null;

  // Catalog
  categoria?: string | null;
  descrizione?: string | null;

  // Canonical
  operator_items?: OperatorItem[] | null;

  // Legacy / print
  operatori?: string | null;

  // Values
  tempo?: string | null;
  previsto?: string | number | null;
  prodotto?: string | number | null;

  // Notes
  note?: string | null;
};

type DroppedOperator = { id: string | null; name: string };

type Props = {
  rows: RapportinoRow[];
  onRowChange?: (rowIndex: number, field: keyof RapportinoRow | string, value: string) => void;
  onRemoveRow?: (rowIndex: number) => void;
  onRemoveOperatorFromRow?: (rowIndex: number, operatorId: string | number) => void;
  readOnly?: boolean;
  onOpenOperatorPicker?: (rowIndex: number) => void;
  onOpenTempoPicker?: (rowIndex: number) => void;
  onDropOperatorToRow?: (rowIndex: number, dropped: DroppedOperator) => void;
};

function PrintText({ value }: { value: unknown }) {
  return <div className="rapportino-print-text">{String(value ?? "")}</div>;
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function prettyMultiline(v: unknown) {
  if (!v) return "";
  return String(v ?? "").replace(/\r/g, "");
}

function hasNonZeroNumber(v: unknown) {
  if (v === null || v === undefined) return false;
  const n = Number(v);
  return Number.isFinite(n) && n !== 0;
}
function hasAnyTempoValue(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return s.split("\n").some((x) => String(x || "").trim().length > 0);
}
function hasAnyOperatorValueLegacy(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return s.split("\n").some((x) => String(x || "").trim().length > 0);
}

function readDroppedOperator(e: React.DragEvent) {
  try {
    const name = e.dataTransfer.getData("text/core-operator-name");
    const id = e.dataTransfer.getData("text/core-operator-id");
    const nm = String(name || "").trim();
    const opId = String(id || "").trim();
    if (!nm) return null;
    return { id: opId || null, name: nm };
  } catch {
    return null;
  }
}

export default function RapportinoTable({
  rows,
  onRowChange,
  onRemoveRow,
  onRemoveOperatorFromRow,
  readOnly = false,
  onOpenOperatorPicker,
  onOpenTempoPicker,
  onDropOperatorToRow,
}: Props): JSX.Element {
  const ro = readOnly || !onRowChange;

  // IMPORTANT: on garde ton comportement actuel : canonical = items.length > 0
  const canonicalByIdx = useMemo(() => {
    return rows.map((r) => {
      const items = Array.isArray(r?.operator_items) ? r.operator_items : [];
      return items.length > 0;
    });
  }, [rows]);

  return (
    <div className="mt-3">
      {/* ───────────────────────── MOBILE (md-) : cards, no table, no horizontal pan ───────────────────────── */}
      <div className="md:hidden space-y-3">
        {rows.map((r, idx) => {
          const isCanonical = canonicalByIdx[idx];

          const catalogColsLocked = true; // identique
          void catalogColsLocked; // (évite warning TS si unused)

          const opLines = splitLinesKeepEmpties(r.operatori);
          const canonItems = Array.isArray(r.operator_items) ? r.operator_items : [];
          const legacyHasOps = hasAnyOperatorValueLegacy(r.operatori);

          const hasOperators = isCanonical ? canonItems.length > 0 : legacyHasOps;
          const hasValues =
            hasNonZeroNumber(r.previsto) || hasNonZeroNumber(r.prodotto) || hasAnyTempoValue(r.tempo);
          const isIncomplete = hasOperators !== hasValues;

          const tempoPillEnabled = !ro && hasOperators;

          return (
            <div key={String(r.id ?? idx)} className="rounded-2xl border border-slate-200 bg-white/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] tracking-[0.22em] uppercase text-slate-500">Riga {idx + 1}</div>

                  <span
                    className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700"
                    title="Catalogo"
                  >
                    C
                  </span>

                  {!ro && isIncomplete ? (
                    <span
                      className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-900"
                      title="Riga incompleta: aggiungi operatori oppure compila prodotto/tempo"
                    >
                      !
                    </span>
                  ) : null}
                </div>

                {!ro ? (
                  <button
                    type="button"
                    className="rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-[12px] font-semibold text-slate-900"
                    title="Rimuovi riga"
                    onClick={() => onRemoveRow?.(idx)}
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <div className="mt-3 space-y-3">
                {/* CATEGORIA (LOCKED) */}
                <div>
                  <div className="text-[11px] tracking-wide uppercase text-slate-500 mb-1">Categoria</div>
                  <input
                    className={cn("w-full bg-transparent outline-none", "opacity-90 cursor-not-allowed")}
                    value={r.categoria || ""}
                    onChange={undefined}
                    disabled={true}
                    readOnly={true}
                    title="Colonna gestita dal Catalogo"
                  />
                </div>

                {/* DESCRIZIONE (LOCKED) */}
                <div>
                  <div className="text-[11px] tracking-wide uppercase text-slate-500 mb-1">Descrizione</div>
                  <input
                    className={cn("w-full bg-transparent outline-none", "opacity-90 cursor-not-allowed")}
                    value={r.descrizione || ""}
                    onChange={undefined}
                    disabled={true}
                    readOnly={true}
                    title="Colonna gestita dal Catalogo"
                  />
                </div>

                {/* OPERATORE (CLICK + DROP) */}
                <div>
                  <div className="text-[11px] tracking-wide uppercase text-slate-500 mb-1">Operatore</div>

                  {isCanonical ? (
                    <>
                      <button
                        type="button"
                        className={cn(
                          "w-full rounded-md border border-slate-200 bg-white/70 px-3 py-3 text-left",
                          ro ? "opacity-80 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50",
                          !ro ? "focus:outline-none focus:ring-2 focus:ring-sky-500/35" : ""
                        )}
                        disabled={ro}
                        title={ro ? undefined : "Tocca per scegliere… o trascina un operatore qui"}
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
                          onDropOperatorToRow?.(idx, dropped);
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
                                    <button
                                      type="button"
                                      className="rounded-full border border-slate-200 w-6 h-6 inline-flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                      title="Rimuovi operatore"
                                      aria-label={`Rimuovi ${label}`}
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        if (!operatorId) return;
                                        onRemoveOperatorFromRow?.(idx, operatorId);
                                      }}
                                    >
                                      ×
                                    </button>
                                  ) : null}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </button>

                      <div className="print-only">
                        <PrintText value={r.operatori} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-full rounded-md border border-slate-200 bg-white/60 px-3 py-3 text-[12px] text-slate-900 whitespace-pre-wrap">
                        {prettyMultiline(r.operatori) ? (
                          prettyMultiline(r.operatori)
                        ) : (
                          <span className="text-slate-400">Nomi operatori (uno per riga)</span>
                        )}
                      </div>
                      <div className="print-only">
                        <PrintText value={r.operatori} />
                      </div>
                    </>
                  )}
                </div>

                {/* TEMPO */}
                <div>
                  <div className="text-[11px] tracking-wide uppercase text-slate-500 mb-1">Tempo (ore)</div>
                  <div
                    className={cn(
                      "w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-3",
                      tempoPillEnabled
                        ? "cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/35"
                        : "opacity-70 cursor-not-allowed"
                    )}
                    role={tempoPillEnabled ? "button" : undefined}
                    tabIndex={tempoPillEnabled ? 0 : -1}
                    title={
                      !hasOperators ? "Prima inserisci almeno un operatore" : ro ? undefined : "Tocca per impostare le ore…"
                    }
                    onClick={() => {
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Tempo</div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">
                          {hasOperators
                            ? `${opLines.filter((x: unknown) => String(x || "").trim()).length || opLines.length} op`
                            : "0 op"}
                        </span>
                        {tempoPillEnabled ? <span className="text-[12px] text-slate-400">›</span> : null}
                      </div>
                    </div>

                    <div className="mt-1 text-[12px] font-semibold text-slate-900 text-center whitespace-pre-wrap leading-5">
                      {prettyMultiline(r.tempo) ? prettyMultiline(r.tempo) : "Tocca per impostare…"}
                    </div>
                  </div>

                  <div className="print-only text-center">
                    <PrintText value={r.tempo} />
                  </div>
                </div>

                {/* PREVISTO (LOCKED) */}
                <div>
                  <div className="text-[11px] tracking-wide uppercase text-slate-500 mb-1">Previsto</div>
                  <input
                    className={cn("w-full bg-transparent outline-none", "opacity-90 cursor-not-allowed")}
                    value={formatPrevisto(r.previsto)}
                    onChange={undefined}
                    disabled={true}
                    readOnly={true}
                    title="Colonna gestita dal Catalogo"
                  />
                </div>

                {/* PRODOTTO (editable) */}
                <div>
                  <div className="text-[11px] tracking-wide uppercase text-slate-500 mb-1">Prodotto (mt)</div>
                  <input
                    className={cn(
                      "w-full bg-transparent outline-none text-right",
                      ro ? "opacity-80 cursor-not-allowed" : ""
                    )}
                    value={String(r.prodotto ?? "")}
                    onChange={ro ? undefined : (e) => onRowChange?.(idx, "prodotto", e.target.value)}
                    disabled={ro}
                    readOnly={ro}
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>

                {/* NOTE (editable) */}
                <div>
                  <div className="text-[11px] tracking-wide uppercase text-slate-500 mb-1">Note</div>
                  <input
                    className={cn("w-full bg-transparent outline-none", ro ? "opacity-80 cursor-not-allowed" : "")}
                    value={String(r.note ?? "")}
                    onChange={ro ? undefined : (e) => onRowChange?.(idx, "note", e.target.value)}
                    disabled={ro}
                    readOnly={ro}
                    placeholder="Note…"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Guardrail visuel (catalog-only) */}
        {!ro && rows.length === 0 ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-700">
            Nessuna riga: usa <span className="font-semibold">Catalogo</span> per aggiungere attività.
          </div>
        ) : null}
      </div>

      {/* ───────────────────────── DESKTOP (md+) : ton tableau inchangé ───────────────────────── */}
      <div className="hidden md:block">
        <table className="rapportino-table text-[11px] w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-2 py-2 text-left w-[140px]">CATEGORIA</th>
              <th className="px-2 py-2 text-left w-[360px]">DESCRIZIONE ATTIVITÀ</th>

              <th className="px-2 py-2 text-left w-[260px]">
                OPERATORE
                <div className="text-[10px] text-slate-500 font-normal">(tap per scegliere / drag&drop)</div>
              </th>

              <th className="px-2 py-2 text-center w-[140px]">
                TEMPO
                <br />
                <span className="text-[10px] text-slate-500">(ORE)</span>
              </th>

              <th className="px-2 py-2 text-right w-[120px]">PREVISTO</th>
              <th className="px-2 py-2 text-right w-[120px]">
                PRODOTTO
                <br />
                <span className="text-[10px] text-slate-500">(MT)</span>
              </th>
              <th className="px-2 py-2 text-left">NOTE</th>
              {!ro && <th className="px-2 py-2 text-center w-[60px] no-print">×</th>}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, idx) => {
              const isCanonical = canonicalByIdx[idx];

              // ENFORCEMENT: colonnes Catalog = non éditables (même si pas activity_id)
              const catalogColsLocked = true;
              void catalogColsLocked;

              const opLines = splitLinesKeepEmpties(r.operatori);
              const canonItems = Array.isArray(r.operator_items) ? r.operator_items : [];
              const legacyHasOps = hasAnyOperatorValueLegacy(r.operatori);

              const hasOperators = isCanonical ? canonItems.length > 0 : legacyHasOps;
              const hasValues =
                hasNonZeroNumber(r.previsto) || hasNonZeroNumber(r.prodotto) || hasAnyTempoValue(r.tempo);
              const isIncomplete = hasOperators !== hasValues;

              const tempoPillEnabled = !ro && hasOperators;

              return (
                <tr key={String(r.id ?? idx)} className="align-top" data-ot-wrap>
                  {/* CATEGORIA (LOCKED) */}
                  <td className="px-2 py-2">
                    <div className="flex items-start gap-2">
                      <input
                        className={cn("w-full bg-transparent outline-none", "opacity-90 cursor-not-allowed")}
                        value={r.categoria || ""}
                        onChange={undefined}
                        disabled={true}
                        readOnly={true}
                        title="Colonna gestita dal Catalogo"
                      />
                      <span
                        className="no-print inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700"
                        title="Catalogo"
                      >
                        C
                      </span>
                      {!ro && isIncomplete ? (
                        <span
                          className="no-print inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-900"
                          title="Riga incompleta: aggiungi operatori oppure compila prodotto/tempo"
                        >
                          !
                        </span>
                      ) : null}
                    </div>
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

                  {/* OPERATORE (CLICK + DROP) */}
                  <td className="px-2 py-2">
                    {isCanonical ? (
                      <>
                        <button
                          type="button"
                          className={cn(
                            "no-print w-full rounded-md border border-slate-200 bg-white/70 px-2 py-2 text-left",
                            ro ? "opacity-80 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50",
                            !ro ? "focus:outline-none focus:ring-2 focus:ring-sky-500/35" : ""
                          )}
                          disabled={ro}
                          title={ro ? undefined : "Tocca per scegliere… o trascina un operatore qui"}
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
                            onDropOperatorToRow?.(idx, dropped);
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
                                      <button
                                        type="button"
                                        className="rounded-full border border-slate-200 w-6 h-6 inline-flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                        title="Rimuovi operatore"
                                        aria-label={`Rimuovi ${label}`}
                                        onClick={(ev) => {
                                          ev.stopPropagation();
                                          if (!operatorId) return;
                                          onRemoveOperatorFromRow?.(idx, operatorId);
                                        }}
                                      >
                                        ×
                                      </button>
                                    ) : null}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </button>

                        <div className="print-only">
                          <PrintText value={r.operatori} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="no-print w-full rounded-md border border-slate-200 bg-white/60 px-2 py-2 text-[12px] text-slate-900 whitespace-pre-wrap">
                          {prettyMultiline(r.operatori) ? (
                            prettyMultiline(r.operatori)
                          ) : (
                            <span className="text-slate-400">Nomi operatori (uno per riga)</span>
                          )}
                        </div>
                        <div className="print-only">
                          <PrintText value={r.operatori} />
                        </div>
                      </>
                    )}
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
                      onKeyDown={(e) => {
                        if (!tempoPillEnabled) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpenTempoPicker?.(idx);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Tempo</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">
                            {hasOperators
                              ? `${opLines.filter((x: unknown) => String(x || "").trim()).length || opLines.length} op`
                              : "0 op"}
                          </span>
                          {tempoPillEnabled ? <span className="text-[12px] text-slate-400">›</span> : null}
                        </div>
                      </div>

                      <div className="mt-1 text-[12px] font-semibold text-slate-900 text-center whitespace-pre-wrap leading-5">
                        {prettyMultiline(r.tempo) ? prettyMultiline(r.tempo) : "Tocca per impostare…"}
                      </div>
                    </div>

                    <div className="print-only text-center">
                      <PrintText value={r.tempo} />
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

                  {/* PRODOTTO (editable) */}
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

                  {/* NOTE (editable) */}
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

                  {/* REMOVE ROW */}
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

        {/* Guardrail visuel (catalog-only) */}
        {!ro && rows.length === 0 ? (
          <div className="no-print mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-700">
            Nessuna riga: usa <span className="font-semibold">Catalogo</span> per aggiungere attività.
          </div>
        ) : null}
      </div>
    </div>
  );
}
