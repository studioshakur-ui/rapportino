import React, { useMemo, useState } from "react";

export type IncaTableViewMode = "standard" | "audit";

export type IncaCavoRow = {
  id: string;

  // identity
  codice: string | null;
  marca_cavo?: string | null;
  tipo?: string | null;
  sezione?: string | null;
  livello_disturbo?: string | null;
  impianto?: string | null;

  // status
  situazione: string | null;
  progress_percent?: number | null;
  stato_cantiere?: string | null;
  stato_tec?: string | null;

  // endpoints / localisation
  zona_da?: string | null;
  zona_a?: string | null;
  apparato_da?: string | null;
  apparato_a?: string | null;
  descrizione_da?: string | null;
  descrizione_a?: string | null;

  // metrics
  metri_teo?: number | null;
  metri_dis?: number | null;
  metri_totali?: number | null;

  // planning / structure
  livello?: string | null;
  wbs?: string | null;
  pagina_pdf?: string | number | null;

  // terrain (from your VIEW)
  data_posa?: string | null;
  capo_label?: string | null;

  /** Raw canonicalized XLSX row (all columns preserved). */
  raw?: Record<string, unknown> | null;
};

type Column<T> = {
  id: string;
  label: string;
  width?: string;
  align?: "left" | "right" | "center";
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
  hideOnMobile?: boolean;
};

export type IncaCaviTableProps = {
  rows: IncaCavoRow[];
  loading?: boolean;
  viewMode: IncaTableViewMode;
  onViewModeChange: (m: IncaTableViewMode) => void;
  onRowClick?: (row: IncaCavoRow) => void;

  /**
   * Optional: allow parent to visually highlight a selected row.
   * Purely a UI concern; selection state is owned by the parent.
   */
  selectedRowId?: string | null;

  // Optional: show a compact header or let parent own it
  title?: string;
};

function asText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// =============================
// SITUAZIONE semantics (CANON)
// =============================
// P = posato
// T = tagliato
// R = rifare
// B = bloccato
// E = eliminato
// L = null (missing)

const SITUAZIONI_ATOM_ORDER = ["P", "T", "R", "B", "L", "E"] as const;
type SituazioneAtom = (typeof SITUAZIONI_ATOM_ORDER)[number];

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

function progressLabel(progressPercent: number | null | undefined, situazione: string | null | undefined): string {
  const p = typeof progressPercent === "number" ? progressPercent : null;
  if (p === 50) return "5";
  if (p === 70) return "7";
  if (p === 100) return "P";

  // Fallback: if situazione is P but progress is null, treat as 100%.
  const s = norm(situazione).toUpperCase();
  if (s === "P") return "P";
  return "—";
}

function fmtMeters(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const n = Number.isFinite(v) ? Math.round(v) : 0;
  return new Intl.NumberFormat("it-IT").format(n);
}



function fmtDate(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    // If it's already a short date-like string, keep it readable.
    return s.length > 24 ? s.slice(0, 24) + "…" : s;
  }
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}
function toAtom(v: unknown): SituazioneAtom {
  const s = norm(v).toUpperCase();
  if (!s) return "L";
  if ((SITUAZIONI_ATOM_ORDER as readonly string[]).includes(s)) return s as SituazioneAtom;
  return "L";
}

function formatMeters(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(n);
}

function formatDateIT(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("it-IT");
}

function lengthRefMeters(r: IncaCavoRow): number {
  const teo = Number(r.metri_teo);
  const dis = Number(r.metri_dis);
  const tot = Number((r as any).metri_totali);

  const vals = [teo, dis, tot].filter((x) => Number.isFinite(x)) as number[];
  if (!vals.length) return 0;
  return Math.max(...vals);
}

