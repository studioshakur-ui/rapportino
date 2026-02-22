import * as React from "react";
import AppChip from "../../components/inca/AppChip";

type Align = "left" | "center" | "right";

type Column<Row> = {
  key: string;
  header: React.ReactNode;
  align?: Align;
  width?: number | string;
  render: (row: Row) => React.ReactNode;
};

export type IncaCavoRow = Record<string, any>;

export type IncaTableViewMode = "standard" | "audit";

type IncaRow = IncaCavoRow;

function formatDateIT(value?: string | null) {
  if (!value) return null;
  // accepte "YYYY-MM-DD" ou ISO
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateTimeIT(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function pillClass() {
  return "chip chip-status px-2 py-0.5 text-xs font-semibold";
}

function SitCantPill({ value }: { value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return <span className="opacity-40">—</span>;
  return <span className={pillClass()}>{String(value)}</span>;
}

function PosaCapoCell(row: IncaRow) {
  // on supporte plusieurs conventions de champs pour être robuste
  const dateRaw =
    row.data_posa ??
    row.dataPosa ??
    row.last_posa_date ??
    row.lastDataPosa ??
    row.ultima_posa ??
    row.ultimaPosa ??
    null;

  const capoRaw =
    row.capo ??
    row.capo_label ??
    row.capoLabel ??
    row.last_capo_label ??
    row.lastCapoLabel ??
    null;

  const date = formatDateIT(dateRaw);
  const hasHistory = Boolean(date);

  if (!hasHistory) {
    return (
      <div className="flex items-start gap-3">
        <span className="chip chip-status px-2 py-0.5 text-[11px] font-semibold">
          NO-HIST
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Nessun report validato</div>
          <div className="text-xs opacity-60">In attesa di consuntivazione</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <span className="chip chip-status px-2 py-0.5 text-[11px] font-semibold">
        HIST
      </span>
      <div className="leading-tight">
        <div className="text-sm font-semibold">{date}</div>
        <div className="text-xs opacity-60">{capoRaw ? `Capo: ${capoRaw}` : "Capo: —"}</div>
      </div>
    </div>
  );
}

export type IncaCaviTableProps = {
  rows: IncaRow[];
  variant?: IncaTableViewMode;
  viewLabel?: string;
  onRowClick?: (row: IncaRow) => void;
};

export default function IncaCaviTable({
  rows,
  variant = "standard",
  viewLabel,
  onRowClick,
}: IncaCaviTableProps) {
  const baseColumns: Array<Column<IncaRow> | undefined> = [
    {
      key: "codice",
      header: "Codice",
      align: "left",
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full dot-good shrink-0" />
          <span className="font-semibold">{r.codice ?? r.code ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "sit_cant",
      header: "Sit cant.",
      align: "center",
      render: (r) => {
        // “prog et cantiere ont les meme donnees”
        const v =
          r.cantiere ??
          r.prog ??
          r.stato_cantiere ??
          r.situazione ??
          null;
        return <SitCantPill value={v} />;
      },
    },
    {
      key: "m_teo",
      header: "m teo",
      align: "right",
      render: (r) => <span className="tabular-nums">{r.m_teo ?? r.metri_teo ?? r.metriTeo ?? "—"}</span>,
    },
    {
      key: "posa_capo",
      header: "Posa / Capo",
      align: "left",
      render: (r) => PosaCapoCell(r),
    },
    {
      key: "da_a",
      header: "DA → A",
      align: "left",
      render: (r) => {
        const da = r.da ?? r.apparato_da ?? r.apparatoDa ?? null;
        const a = r.a ?? r.apparato_a ?? r.apparatoA ?? null;
        return (
          <div className="flex items-center gap-2">
            <AppChip value={da} side="DA" />
            <span className="opacity-40">→</span>
            <AppChip value={a} side="A" />
          </div>
        );
      },
    },
    {
      key: "tipo",
      header: "Tipo",
      align: "left",
      render: (r) => <span className="opacity-90">{r.tipo ?? r.tipo_cavo ?? r.tipoCavo ?? "—"}</span>,
    },
  ];

  const auditColumns: Array<Column<IncaRow> | undefined> = [
    {
      key: "m_dis",
      header: "m dis",
      align: "right",
      render: (r) => <span className="tabular-nums">{r.m_dis ?? r.metri_dis ?? r.metriDis ?? "—"}</span>,
    },
    {
      key: "wbs",
      header: "WBS",
      align: "center",
      render: (r) => <span className="tabular-nums opacity-80">{r.wbs ?? r.WBS ?? "—"}</span>,
    },

    {
      key: "inca_data_taglio",
      header: "Taglio (INCA)",
      align: "center",
      render: (r) => <span className="tabular-nums opacity-80">{formatDateIT(r.inca_data_taglio ?? r.DATA_DI_TAGLIO ?? null) ?? "—"}</span>,
    },
    {
      key: "inca_data_posa",
      header: "Posa (INCA)",
      align: "center",
      render: (r) => <span className="tabular-nums opacity-80">{formatDateIT(r.inca_data_posa ?? r.DATA_DI_POSA ?? null) ?? "—"}</span>,
    },
    {
      key: "inca_data_collegamento",
      header: "Coll. (INCA)",
      align: "center",
      render: (r) =>
        <span className="tabular-nums opacity-80">{formatDateIT(r.inca_data_collegamento ?? r.DATA_COLLEGAMENTO ?? null) ?? "—"}</span>,
    },
    {
      key: "inca_data_instradamento_ts",
      header: "Instrad. (INCA)",
      align: "center",
      render: (r) =>
        <span className="tabular-nums opacity-80">{formatDateTimeIT(r.inca_data_instradamento_ts ?? r.DATA_INSTRADAMENTO ?? null) ?? "—"}</span>,
    },
    {
      key: "inca_dataela_ts",
      header: "ELA (INCA)",
      align: "center",
      render: (r) => <span className="tabular-nums opacity-80">{formatDateTimeIT(r.inca_dataela_ts ?? r.DATAELA ?? null) ?? "—"}</span>,
    },
    {
      key: "inca_data_creazione_instradamento_ts",
      header: "Creaz. Instr. (INCA)",
      align: "center",
      render: (r) =>
        <span className="tabular-nums opacity-80">{formatDateTimeIT(r.inca_data_creazione_instradamento_ts ?? r.DATA_CREAZIONE_INSTRADAMENTO ?? null) ?? "—"}</span>,
    },
  ];

  const columns = React.useMemo(() => {
    const cols = [
      ...baseColumns,
      ...(variant === "audit" ? auditColumns : []),
    ].filter(Boolean) as Column<IncaRow>[];

    // blindage anti “undefined column”
    return cols;
  }, [variant]);

  return (
    <div className="w-full">
      {viewLabel ? (
        <div className="mb-2 text-sm font-semibold opacity-80">{viewLabel}</div>
      ) : null}

      <div className="w-full overflow-auto rounded-2xl theme-table">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 theme-table-head backdrop-blur">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={[
                    "px-3 py-2 text-xs font-semibold uppercase tracking-wide opacity-70",
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                  ].join(" ")}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={r.id ?? r.uuid ?? `${r.codice ?? "row"}-${idx}`}
                className="border-t theme-border cursor-pointer"
                onClick={() => onRowClick?.(r)}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={[
                      "px-3 py-2 align-top",
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                    ].join(" ")}
                  >
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}

            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center opacity-60" colSpan={columns.length}>
                  Nessun dato.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}