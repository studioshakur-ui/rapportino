import React, { useMemo, useState } from "react";

export type IncaTableViewMode = "standard" | "chantier" | "controle";

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

  // Optional: show a compact header or let parent own it
  title?: string;
};

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

function deltaMeters(r: IncaCavoRow): number | null {
  const teo = Number(r.metri_teo);
  const dis = Number(r.metri_dis);
  if (!Number.isFinite(teo) || !Number.isFinite(dis)) return null;
  return dis - teo;
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
  title = "Cavi",
}: IncaCaviTableProps) {
  const [sortId, setSortId] = useState<string>("codice");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const columns = useMemo<Column<IncaCavoRow>[]>(() => {
    const base: Column<IncaCavoRow>[] = [
      {
        id: "codice",
        label: "Codice",
        width: "240px",
        sortValue: (r) => norm(r.codice).toLowerCase(),
        render: (r) => {
          const situ = toAtom(r.situazione);
          return (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForSituazione(situ) }} />
              <span className="text-[12px] text-slate-100 font-semibold">{r.codice ?? "—"}</span>
            </div>
          );
        },
      },
      {
        id: "situazione",
        label: "Sit.",
        width: "90px",
        sortValue: (r) => toAtom(r.situazione),
        render: (r) => {
          const situ = toAtom(r.situazione);
          return (
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-[11px]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForSituazione(situ) }} />
              <span className="text-slate-200 font-semibold">{situ}</span>
            </span>
          );
        },
      },
      {
        id: "stato_cantiere",
        label: "Cantiere",
        width: "120px",
        sortValue: (r) => norm(r.stato_cantiere).toLowerCase(),
        render: (r) => <span className="text-[12px] text-slate-300">{norm(r.stato_cantiere) || "—"}</span>,
        hideOnMobile: true,
      },
      {
        id: "metri_teo",
        label: "m teo",
        width: "90px",
        align: "right",
        sortValue: (r) => Number(r.metri_teo ?? -1),
        render: (r) => <span className="text-[12px] text-slate-200 tabular-nums">{formatMeters(r.metri_teo)}</span>,
      },
      {
        id: "metri_dis",
        label: "m dis",
        width: "90px",
        align: "right",
        sortValue: (r) => Number(r.metri_dis ?? -1),
        render: (r) => <span className="text-[12px] text-slate-200 tabular-nums">{formatMeters(r.metri_dis)}</span>,
        hideOnMobile: true,
      },
      {
        id: "delta_m",
        label: "Δm",
        width: "90px",
        align: "right",
        sortValue: (r) => {
          const d = deltaMeters(r);
          return d === null ? -1 : d;
        },
        render: (r) => {
          const d = deltaMeters(r);
          const v = d === null ? "—" : new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(d);
          const warn = d !== null && Math.abs(d) >= 5;
          return (
            <span className={["text-[12px] tabular-nums", warn ? "text-amber-200 font-semibold" : "text-slate-300"].join(" ")}>
              {v}
            </span>
          );
        },
        hideOnMobile: true,
      },
      {
        id: "data_posa",
        label: "Data posa",
        width: "110px",
        sortValue: (r) => (r.data_posa ? new Date(String(r.data_posa)).getTime() : -1),
        render: (r) => <span className="text-[12px] text-slate-300 tabular-nums">{formatDateIT(r.data_posa)}</span>,
        hideOnMobile: true,
      },
      {
        id: "capo",
        label: "Capo",
        width: "140px",
        sortValue: (r) => norm(r.capo_label).toLowerCase(),
        render: (r) => <span className="text-[12px] text-slate-300">{norm(r.capo_label) || "—"}</span>,
        hideOnMobile: true,
      },
      {
        id: "pagina_pdf",
        label: "PDF",
        width: "70px",
        align: "center",
        sortValue: (r) => Number(r.pagina_pdf ?? -1),
        render: (r) => <span className="text-[12px] text-slate-400 tabular-nums">{r.pagina_pdf ?? "—"}</span>,
        hideOnMobile: true,
      },
    ];

    if (viewMode === "standard") return base;

    if (viewMode === "chantier") {
      const chantier: Column<IncaCavoRow>[] = [
        ...base.slice(0, 3), // codice, situ, stato cantiere
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
        },
        {
          id: "descr_da",
          label: "Descr. DA",
          width: "260px",
          sortValue: (r) => norm(r.descrizione_da).toLowerCase(),
          render: (r) => <span className="text-[12px] text-slate-400">{norm(r.descrizione_da) || "—"}</span>,
          hideOnMobile: true,
        },
        {
          id: "descr_a",
          label: "Descr. A",
          width: "260px",
          sortValue: (r) => norm(r.descrizione_a).toLowerCase(),
          render: (r) => <span className="text-[12px] text-slate-400">{norm(r.descrizione_a) || "—"}</span>,
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
        ...base.filter((c) => ["metri_teo", "metri_dis", "delta_m", "data_posa", "capo"].includes(c.id)),
      ];

      return chantier;
    }

    // controle
    const controle: Column<IncaCavoRow>[] = [
      ...base,
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

    return controle;
  }, [viewMode]);

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
          <Pill label="Chantier" active={viewMode === "chantier"} onClick={() => onViewModeChange("chantier")} />
          <Pill label="Contrôle" active={viewMode === "controle"} onClick={() => onViewModeChange("controle")} />
        </div>
      </div>

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
                  className="border-b border-slate-900/80 cursor-pointer hover:bg-slate-950/60"
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
