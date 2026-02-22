// /src/components/core-drive/rapportini/CoreDriveRapportiniV1.tsx
import { useEffect, useMemo, useState  } from "react";
import { useAuth } from "../../../auth/AuthProvider";

import Badge from "../ui/Badge";
import KpiTile from "../ui/KpiTile";
import Segmented from "../ui/Segmented";
import VirtualList from "../ui/VirtualList";

import type { ArchiveRapportinoV1 } from "../../../services/rapportiniArchive.api";
import { loadRapportiniArchiveV1 } from "../../../services/rapportiniArchive.api";

type ViewMode = "TABLE" | "TIMELINE";
type FilterStatus = "ALL" | string;
type ComparisonMode = "CAPO" | "COMMESSA";
type ComparisonRange = "ALL" | "90" | "365";

function formatDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT");
}

function formatNumber(value: unknown): string {
  if (value == null) return "0";
  const n = Number(value);
  if (Number.isNaN(n)) return "0";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(n);
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bozza",
  VALIDATED_CAPO: "Validata dal Capo",
  APPROVED_UFFICIO: "Approvata dall’Ufficio",
  RETURNED: "Rimandata dall’Ufficio",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-slate-800 text-slate-200 border-slate-700",
  VALIDATED_CAPO: "bg-emerald-900/40 text-emerald-200 border-emerald-600/70",
  APPROVED_UFFICIO: "bg-sky-900/40 text-sky-200 border-sky-600/70",
  RETURNED: "bg-amber-900/40 text-amber-200 border-amber-600/70",
};