function colorForSituazione(code: SituazioneAtom): string {
  switch (code) {
    case "P":
      return "#34d399";
    case "T":
      return "#38bdf8";
    case "R":
      return "#fbbf24";
    case "B":
      return "#e879f9";
    case "L":
      return "#94a3b8";
    case "E":
      return "#fb7185";
    default:
      return "#94a3b8";
  }
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-[12px]",
        active ? "border-slate-600 bg-slate-900/60 text-slate-100" : "border-slate-800 bg-slate-950/60 text-slate-300",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export default function IncaCaviTable({
  rows,
  loading,
  viewMode,
  onViewModeChange,
  onRowClick,
  selectedRowId = null,
  title = "Cavi",
}: IncaCaviTableProps) {
  const [sortId, setSortId] = useState<string>("codice");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Excel-like column control (incl. raw XLSX columns)
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [rawSearch, setRawSearch] = useState("");
  const [visibleRawKeys, setVisibleRawKeys] = useState<string[]>([]);

  const rawKeys = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows.slice(0, 50)) {
      const obj = (r as any)?.raw;
      if (!obj || typeof obj !== "object") continue;
      for (const k of Object.keys(obj)) {
        if (!k) continue;
        s.add(k);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const columns = useMemo<Column<IncaCavoRow>[]>(() => {
    const base: Column<IncaCavoRow>[] = [
      {
        id: "codice",
        label: "Codice",
        width: "180px",
        sortValue: (r) => norm(r.codice).toLowerCase(),
        render: (r) => (
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: colorForSituazione(toAtom((r as any)?.situazione)) }}
            />
            <span className="text-[13px] font-semibold text-slate-100">{norm(r.codice) || "—"}</span>
          </div>
        ),
      },
      {
        id: "situazione",
        label: "Sit.",
        width: "84px",
        sortValue: (r) => toAtom((r as any)?.situazione),
        render: (r) => {
          const a = toAtom((r as any)?.situazione);
          return (
            <span
              className="inline-flex items-center rounded-full border border-slate-700/70 px-2 py-0.5 text-[12px] font-semibold"
              style={{ color: colorForSituazione(a) }}
            >
              {a}
            </span>
          );
        },
      },
      {
        id: "progress",
        label: "Prog.",
        width: "72px",
        sortValue: (r) => {
          const p = typeof (r as any)?.progress_percent === "number" ? Number((r as any).progress_percent) : -1;
          return p;
        },
        render: (r) => {
          const label = progressLabel((r as any)?.progress_percent, (r as any)?.situazione);
          const is50 = label === "5";
          const is70 = label === "7";
          const isP = label === "P";
          const tone = isP
            ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
            : is70
              ? "border-sky-300/25 bg-sky-400/10 text-sky-200"
              : is50
                ? "border-amber-300/25 bg-amber-400/10 text-amber-200"
                : "border-slate-700/70 bg-white/5 text-slate-400";

          const title =
            label === "—"
              ? "Progress non disponibile"
              : label === "P"
                ? "Progress 100% (P)"
                : label === "7"
                  ? "Progress 70% (Excel=7)"
                  : "Progress 50% (Excel=5)";

          return (
            <span title={title} className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[12px] font-semibold ${tone}`}>
              {label}
            </span>
          );
        },
      },
      {
        id: "stato_cantiere",
        label: "Cantiere",
        width: "120px",
        sortValue: (r) => norm(r.stato_cantiere).toLowerCase(),
        render: (r) => <span className="text-[12px] text-slate-400">{norm(r.stato_cantiere) || "—"}</span>,
        hideOnMobile: true,
      },
      {
        id: "metri_ref",
        label: "m",
        width: "90px",
        sortValue: (r) => lengthRefMeters(r),
        render: (r) => <span className="text-[12px] text-slate-200 tabular-nums">{fmtMeters(lengthRefMeters(r))}</span>,
      },
      {
        id: "data_posa",
        label: "Data posa",
        width: "120px",
        sortValue: (r) => norm((r as any)?.data_posa),
        render: (r) => <span className="text-[12px] text-slate-400">{fmtDate((r as any)?.data_posa)}</span>,
        hideOnMobile: true,
      },
      {
        id: "capo",
        label: "Capo",
        width: "140px",
        sortValue: (r) => norm((r as any)?.capo_label).toLowerCase(),
        render: (r) => <span className="text-[12px] text-slate-300">{norm((r as any)?.capo_label) || "—"}</span>,
        hideOnMobile: true,
      },
      {
        id: "pagina_pdf",
        label: "PDF",
        width: "90px",
        sortValue: (r) => norm(r.pagina_pdf),
        render: (r) => <span className="text-[12px] text-slate-400 tabular-nums">{r.pagina_pdf ?? "—"}</span>,
        hideOnMobile: true,
      },
    ];

    let out: Column<IncaCavoRow>[] = base;

    if (viewMode === "audit") {
      const auditExtras: Column<IncaCavoRow>[] = [
        {
          id: "da_a",
          label: "DA → A",
          width: "360px",
          sortValue: (r) => (norm(r.apparato_da) + " " + norm(r.apparato_a)).toLowerCase(),
          render: (r) => (
            <div className="text-[12px] text-slate-300">
              <span className="font-semibold text-slate-200">{norm(r.apparato_da) || "—"}</span>
              <span className="text-slate-600 mx-2">→</span>
              <span className="font-semibold text-slate-200">{norm(r.apparato_a) || "—"}</span>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {norm(r.zona_da) || "—"} <span className="mx-1">→</span> {norm(r.zona_a) || "—"}
              </div>
            </div>
          ),
          hideOnMobile: true,
        },
        {
          id: "tipo",
          label: "Tipo",
          width: "140px",
          sortValue: (r) => norm(r.tipo).toLowerCase(),
          render: (r) => <span className="text-[12px] text-slate-300">{norm(r.tipo) || norm(r.marca_cavo) || "—"}</span>,
          hideOnMobile: true,
        },
        {
          id: "sezione",
          label: "Sezione",
          width: "90px",
          sortValue: (r) => norm(r.sezione).toLowerCase(),
          render: (r) => <span className="text-[12px] text-slate-300">{norm(r.sezione) || "—"}</span>,
          hideOnMobile: true,
        },
        {
          id: "disturbo",
          label: "Dist.",
          width: "90px",
          sortValue: (r) => norm(r.livello_disturbo).toLowerCase(),
          render: (r) => <span className="text-[12px] text-slate-300">{norm(r.livello_disturbo) || "—"}</span>,
          hideOnMobile: true,
        },
        {
          id: "metri_teo",
          label: "m teo",
          width: "90px",
          sortValue: (r) => Number(r.metri_teo) || 0,
          render: (r) => <span className="text-[12px] text-slate-200 tabular-nums">{fmtMeters(Number(r.metri_teo) || 0)}</span>,
          hideOnMobile: true,
        },
        {
          id: "metri_dis",
          label: "m dis",
          width: "90px",
          sortValue: (r) => Number(r.metri_dis) || 0,
          render: (r) => <span className="text-[12px] text-slate-200 tabular-nums">{fmtMeters(Number(r.metri_dis) || 0)}</span>,
          hideOnMobile: true,
        },
        {
          id: "wbs",
          label: "WBS",
          width: "160px",
          sortValue: (r) => norm(r.wbs).toLowerCase(),
          render: (r) => <span className="text-[12px] text-slate-300">{norm(r.wbs) || "—"}</span>,
          hideOnMobile: true,
        },
        {
          id: "stato_tec",
          label: "Tec",
          width: "120px",
          sortValue: (r) => norm(r.stato_tec).toLowerCase(),
          render: (r) => <span className="text-[12px] text-slate-300">{norm(r.stato_tec) || "—"}</span>,
          hideOnMobile: true,
        },
        {
          id: "impianto",
          label: "Impianto",
          width: "140px",
          sortValue: (r) => norm(r.impianto).toLowerCase(),
          render: (r) => <span className="text-[12px] text-slate-300">{norm(r.impianto) || "—"}</span>,
          hideOnMobile: true,
        },
        {
          id: "livello",
          label: "Livello",
          width: "100px",
          sortValue: (r) => norm(r.livello).toLowerCase(),
          render: (r) => <span className="text-[12px] text-slate-300">{norm(r.livello) || "—"}</span>,
          hideOnMobile: true,
        },
      ];

      out = [...base, ...auditExtras];
    }

    // Raw columns (opt-in, Excel-like). We append at the end to keep stable core columns.
    if (visibleRawKeys.length > 0) {
      const rawCols: Column<IncaCavoRow>[] = visibleRawKeys.map((k) => ({
        id: `raw:${k}`,
        label: k,
        width: "180px",
        sortValue: (r) => asText((r as any)?.raw?.[k]).toLowerCase(),
        render: (r) => <span className="text-[12px] text-slate-300">{asText((r as any)?.raw?.[k]) || "—"}</span>,
        hideOnMobile: true,
      }));
      out = [...out, ...rawCols];
    }

    return out;
  }, [viewMode, visibleRawKeys]);

  const sortedRows = useMemo(() => {
    const col = columns.find((c) => c.id === sortId);
    const sortValue = col?.sortValue;

    const copy = [...rows];
    if (!sortValue) return copy;

    copy.sort((a, b) => {
      const va = sortValue(a);
      const vb = sortValue(b);

      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }

      const sa = String(va ?? "").toLowerCase();
      const sb = String(vb ?? "").toLowerCase();
      if (sa < sb) return sortDir === "asc" ? -1 : 1;
      if (sa > sb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return copy;
  }, [rows, columns, sortId, sortDir]);

  function toggleSort(id: string) {
    if (sortId === id) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortId(id);
    setSortDir("asc");
  }

  const visibleCols = useMemo(() => {
    // Keep mobile readable: hide some columns via hideOnMobile
    return columns;
  }, [columns]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-slate-800">
        <div className="text-[11px] text-slate-500 uppercase tracking-wide">
          {title} <span className="text-slate-400">({rows.length})</span>
        </div>

        <div className="flex items-center gap-2">
          <Pill label="Standard" active={viewMode === "standard"} onClick={() => onViewModeChange("standard")} />
          <Pill label="Audit" active={viewMode === "audit"} onClick={() => onViewModeChange("audit")} />

          <button
            type="button"
            onClick={() => setColumnsOpen((v) => !v)}
            className="ml-1 inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-white/5 px-3 py-1 text-[12px] text-slate-300 hover:bg-white/10"
            title="Choisir les colonnes (incl. colonnes XLSX raw)"
          >
            Colonnes
            <span className="text-slate-500">({visibleRawKeys.length})</span>
          </button>
        </div>
      </div>

      {columnsOpen && (
        <div className="border-b border-slate-800 bg-slate-950/60 px-3 py-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Colonnes XLSX (raw)</div>
              <button
                type="button"
                onClick={() => {
                  setVisibleRawKeys([]);
                  setRawSearch("");
                }}
                className="text-[12px] text-slate-400 hover:text-slate-200"
              >
                Reset
              </button>
            </div>

            <input
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              placeholder="Rechercher une colonne…"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none"
            />

            <div className="max-h-[220px] overflow-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                {rawKeys
                  .filter((k) => (rawSearch.trim() ? k.toLowerCase().includes(rawSearch.trim().toLowerCase()) : true))
                  .slice(0, 300)
                  .map((k) => {
                    const checked = visibleRawKeys.includes(k);
                    return (
                      <label key={k} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...visibleRawKeys, k]
                              : visibleRawKeys.filter((x) => x !== k);
                            setVisibleRawKeys(next);
                          }}
                        />
                        <span className="text-[12px] text-slate-300 truncate" title={k}>
                          {k}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              Astuce: active uniquement les colonnes utiles. Les colonnes “raw” viennent directement de l’XLSX et sont conservées en base (audit).
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-3 py-10 text-center text-[12px] text-slate-500">Caricamento…</div>
      ) : (
        <div className="max-h-[62vh] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-950/90 backdrop-blur border-b border-slate-800">
              <tr className="text-left text-[11px] text-slate-500">
                {visibleCols.map((c) => (
                  <th
                    key={c.id}
                    className={[
                      "px-3 py-2 select-none",
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "",
                      c.hideOnMobile ? "hidden md:table-cell" : "",
                    ].join(" ")}
                    style={c.width ? { width: c.width } : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.id)}
                      className="inline-flex items-center gap-1 hover:text-slate-200"
                      title="Ordina"
                    >
                      <span>{c.label}</span>
                      {sortId === c.id && <span className="text-slate-400">{sortDir === "asc" ? "↑" : "↓"}</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((r) => (
                <tr
                  key={r.id}
                  className={[
                    "border-b border-slate-900/80 cursor-pointer hover:bg-slate-950/60",
                    selectedRowId && r.id === selectedRowId ? "bg-slate-950/70 ring-1 ring-slate-700/60" : "",
                  ].join(" ")}
                  onClick={() => onRowClick?.(r)}
                >
                  {visibleCols.map((c) => (
                    <td
                      key={c.id}
                      className={[
                        "px-3 py-2 align-top",
                        c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "",
                        c.hideOnMobile ? "hidden md:table-cell" : "",
                      ].join(" ")}
                    >
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))}

              {sortedRows.length === 0 && (
                <tr>
                  <td colSpan={visibleCols.length} className="px-3 py-10 text-center text-[12px] text-slate-500">
                    Aucun câble dans ce scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
