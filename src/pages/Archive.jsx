// src/pages/Archive.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT");
}

function formatNumber(value) {
  if (value == null || isNaN(value)) return "0";
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

const STATUS_COLORS = {
  DRAFT: "bg-gray-100 text-gray-800",
  VALIDATED_CAPO: "bg-emerald-100 text-emerald-800",
  APPROVED_UFFICIO: "bg-sky-100 text-sky-800",
  RETURNED: "bg-amber-100 text-amber-800",
};

function buildCsv(filtered, isCapoView) {
  const headers = [
    "data",
    "commessa",
    "costr",
    "status",
    "totale_prodotto",
  ];
  if (!isCapoView) {
    headers.splice(1, 0, "capo_name");
  }

  const rows = filtered.map((r) => {
    const base = [
      r.data || "",
      r.commessa || "",
      r.costr || "",
      r.status || "",
      String(r.totale_prodotto || 0),
    ];
    if (!isCapoView) {
      base.splice(1, 0, r.capo_name || "");
    }
    return base;
  });

  const lines = [
    headers.join(";"),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          if (s.includes(";") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(";")
    ),
  ];

  return lines.join("\n");
}

function downloadCsv(content, filename) {
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

export default function ArchivePage() {
  const { profile } = useAuth();

  const isCapoView =
    profile?.app_role === "CAPO" || profile?.role === "CAPO";
  const capoId = profile?.id || null;

  const [loading, setLoading] = useState(true);
  const [rapportini, setRapportini] = useState([]);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(null);
  const [righe, setRighe] = useState([]);
  const [cavi, setCavi] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filtres
  const [searchText, setSearchText] = useState("");
  const [filterCapo, setFilterCapo] = useState("");
  const [filterCommessa, setFilterCommessa] = useState("");
  const [filterCostr, setFilterCostr] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Vue principale : table / timeline
  const [viewMode, setViewMode] = useState("TABLE"); // "TABLE" | "TIMELINE"

  // Bloc comparaison
  const [comparisonMode, setComparisonMode] = useState(
    isCapoView ? "COMMESSA" : "CAPO"
  ); // "CAPO" ou "COMMESSA"
  const [comparisonRange, setComparisonRange] = useState("ALL"); // "ALL" | "90" | "365"

  useEffect(() => {
    const loadArchive = async () => {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("archive_rapportini_v1")
        .select("*")
        .order("data", { ascending: false })
        .limit(2000);

      if (isCapoView && capoId) {
        query = query.eq("capo_id", capoId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading archive_rapportini_v1", error);
        setError("Errore nel caricamento dell'archivio storico.");
        setLoading(false);
        return;
      }

      setRapportini(data || []);
      setLoading(false);
    };

    if (!profile) return;
    loadArchive();
  }, [profile, isCapoView, capoId]);

  const facets = useMemo(() => {
    const capi = new Set();
    const commesse = new Set();
    const costrSet = new Set();
    const statusSet = new Set();

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

    if (filterCapo.trim()) {
      const f = filterCapo.trim().toLowerCase();
      result = result.filter((r) =>
        (r.capo_name || "").toLowerCase().includes(f)
      );
    }

    if (filterCommessa.trim()) {
      const f = filterCommessa.trim().toLowerCase();
      result = result.filter((r) =>
        (r.commessa || "").toLowerCase().includes(f)
      );
    }

    if (filterCostr.trim()) {
      const f = filterCostr.trim().toLowerCase();
      result = result.filter((r) =>
        (r.costr || "").toLowerCase().includes(f)
      );
    }

    if (filterStatus !== "ALL") {
      result = result.filter((r) => r.status === filterStatus);
    }

    if (filterFrom) {
      const fromDate = new Date(filterFrom);
      result = result.filter((r) => {
        if (!r.data) return false;
        return new Date(r.data) >= fromDate;
      });
    }

    if (filterTo) {
      const toDate = new Date(filterTo);
      result = result.filter((r) => {
        if (!r.data) return false;
        return new Date(r.data) <= toDate;
      });
    }

    if (searchText.trim()) {
      const f = searchText.trim().toLowerCase();
      result = result.filter((r) => {
        return (
          (r.capo_name || "").toLowerCase().includes(f) ||
          (r.commessa || "").toLowerCase().includes(f) ||
          (r.costr || "").toLowerCase().includes(f) ||
          (r.ufficio_note || "").toLowerCase().includes(f) ||
          (r.note_ufficio || "").toLowerCase().includes(f)
        );
      });
    }

    return result;
  }, [
    rapportini,
    filterCapo,
    filterCommessa,
    filterCostr,
    filterStatus,
    filterFrom,
    filterTo,
    searchText,
  ]);

  // Groupement par commessa (vue Table)
  const groupedByCommessa = useMemo(() => {
    const groups = new Map();
    filtered.forEach((r) => {
      const key = r.commessa || "— senza commessa";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(r);
    });

    return Array.from(groups.entries())
      .map(([commessa, items]) => ({
        commessa,
        items: items.sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        ),
      }))
      .sort((a, b) => a.commessa.localeCompare(b.commessa));
  }, [filtered]);

  // Stats globales (sur filtré)
  const stats = useMemo(() => {
    const count = filtered.length;
    const totalProd = filtered.reduce(
      (acc, r) => acc + Number(r.totale_prodotto || 0),
      0
    );
    const uniqueCapi = new Set(filtered.map((r) => r.capo_name || "")).size;
    const uniqueCommesse = new Set(filtered.map((r) => r.commessa || "")).size;

    return {
      count,
      totalProd,
      uniqueCapi,
      uniqueCommesse,
    };
  }, [filtered]);

  // Timeline data
  const timelineData = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      if (!r.data) return;
      const key = new Date(r.data).toISOString().slice(0, 10);
      if (!map.has(key)) {
        map.set(key, {
          date: key,
          count: 0,
          totalProd: 0,
        });
      }
      const entry = map.get(key);
      entry.count += 1;
      entry.totalProd += Number(r.totale_prodotto || 0);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filtered]);

  // Data comparaison (par capo ou par commessa)
  const comparisonData = useMemo(() => {
    if (filtered.length === 0) return [];

    let base = [...filtered];

    if (comparisonRange !== "ALL") {
      const now = new Date();
      const days =
        comparisonRange === "90"
          ? 90
          : comparisonRange === "365"
          ? 365
          : 0;
      if (days > 0) {
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        base = base.filter((r) => {
          if (!r.data) return false;
          return new Date(r.data) >= cutoff;
        });
      }
    }

    const isByCapo = comparisonMode === "CAPO" && !isCapoView;
    const keyField = isByCapo ? "capo_name" : "commessa";
    const labelDefault = isByCapo ? "Capo sconosciuto" : "Senza commessa";

    const map = new Map();
    base.forEach((r) => {
      const rawLabel = r[keyField] || labelDefault;
      const label = rawLabel || labelDefault;

      if (!map.has(label)) {
        map.set(label, {
          label,
          count: 0,
          totalProd: 0,
        });
      }
      const entry = map.get(label);
      entry.count += 1;
      entry.totalProd += Number(r.totale_prodotto || 0);
    });

    const arr = Array.from(map.values());

    arr.sort((a, b) => b.totalProd - a.totalProd);

    return arr.slice(0, 12);
  }, [filtered, comparisonMode, comparisonRange, isCapoView]);

  const openDetail = async (rapportino) => {
    setSelected(rapportino);
    setDetailLoading(true);
    setRighe([]);
    setCavi([]);

    const [righeRes, caviRes] = await Promise.all([
      supabase
        .from("archive_rapportino_rows_v1")
        .select("*")
        .eq("rapportino_id", rapportino.id)
        .order("row_index", { ascending: true }),
      supabase
        .from("archive_rapportino_cavi_v1")
        .select("*")
        .eq("rapportino_id", rapportino.id)
        .order("codice", { ascending: true }),
    ]);

    if (righeRes.error) {
      console.error("Error loading rows", righeRes.error);
    } else {
      setRighe(righeRes.data || []);
    }

    if (caviRes.error) {
      console.error("Error loading cavi", caviRes.error);
    } else {
      setCavi(caviRes.data || []);
    }

    setDetailLoading(false);
  };

  const closeDetail = () => {
    setSelected(null);
    setRighe([]);
    setCavi([]);
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

  const handleExportCsv = () => {
    if (!filtered.length) return;
    const csv = buildCsv(filtered, isCapoView);
    const fileName = isCapoView
      ? "archive_personale_rapportini_v1.csv"
      : "archive_rapportini_v1.csv";
    downloadCsv(csv, fileName);
  };

  const handleExportPrint = () => {
    if (!filtered.length) return;

    const newWin = window.open("", "_blank", "noopener,noreferrer");
    if (!newWin) return;

    const isByCapo = !isCapoView;
    const title = isCapoView
      ? "Archivio personale – rapportini v1"
      : "Archivio cantiere – rapportini v1";

    const rowsHtml = filtered
      .map((r) => {
        return `
          <tr>
            <td>${formatDate(r.data)}</td>
            ${
              !isCapoView
                ? `<td>${(r.capo_name || "").replace(/</g, "&lt;")}</td>`
                : ""
            }
            <td>${(r.commessa || "").replace(/</g, "&lt;")}</td>
            <td>${(r.costr || "").replace(/</g, "&lt;")}</td>
            <td>${r.status || ""}</td>
            <td>${formatNumber(r.totale_prodotto)}</td>
          </tr>
        `;
      })
      .join("\n");

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 11px; color: #0f172a; }
            h1 { font-size: 16px; margin-bottom: 4px; }
            h2 { font-size: 12px; margin-top: 0; margin-bottom: 12px; color: #64748b; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #e2e8f0; padding: 4px 6px; text-align: left; }
            th { background: #f8fafc; font-weight: 600; }
            tr:nth-child(even) td { background: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <h2>${isByCapo ? "Vista ufficio/direzione" : "Vista personale capo"}</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                ${
                  !isCapoView
                    ? `<th>Capo</th>`
                    : ""
                }
                <th>Commessa</th>
                <th>Costr</th>
                <th>Status</th>
                <th>Totale prodotto</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    newWin.document.open();
    newWin.document.write(html);
    newWin.document.close();
    newWin.focus();
    newWin.print();
  };

  const title = isCapoView
    ? "ARCHIVE · Storico personale"
    : "ARCHIVE · Storico rapportini";
  const subtitle = isCapoView
    ? "Memoria storica certificata dei tuoi rapportini di versione 1. Dati in sola lettura, pensati per consultazione e confronto personale."
    : "Memoria storica certificata dei rapportini di versione 1. Blocco legacy dell'ARCHIVE CNCS per audit, analisi e confronto fra navi/commesse.";

  return (
    <div className="p-6 space-y-6">
      {/* Header + actions export */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-slate-400 max-w-2xl">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-400/60 bg-violet-500/10 text-[11px] uppercase tracking-[0.16em] text-violet-100">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.9)]" />
            v1 legacy
          </span>
          <button
            type="button"
            onClick={handleExportCsv}
            className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-slate-500/60 bg-slate-900/60 hover:bg-slate-800/80 text-slate-100"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportPrint}
            className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-slate-500/60 bg-slate-900/60 hover:bg-slate-800/80 text-slate-100"
          >
            Export stampa (PDF)
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="hidden md:inline-flex text-xs md:text-sm px-3 py-1.5 rounded-full border border-slate-500/60 bg-slate-900/60 hover:bg-slate-800/80 text-slate-100"
          >
            Reset filtri
          </button>
        </div>
      </div>

      {/* Barre recherche + stats + mode vue */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={
                  isCapoView
                    ? "Cerca nei tuoi rapportini: commessa, costr, note..."
                    : "Cerca nell'archivio: capo, commessa, costr, note..."
                }
                className="w-full border-none focus:ring-0 focus:outline-none text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="hidden md:block text-xs text-slate-500">
              {stats.count > 0
                ? `${stats.count} rapportini trovati`
                : "Nessun risultato"}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-slate-500 mb-0.5">Rapportini</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatNumber(stats.count)}
            </div>
          </div>
          <div>
            <div className="text-slate-500 mb-0.5">Totale prodotto</div>
            <div className="text-lg font-semibold text-slate-900">
              {formatNumber(stats.totalProd)}
            </div>
          </div>
          {!isCapoView && (
            <>
              <div>
                <div className="text-slate-500 mb-0.5">Capi</div>
                <div className="text-lg font-semibold text-slate-900">
                  {formatNumber(stats.uniqueCapi)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-0.5">Commesse</div>
                <div className="text-lg font-semibold text-slate-900">
                  {formatNumber(stats.uniqueCommesse)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filtres + switch table/timeline */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 grid md:grid-cols-7 gap-3 text-xs items-end">
        {!isCapoView && (
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="font-medium text-slate-200">Capo</label>
            <input
              type="text"
              list="archive-capi"
              value={filterCapo}
              onChange={(e) => setFilterCapo(e.target.value)}
              className="border border-slate-700 rounded-lg px-2 py-1.5 text-xs bg-slate-950/60 text-slate-50 placeholder:text-slate-500"
              placeholder="Filtra per capo..."
            />
            <datalist id="archive-capi">
              {facets.capi.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        )}

        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="font-medium text-slate-200">Commessa</label>
          <input
            type="text"
            list="archive-commesse"
            value={filterCommessa}
            onChange={(e) => setFilterCommessa(e.target.value)}
            className="border border-slate-700 rounded-lg px-2 py-1.5 text-xs bg-slate-950/60 text-slate-50 placeholder:text-slate-500"
            placeholder="Filtra per commessa..."
          />
          <datalist id="archive-commesse">
            {facets.commesse.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-slate-200">Costr</label>
          <input
            type="text"
            list="archive-costr"
            value={filterCostr}
            onChange={(e) => setFilterCostr(e.target.value)}
            className="border border-slate-700 rounded-lg px-2 py-1.5 text-xs bg-slate-950/60 text-slate-50 placeholder:text-slate-500"
            placeholder="Costruttore..."
          />
          <datalist id="archive-costr">
            {facets.costr.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-slate-200">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-700 rounded-lg px-2 py-1.5 text-xs bg-slate-950/60 text-slate-50"
          >
            <option value="ALL">Tutti</option>
            {facets.status.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-slate-200">Dal</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="border border-slate-700 rounded-lg px-2 py-1.5 text-xs bg-slate-950/60 text-slate-50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-slate-200">Al</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="border border-slate-700 rounded-lg px-2 py-1.5 text-xs bg-slate-950/60 text-slate-50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-slate-200">Vista</label>
          <div className="inline-flex rounded-full border border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={[
                "px-3 py-1.5 text-[11px]",
                viewMode === "TABLE"
                  ? "bg-slate-100 text-slate-900"
                  : "bg-slate-950 text-slate-300",
              ].join(" ")}
            >
              Tabella
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TIMELINE")}
              className={[
                "px-3 py-1.5 text-[11px]",
                viewMode === "TIMELINE"
                  ? "bg-slate-100 text-slate-900"
                  : "bg-slate-950 text-slate-300",
              ].join(" ")}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Layout principal : vue à gauche, comparaison + panneau descriptif à droite */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Vue principale : table OU timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-6 text-sm text-slate-500">
                Caricamento archivio storico…
              </div>
            ) : error ? (
              <div className="p-6 text-sm text-red-600">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                Nessun rapportino trovato con i filtri selezionati.
              </div>
            ) : viewMode === "TABLE" ? (
              <div className="divide-y divide-slate-100">
                {groupedByCommessa.map((group) => (
                  <div key={group.commessa}>
                    <div className="px-4 py-2 bg-slate-50 flex items-center justify-between text-xs">
                      <div className="font-medium text-slate-700">
                        Commessa: {group.commessa}
                      </div>
                      <div className="text-slate-400">
                        {group.items.length} rapportini
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-white text-slate-500">
                          <tr>
                            <th className="px-3 py-1.5 text-left">Data</th>
                            {!isCapoView && (
                              <th className="px-3 py-1.5 text-left">Capo</th>
                            )}
                            <th className="px-3 py-1.5 text-left">Costr</th>
                            <th className="px-3 py-1.5 text-left">
                              Tot. prodotto
                            </th>
                            <th className="px-3 py-1.5 text-left">Status</th>
                            <th className="px-3 py-1.5 text-right">Apri</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((r) => (
                            <tr
                              key={r.id}
                              className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                              onClick={() => openDetail(r)}
                            >
                              <td className="px-3 py-1.5 text-slate-800">
                                {formatDate(r.data)}
                              </td>
                              {!isCapoView && (
                                <td className="px-3 py-1.5 text-slate-800">
                                  {r.capo_name || "—"}
                                </td>
                              )}
                              <td className="px-3 py-1.5 text-slate-800">
                                {r.costr || "—"}
                              </td>
                              <td className="px-3 py-1.5 text-slate-800">
                                {formatNumber(r.totale_prodotto)}
                              </td>
                              <td className="px-3 py-1.5">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ${
                                    STATUS_COLORS[r.status] ||
                                    "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-right">
                                <button
                                  type="button"
                                  className="px-2 py-1 rounded-full border border-slate-300 text-[11px] bg-white hover:bg-slate-100 text-slate-700"
                                >
                                  Dettaglio
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-700">
                      Timeline produzione
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Rapporto giornaliero di numero rapportini e prodotto
                      totale.
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {timelineData.length} giorni
                  </div>
                </div>
                {timelineData.length === 0 ? (
                  <div className="text-xs text-slate-500">
                    Nessun dato disponibile per la timeline.
                  </div>
                ) : (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(d) =>
                            new Date(d).toLocaleDateString("it-IT", {
                              day: "2-digit",
                              month: "2-digit",
                            })
                          }
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 10 }}
                          width={40}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 10 }}
                          width={30}
                        />
                        <Tooltip
                          contentStyle={{ fontSize: 11 }}
                          labelFormatter={(d) =>
                            new Date(d).toLocaleDateString("it-IT")
                          }
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="totalProd"
                          name="Totale prodotto"
                          stroke="#0ea5e9"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 3 }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="count"
                          name="N. rapportini"
                          stroke="#22c55e"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bloc comparaison simple */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">
                  Confronto
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {isCapoView
                    ? "Confronto commesse (prodotti)"
                    : comparisonMode === "CAPO"
                    ? "Top capi per prodotto"
                    : "Top commesse per prodotto"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isCapoView && (
                  <div className="inline-flex rounded-full border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setComparisonMode("CAPO")}
                      className={[
                        "px-2 py-1",
                        comparisonMode === "CAPO"
                          ? "bg-slate-900 text-slate-50"
                          : "bg-white text-slate-600",
                      ].join(" ")}
                    >
                      Capi
                    </button>
                    <button
                      type="button"
                      onClick={() => setComparisonMode("COMMESSA")}
                      className={[
                        "px-2 py-1",
                        comparisonMode === "COMMESSA"
                          ? "bg-slate-900 text-slate-50"
                          : "bg-white text-slate-600",
                      ].join(" ")}
                    >
                      Commesse
                    </button>
                  </div>
                )}
                <select
                  value={comparisonRange}
                  onChange={(e) => setComparisonRange(e.target.value)}
                  className="border border-slate-200 rounded-full px-2 py-1 text-[11px] text-slate-600 bg-white"
                >
                  <option value="ALL">Tutto</option>
                  <option value="90">Ultimi 90 gg</option>
                  <option value="365">Ultimi 12 mesi</option>
                </select>
              </div>
            </div>

            {comparisonData.length === 0 ? (
              <div className="text-[11px] text-slate-500">
                Nessun dato sufficiente per il confronto.
              </div>
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparisonData}
                      layout="vertical"
                      margin={{ left: 80 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 11 }}
                        formatter={(value, name) => {
                          if (name === "Prodotto") {
                            return [formatNumber(value), name];
                          }
                          return [value, name];
                        }}
                      />
                      <Bar
                        dataKey="totalProd"
                        name="Prodotto"
                        fill="#0ea5e9"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {comparisonData.slice(0, 4).map((item) => (
                    <div
                      key={item.label}
                      className="border border-slate-200 rounded-xl px-3 py-2"
                    >
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.label}
                      </div>
                      <div className="text-xs text-slate-700">
                        Prodotto:{" "}
                        <span className="font-semibold">
                          {formatNumber(item.totalProd)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Rapportini: {item.count}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Panneau latéral “carte d’identité” */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 text-xs space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
              ARCHIVE · CNCS
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {isCapoView
                ? "Memoria lunga del tuo cantiere"
                : "Memoria lunga del cantiere"}
            </div>
            <p className="mt-1 text-[11px] text-slate-600">
              {isCapoView
                ? "Qui trovi la storia completa dei tuoi rapportini v1. I dati sono in sola lettura e ti permettono di rivedere il lavoro fatto nel tempo."
                : "Qui trovi la storia completa dei rapportini v1. I dati sono in sola lettura e rappresentano la base storica per confrontare navi, commesse e squadre nel tempo."}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Rapportini filtrati</span>
              <span className="font-semibold text-slate-900">
                {formatNumber(stats.count)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Prodotto totale</span>
              <span className="font-semibold text-slate-900">
                {formatNumber(stats.totalProd)}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">
              Suggerimenti
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
              {isCapoView ? (
                <>
                  <li>
                    Usa i filtri data per rivedere periodi specifici di lavoro.
                  </li>
                  <li>
                    Cerca per <span className="font-medium">commessa</span> per
                    confrontare il lavoro fra navi diverse.
                  </li>
                  <li>
                    L&apos;archivio è{" "}
                    <span className="font-medium">in sola lettura</span>: le
                    modifiche si fanno sempre tramite il nuovo rapportino
                    digitale.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    Filtra per <span className="font-medium">commessa</span> per
                    confrontare navi simili.
                  </li>
                  <li>
                    Usa la barra di ricerca per trovare{" "}
                    <span className="font-medium">note ufficio</span> o casi
                    particolari.
                  </li>
                  <li>
                    Questo modulo è{" "}
                    <span className="font-medium">read-only</span>: ogni
                    modifica avviene tramite i moduli attivi di CORE.
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Détail modal + audit */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  Rapportino v1 · Archivio
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatDate(selected.data)} ·{" "}
                  {!isCapoView && (
                    <>
                      {selected.capo_name} ·{" "}
                    </>
                  )}
                  {selected.commessa || "senza commessa"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Costr: {selected.costr || "—"} · Stato:{" "}
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ${
                      STATUS_COLORS[selected.status] ||
                      "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {selected.status}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-300 hover:bg-slate-100 text-slate-700"
              >
                Chiudi
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {detailLoading ? (
                <div className="text-slate-500">Caricamento dettagli…</div>
              ) : (
                <>
                  {/* Bloc audit */}
                  <div className="grid md:grid-cols-2 gap-4 border border-slate-200 rounded-xl p-3 bg-slate-50/80">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                        Audit & storia
                      </div>
                      <div className="space-y-1.5 text-[11px] text-slate-700">
                        <div>
                          Creato il:{" "}
                          <span className="font-medium">
                            {selected.created_at
                              ? formatDate(selected.created_at)
                              : "—"}
                          </span>
                        </div>
                        <div>
                          Validato dal capo:{" "}
                          <span className="font-medium">
                            {selected.validated_by_capo_at
                              ? formatDate(selected.validated_by_capo_at)
                              : "—"}
                          </span>
                        </div>
                        <div>
                          Approvato ufficio:{" "}
                          <span className="font-medium">
                            {selected.approved_by_ufficio_at
                              ? formatDate(selected.approved_by_ufficio_at)
                              : "—"}
                          </span>
                        </div>
                        <div>
                          Rientrato dall&apos;ufficio:{" "}
                          <span className="font-medium">
                            {selected.returned_by_ufficio_at
                              ? formatDate(selected.returned_by_ufficio_at)
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-[11px] text-slate-700">
                      <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                        Metadati
                      </div>
                      <div>
                        Totale prodotto:{" "}
                        <span className="font-semibold">
                          {formatNumber(selected.totale_prodotto)}
                        </span>
                      </div>
                      <div>Commessa: {selected.commessa || "—"}</div>
                      <div>Costr: {selected.costr || "—"}</div>
                      {!isCapoView && (
                        <div>Capo: {selected.capo_name || "—"}</div>
                      )}
                    </div>
                  </div>

                  {/* Righe attività */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Righe attività
                      </h3>
                      <div className="text-[11px] text-slate-400">
                        {righe.length} righe
                      </div>
                    </div>
                    {righe.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        Nessuna riga trovata per questo rapportino.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="min-w-full text-[11px]">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="px-2 py-1.5 text-left">#</th>
                              <th className="px-2 py-1.5 text-left">
                                Categoria
                              </th>
                              <th className="px-2 py-1.5 text-left">
                                Descrizione
                              </th>
                              <th className="px-2 py-1.5 text-left">
                                Operatori
                              </th>
                              <th className="px-2 py-1.5 text-left">
                                Tempo
                              </th>
                              <th className="px-2 py-1.5 text-left">
                                Previsto
                              </th>
                              <th className="px-2 py-1.5 text-left">
                                Prodotto
                              </th>
                              <th className="px-2 py-1.5 text-left">Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {righe.map((row) => (
                              <tr
                                key={row.id}
                                className="border-t border-slate-100"
                              >
                                <td className="px-2 py-1.5 text-slate-800">
                                  {row.row_index}
                                </td>
                                <td className="px-2 py-1.5 text-slate-800">
                                  {row.categoria || "—"}
                                </td>
                                <td className="px-2 py-1.5 max-w-xs text-slate-800">
                                  {row.descrizione || "—"}
                                </td>
                                <td className="px-2 py-1.5 text-slate-800">
                                  {row.operatori || "—"}
                                </td>
                                <td className="px-2 py-1.5 text-slate-800">
                                  {row.tempo || "—"}
                                </td>
                                <td className="px-2 py-1.5 text-slate-800">
                                  {row.previsto != null ? row.previsto : "—"}
                                </td>
                                <td className="px-2 py-1.5 text-slate-800">
                                  {row.prodotto != null ? row.prodotto : "—"}
                                </td>
                                <td className="px-2 py-1.5 max-w-xs text-slate-800">
                                  {row.note || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Cavi */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Cavi
                      </h3>
                      <div className="text-[11px] text-slate-400">
                        {cavi.length} cavi
                      </div>
                    </div>
                    {cavi.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        Nessun cavo collegato a questo rapportino.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="min-w-full text-[11px]">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="px-2 py-1.5 text-left">
                                Codice
                              </th>
                              <th className="px-2 py-1.5 text-left">
                                Descrizione
                              </th>
                              <th className="px-2 py-1.5 text-left">
                                Metri totali
                              </th>
                              <th className="px-2 py-1.5 text-left">
                                Metri posati
                              </th>
                              <th className="px-2 py-1.5 text-left">
                                Percentuale
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {cavi.map((c) => (
                              <tr
                                key={c.id}
                                className="border-t border-slate-100"
                              >
                                <td className="px-2 py-1.5 text-slate-800">
                                  {c.codice || "—"}
                                </td>
                                <td className="px-2 py-1.5 max-w-xs text-slate-800">
                                  {c.descrizione || "—"}
                                </td>
                                <td className="px-2 py-1.5 text-slate-800">
                                  {c.metri_totali != null
                                    ? c.metri_totali
                                    : "0"}
                                </td>
                                <td className="px-2 py-1.5 text-slate-800">
                                  {c.metri_posati != null ? c.metri_posati : "0"}
                                </td>
                                <td className="px-2 py-1.5 text-slate-800">
                                  {c.percentuale != null
                                    ? `${c.percentuale}%`
                                    : "0%"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {(selected.ufficio_note || selected.note_ufficio) && (
                    <div className="border-t border-slate-200 pt-3">
                      <h3 className="text-sm font-semibold mb-1 text-slate-900">
                        Note ufficio (storico)
                      </h3>
                      <p className="text-[11px] text-slate-700 whitespace-pre-line">
                        {selected.ufficio_note || selected.note_ufficio}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