function buildCsv(rows: ArchiveRapportinoV1[], isCapoView: boolean): string {
  const headers: string[] = ["data", "commessa", "costr", "status", "totale_prodotto"];
  if (!isCapoView) headers.splice(1, 0, "capo_name");

  const escapeCell = (value: unknown) => {
    const s = String(value ?? "");
    if (s.includes(";") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const lines = [
    headers.join(";"),
    ...rows.map((r) => {
      const base = [
        r.data || "",
        r.commessa || "",
        r.costr || "",
        r.status || "",
        String((r.totale_prodotto as number | null | undefined) ?? 0),
      ];
      if (!isCapoView) base.splice(1, 0, r.capo_name || "");
      return base.map(escapeCell).join(";");
    }),
  ];

  return lines.join("\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: "TABLE", label: "Tabella" },
  { value: "TIMELINE", label: "Linea tempo" },
];

type TimelineEntry = { date: string; rapportini: number; prodotto: number };
type ComparisonEntry = { label: string; prodotto: number; rapportini: number };

export default function CoreDriveRapportiniV1(): JSX.Element {
  const { profile } = useAuth();

  const isCapoView = profile?.app_role === "CAPO" || (profile as any)?.role === "CAPO";
  const capoId: string | null = (profile as any)?.id || null;

  const [loading, setLoading] = useState<boolean>(true);
  const [rapportini, setRapportini] = useState<ArchiveRapportinoV1[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchText, setSearchText] = useState<string>("");
  const [filterCapo, setFilterCapo] = useState<string>("");
  const [filterCommessa, setFilterCommessa] = useState<string>("");
  const [filterCostr, setFilterCostr] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  const [viewMode, setViewMode] = useState<ViewMode>("TABLE");

  // Comparison
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>(isCapoView ? "COMMESSA" : "CAPO");
  const [comparisonRange, setComparisonRange] = useState<ComparisonRange>("ALL");

  // Detail
  const [selected, setSelected] = useState<ArchiveRapportinoV1 | null>(null);

  useEffect(() => {
    if (!profile) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadRapportiniArchiveV1({ capoId: isCapoView ? capoId : null, limit: 2000 });
        setRapportini(data || []);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError("Errore caricamento storico (rapportini v1).");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [profile, isCapoView, capoId]);

  const facets = useMemo(() => {
    const capi = new Set<string>();
    const commesse = new Set<string>();
    const costrSet = new Set<string>();
    const statusSet = new Set<string>();

    rapportini.forEach((r) => {
      if (r.capo_name) capi.add(r.capo_name);
      if (r.commessa) commesse.add(r.commessa);
      if (r.costr) costrSet.add(r.costr);
      if (r.status) statusSet.add(r.status);
    });

    return {
      capi: Array.from(capi).sort(),
      commesse: Array.from(commesse).sort(),
      costr: Array.from(costrSet).sort(),
      status: Array.from(statusSet).sort(),
    };
  }, [rapportini]);

  const filtered = useMemo(() => {
    let result = [...rapportini];
    if (!result.length) return result;

    if (!isCapoView && filterCapo.trim()) {
      const f = filterCapo.trim().toLowerCase();
      result = result.filter((r) => (r.capo_name || "").toLowerCase().includes(f));
    }

    if (filterCommessa.trim()) {
      const f = filterCommessa.trim().toLowerCase();
      result = result.filter((r) => (r.commessa || "").toLowerCase().includes(f));
    }

    if (filterCostr.trim()) {
      const f = filterCostr.trim().toLowerCase();
      result = result.filter((r) => (r.costr || "").toLowerCase().includes(f));
    }

    if (filterStatus !== "ALL") {
      result = result.filter((r) => r.status === filterStatus);
    }

    if (filterFrom) {
      const fromDate = new Date(filterFrom);
      result = result.filter((r) => r.data && new Date(String(r.data)) >= fromDate);
    }

    if (filterTo) {
      const toDate = new Date(filterTo);
      result = result.filter((r) => r.data && new Date(String(r.data)) <= toDate);
    }

    if (searchText.trim()) {
      const f = searchText.trim().toLowerCase();
      result = result.filter(
        (r) =>
          (r.commessa || "").toLowerCase().includes(f) ||
          (r.costr || "").toLowerCase().includes(f) ||
          (r.note || "").toLowerCase().includes(f),
      );
    }

    return result;
  }, [rapportini, isCapoView, filterCapo, filterCommessa, filterCostr, filterStatus, filterFrom, filterTo, searchText]);

  const summary = useMemo(() => {
    if (!filtered.length) return { count: 0, totaleProdotto: 0, firstDate: null as Date | null, lastDate: null as Date | null };

    let totale = 0;
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    filtered.forEach((r) => {
      totale += Number(r.totale_prodotto || 0);
      if (r.data) {
        const d = new Date(String(r.data));
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    });

    return { count: filtered.length, totaleProdotto: totale, firstDate: minDate, lastDate: maxDate };
  }, [filtered]);

  const timelineData = useMemo<TimelineEntry[]>(() => {
    const map = new Map<string, TimelineEntry>();
    filtered.forEach((r) => {
      if (!r.data) return;
      const key = String(r.data).slice(0, 10);
      if (!map.has(key)) map.set(key, { date: key, rapportini: 0, prodotto: 0 });
      const e = map.get(key)!;
      e.rapportini += 1;
      e.prodotto += Number(r.totale_prodotto || 0);
    });
    return Array.from(map.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filtered]);

  const maxRapportiniTimeline = useMemo(
    () => timelineData.reduce((max, d) => Math.max(max, d.rapportini || 0), 0) || 0,
    [timelineData],
  );
  const maxProdottoTimeline = useMemo(
    () => timelineData.reduce((max, d) => Math.max(max, d.prodotto || 0), 0) || 0,
    [timelineData],
  );

  const comparisonData = useMemo<ComparisonEntry[]>(() => {
    if (!filtered.length) return [];

    const now = new Date();
    let fromLimit: Date | null = null;
    if (comparisonRange === "90") {
      fromLimit = new Date(now);
      fromLimit.setDate(fromLimit.getDate() - 90);
    } else if (comparisonRange === "365") {
      fromLimit = new Date(now);
      fromLimit.setDate(fromLimit.getDate() - 365);
    }

    const map = new Map<string, ComparisonEntry>();

    filtered.forEach((r) => {
      if (fromLimit && r.data) {
        const d = new Date(String(r.data));
        if (d < fromLimit) return;
      }

      const key =
        comparisonMode === "CAPO"
          ? (r.capo_name || "—")
          : (r.commessa || "Senza commessa");

      if (!map.has(key)) map.set(key, { label: key, prodotto: 0, rapportini: 0 });
      const e = map.get(key)!;
      e.prodotto += Number(r.totale_prodotto || 0);
      e.rapportini += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.prodotto - a.prodotto);
  }, [filtered, comparisonMode, comparisonRange]);

  const maxProdottoComparison = useMemo(
    () => comparisonData.reduce((max, d) => Math.max(max, d.prodotto || 0), 0) || 0,
    [comparisonData],
  );

  const handleExportCsv = () => {
    if (!filtered.length) return;
    const csv = buildCsv(filtered, isCapoView);
    const filename = isCapoView ? "core-drive_rapportini_personale.csv" : "core-drive_rapportini_cantiere.csv";
    downloadCsv(csv, filename);
  };

  const resetFilters = () => {
    setSearchText("");
    setFilterCapo("");
    setFilterCommessa("");
    setFilterCostr("");
    setFilterStatus("ALL");
    setFilterFrom("");
    setFilterTo("");
  };

  const handleOpenUfficioDetail = () => {
    if (!selected) return;
    const rapportinoId = (selected.rapportino_id || selected.id) as string | null | undefined;
    if (!rapportinoId) return;
    window.open(`/ufficio/rapportini/${rapportinoId}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiTile label="Rapportini" value={summary.count} hint="In vista" />
        <KpiTile label="Prodotto" value={formatNumber(summary.totaleProdotto)} hint="Somma filtrata" tone="ok" />
        <KpiTile
          label="Finestra"
          value={summary.firstDate && summary.lastDate ? `${formatDate(summary.firstDate)} → ${formatDate(summary.lastDate)}` : "—"}
          hint="Periodo"
        />
        <KpiTile label="Totale storico" value={rapportini.length} hint="Caricati (max 2000)" />
        <KpiTile label="Modalità" value="Sola lettura" hint="storico v1" tone="info" />
        <KpiTile label="Esporta" value="CSV" hint="Per audit" />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Memoria lunga</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge tone="info">Storico Rapportini v1</Badge>
              <Badge tone="neutral">Sola lettura</Badge>
              <Badge tone="neutral">Cockpit</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!filtered.length}
              className={[
                "px-3 py-2 rounded-xl border text-[12px] font-medium",
                filtered.length
                  ? "border-sky-500 text-sky-100 hover:bg-sky-600/10"
                  : "border-slate-700 text-slate-500 cursor-not-allowed",
              ].join(" ")}
            >
              Esporta CSV
            </button>
            <Segmented value={viewMode} onChange={setViewMode} options={VIEW_OPTIONS} />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 lg:flex-row">
          <input
            type="text"
            placeholder="Ricerca: commessa, costr, note…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/70 text-[12px] text-slate-300 hover:bg-slate-900"
          >
            Reset filtri
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[12px]">
          {!isCapoView && (
            <select
              value={filterCapo}
              onChange={(e) => setFilterCapo(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-slate-100"
            >
              <option value="">Capi · tutti</option>
              {facets.capi.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterCommessa}
            onChange={(e) => setFilterCommessa(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-slate-100"
          >
            <option value="">Commessa · tutte</option>
            {facets.commesse.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filterCostr}
            onChange={(e) => setFilterCostr(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-slate-100"
          >
            <option value="">Costr · tutti</option>
            {facets.costr.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-slate-100"
          >
            <option value="ALL">Stato · tutti</option>
            {facets.status.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] || s}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-slate-100"
          />
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-slate-100"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)] gap-4">
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
            {loading ? (
              <div className="flex h-52 items-center justify-center text-sm text-slate-400">Caricamento storico…</div>
            ) : error ? (
              <div className="p-4 text-sm text-rose-300">{error}</div>
            ) : !filtered.length ? (
              <div className="p-4 text-sm text-slate-400">Nessun dato per i filtri attuali.</div>
            ) : viewMode === "TABLE" ? (
              <RapportiniVirtualTable rows={filtered} isCapoView={isCapoView} onRowClick={setSelected} />
            ) : (
              <TimelineRapportini data={timelineData} maxRap={maxRapportiniTimeline} maxProd={maxProdottoTimeline} />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-[12px]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">Confronto</div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-300">
                {comparisonMode === "CAPO" ? "Prodotto per capo" : "Prodotto per commessa"}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={comparisonMode}
                  onChange={(e) => setComparisonMode(e.target.value as ComparisonMode)}
                  className="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-0.5 text-[11px] text-slate-100"
                >
                  <option value="CAPO">Per capo</option>
                  <option value="COMMESSA">Per commessa</option>
                </select>
                <select
                  value={comparisonRange}
                  onChange={(e) => setComparisonRange(e.target.value as ComparisonRange)}
                  className="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-0.5 text-[11px] text-slate-100"
                >
                  <option value="ALL">Tutto</option>
                  <option value="90">90g</option>
                  <option value="365">12m</option>
                </select>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {comparisonData.length ? (
                comparisonData.slice(0, 8).map((row) => {
                  const width =
                    maxProdottoComparison > 0 ? Math.max(4, (row.prodotto / maxProdottoComparison) * 100) : 0;

                  return (
                    <div key={row.label} className="space-y-0.5">
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span className="truncate max-w-[60%]">{row.label}</span>
                        <span className="font-mono text-slate-400">{formatNumber(row.prodotto)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                        <div style={{ width: `${width}%` }} className="h-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-400 to-emerald-300" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-24 items-center justify-center text-[11px] text-slate-500">Dati insufficienti.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {selected && (
        <RapportinoDetailDrawer
          selected={selected}
          isCapoView={isCapoView}
          onClose={() => setSelected(null)}
          onOpenUfficio={handleOpenUfficioDetail}
        />
      )}
    </div>
  );
}

function RapportiniVirtualTable({
  rows,
  isCapoView,
  onRowClick,
}: {
  rows: ArchiveRapportinoV1[];
  isCapoView: boolean;
  onRowClick?: (row: ArchiveRapportinoV1) => void;
}): JSX.Element {
  const header = (
    <div
      className={`grid ${
        isCapoView ? "grid-cols-[120px_1fr_110px]" : "grid-cols-[120px_1fr_1fr_110px]"
      } gap-2 px-4 py-2 border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/50`}
    >
      <div>Data</div>
      {!isCapoView ? <div>Capo</div> : null}
      <div>Commessa</div>
      <div>Costr</div>
    </div>
  );

  return (
    <div>
      {header}
      <VirtualList
        rows={rows as any}
        rowHeight={38}
        height={560}
        renderRow={(r: ArchiveRapportinoV1, idx: number) => (
          <div
            key={(r.id as string | undefined) || idx}
            onClick={() => onRowClick?.(r)}
            className={`grid ${
              isCapoView ? "grid-cols-[120px_1fr_110px]" : "grid-cols-[120px_1fr_1fr_110px]"
            } gap-2 px-4 py-2 border-b border-slate-800/60 hover:bg-slate-900/40 cursor-pointer text-[12px]`}
          >
            <div className="text-slate-200">{formatDate(r.data)}</div>
            {!isCapoView ? <div className="text-slate-200 truncate">{r.capo_name || "—"}</div> : null}
            <div className="text-slate-200 truncate">{r.commessa || "—"}</div>
            <div className="text-slate-200 truncate">{r.costr || "—"}</div>
          </div>
        )}
      />
      <div className="px-4 py-2 text-[11px] text-slate-500">Scroll fluido · {rows.length} righe (max 2000 caricate)</div>
    </div>
  );
}

function TimelineRapportini({
  data,
  maxRap,
  maxProd,
}: {
  data: TimelineEntry[];
  maxRap: number;
  maxProd: number;
}): JSX.Element {
  return (
    <div className="h-72 w-full px-4 py-3 flex flex-col">
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-[11px] text-slate-500">
          Nessun dato in linea tempo.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>Linea tempo</span>
            <span>Barre = prodotto · Punto = #rapportini</span>
          </div>
          <div className="flex-1 flex items-end gap-[3px] overflow-x-auto border-t border-slate-800 pt-2">
            {data.map((d) => {
              const hProd = maxProd > 0 ? Math.max(6, (d.prodotto / maxProd) * 100) : 0;
              const hRap = maxRap > 0 ? Math.max(4, (d.rapportini / maxRap) * 100) : 0;

              return (
                <div key={d.date} className="group flex flex-col items-center justify-end min-w-[14px]">
                  <div className="relative flex items-end h-40">
                    <div
                      style={{ height: `${hProd}%` }}
                      className="w-[7px] rounded-t bg-sky-500/80 group-hover:bg-sky-400 transition-colors"
                    />
                    <div style={{ height: `${hRap}%` }} className="w-[7px] flex items-start justify-center -ml-[7px]">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                    </div>

                    <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <div className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-100 whitespace-nowrap shadow-lg">
                        <div>{formatDate(d.date)}</div>
                        <div>
                          Prod: <span className="font-mono">{formatNumber(d.prodotto)}</span>
                        </div>
                        <div>
                          Rap: <span className="font-mono">{d.rapportini}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-1 text-[9px] text-slate-500 rotate-[-50deg] origin-top">{formatDate(d.date)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function RapportinoDetailDrawer({
  selected,
  isCapoView,
  onClose,
  onOpenUfficio,
}: {
  selected: ArchiveRapportinoV1;
  isCapoView: boolean;
  onClose: () => void;
  onOpenUfficio: () => void;
}): JSX.Element {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-slate-950 border-l border-slate-800 shadow-[0_0_40px_rgba(15,23,42,1)] flex flex-col">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Dettaglio · Storico v1</div>
            <div className="truncate text-sm text-slate-100">
              {formatDate(selected.data)} · {selected.commessa || "Senza commessa"}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-100 text-sm font-medium">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 text-[12px] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" value={formatDate(selected.data)} />
            <Field label="Capo" value={selected.capo_name || "—"} />
            <Field label="Commessa" value={selected.commessa || "—"} />
            <Field label="Costr" value={selected.costr || "—"} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-[0.16em]">Stato</div>
              <div className="mt-1">
                <span
                  className={[
                    "inline-flex items-center px-2 py-0.5 rounded-full border text-[11px]",
                    STATUS_BADGE[selected.status || ""] || "bg-slate-800 text-slate-200 border-slate-700",
                  ].join(" ")}
                >
                  {STATUS_LABELS[selected.status || ""] || selected.status || "—"}
                </span>
              </div>
            </div>
            <Field label="Prodotto" value={formatNumber(selected.totale_prodotto)} mono />
          </div>

          {selected.note ? (
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-[0.16em] mb-1">Note</div>
              <div className="text-slate-200 whitespace-pre-wrap border border-slate-800 rounded-md bg-slate-950/60 px-3 py-2">
                {selected.note}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Traccia</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="info">Sola lettura</Badge>
              <Badge tone="neutral">storico v1</Badge>
              <Badge tone="neutral">Audit conforme</Badge>
            </div>
          </div>
        </div>

        {!isCapoView ? (
          <div className="border-t border-slate-800 px-4 py-3 flex items-center justify-between text-[11px]">
            <div className="text-slate-500">Apri dettaglio completo (Ufficio)</div>
            <button
              type="button"
              onClick={onOpenUfficio}
              className="px-3 py-1.5 rounded-full border border-sky-500 text-sky-100 hover:bg-sky-600/10"
            >
              Apri →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div>
      <div className="text-[11px] text-slate-500 uppercase tracking-[0.16em]">{label}</div>
      <div className={["text-slate-100", mono ? "font-mono" : ""].join(" ")}>{value}</div>
    </div>
  );
}

