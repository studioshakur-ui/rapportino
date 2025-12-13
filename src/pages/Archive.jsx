// src/pages/Archive.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT");
}

function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

const STATUS_LABELS = {
  DRAFT: "Bozza",
  VALIDATED_CAPO: "Validata dal Capo",
  APPROVED_UFFICIO: "Approvata dall’Ufficio",
  RETURNED: "Rimandata dall’Ufficio",
};

const STATUS_BADGE = {
  DRAFT: "bg-slate-800 text-slate-200 border-slate-700",
  VALIDATED_CAPO: "bg-emerald-900/40 text-emerald-200 border-emerald-600/70",
  APPROVED_UFFICIO: "bg-sky-900/40 text-sky-200 border-sky-600/70",
  RETURNED: "bg-amber-900/40 text-amber-200 border-amber-600/70",
};

function buildCsv(rows, isCapoView) {
  const headers = ["data", "commessa", "costr", "status", "totale_prodotto"];
  if (!isCapoView) {
    headers.splice(1, 0, "capo_name");
  }

  const dataRows = rows.map((r) => {
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

  const escapeCell = (value) => {
    const s = String(value ?? "");
    if (s.includes(";") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.join(";"),
    ...dataRows.map((row) => row.map(escapeCell).join(";")),
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

  // Filtres cockpit
  const [searchText, setSearchText] = useState("");
  const [filterCapo, setFilterCapo] = useState("");
  const [filterCommessa, setFilterCommessa] = useState("");
  const [filterCostr, setFilterCostr] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Vue principale
  const [viewMode, setViewMode] = useState("TABLE"); // "TABLE" | "TIMELINE"

  // Comparaison
  const [comparisonMode, setComparisonMode] = useState(
    isCapoView ? "COMMESSA" : "CAPO" // "CAPO" | "COMMESSA"
  );
  const [comparisonRange, setComparisonRange] = useState("ALL"); // "ALL" | "90" | "365"

  // Détail / boîte noire
  const [selected, setSelected] = useState(null);

  // Chargement base : pour l’instant, CORE Drive s’appuie sur archive_rapportini_v1 (v1 legacy)
  useEffect(() => {
    if (!profile) return;

    const loadArchive = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from("archive_rapportini_v1")
          .select("*")
          .order("data", { ascending: false })
          .limit(2000);

        if (isCapoView && capoId) {
          query = query.eq("capo_id", capoId);
        }

        const { data, error: dbError } = await query;
        if (dbError) throw dbError;

        setRapportini(data || []);
      } catch (err) {
        console.error("Error loading archive_rapportini_v1", err);
        setError(
          "Errore nel caricamento di CORE Drive (storico rapportini v1). Riprova o contatta l’Ufficio."
        );
      } finally {
        setLoading(false);
      }
    };

    loadArchive();
  }, [profile, isCapoView, capoId]);

  // Facettes pour selects
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

  // Filtrage
  const filtered = useMemo(() => {
    let result = [...rapportini];

    if (!result.length) return result;

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
          (r.commessa || "").toLowerCase().includes(f) ||
          (r.costr || "").toLowerCase().includes(f) ||
          (r.note || "").toLowerCase().includes(f)
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

  // Métriques header
  const summary = useMemo(() => {
    if (!filtered.length) {
      return {
        count: 0,
        totaleProdotto: 0,
        firstDate: null,
        lastDate: null,
      };
    }

    let totale = 0;
    let minDate = null;
    let maxDate = null;

    filtered.forEach((r) => {
      if (typeof r.totale_prodotto === "number") {
        totale += r.totale_prodotto;
      }
      if (r.data) {
        const d = new Date(r.data);
        if (!minDate || d < minDate) minDate = d;
        if (!maxDate || d > maxDate) maxDate = d;
      }
    });

    return {
      count: filtered.length,
      totaleProdotto: totale,
      firstDate: minDate,
      lastDate: maxDate,
    };
  }, [filtered]);

  // Timeline (par jour)
  const timelineData = useMemo(() => {
    const map = new Map();

    filtered.forEach((r) => {
      if (!r.data) return;
      const key = r.data.slice(0, 10); // YYYY-MM-DD
      if (!map.has(key)) {
        map.set(key, {
          date: key,
          rapportini: 0,
          prodotto: 0,
        });
      }
      const entry = map.get(key);
      entry.rapportini += 1;
      entry.prodotto += r.totale_prodotto || 0;
    });

    const arr = Array.from(map.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    return arr.map((d) => ({
      ...d,
      label: formatDate(d.date),
    }));
  }, [filtered]);

  const maxRapportiniTimeline = useMemo(
    () =>
      timelineData.reduce(
        (max, d) => Math.max(max, d.rapportini || 0),
        0
      ) || 0,
    [timelineData]
  );

  const maxProdottoTimeline = useMemo(
    () =>
      timelineData.reduce(
        (max, d) => Math.max(max, d.prodotto || 0),
        0
      ) || 0,
    [timelineData]
  );

  // Comparaison CAPO / COMMESSA
  const comparisonData = useMemo(() => {
    if (!filtered.length) return [];

    const now = new Date();
    let fromLimit = null;

    if (comparisonRange === "90") {
      fromLimit = new Date(now);
      fromLimit.setDate(fromLimit.getDate() - 90);
    } else if (comparisonRange === "365") {
      fromLimit = new Date(now);
      fromLimit.setDate(fromLimit.getDate() - 365);
    }

    const map = new Map();

    filtered.forEach((r) => {
      if (fromLimit && r.data) {
        const d = new Date(r.data);
        if (d < fromLimit) return;
      }

      const key =
        comparisonMode === "CAPO"
          ? r.capo_name || "—"
          : r.commessa || "Senza commessa";

      if (!map.has(key)) {
        map.set(key, {
          label: key,
          prodotto: 0,
          rapportini: 0,
        });
      }
      const entry = map.get(key);
      entry.prodotto += r.totale_prodotto || 0;
      entry.rapportini += 1;
    });

    return Array.from(map.values()).sort(
      (a, b) => b.prodotto - a.prodotto
    );
  }, [filtered, comparisonMode, comparisonRange]);

  const maxProdottoComparison = useMemo(
    () =>
      comparisonData.reduce(
        (max, d) => Math.max(max, d.prodotto || 0),
        0
      ) || 0,
    [comparisonData]
  );

  const handleExportCsv = () => {
    if (!filtered.length) return;
    const csv = buildCsv(filtered, isCapoView);
    const filename = isCapoView
      ? "core-drive_personale.csv"
      : "core-drive_cantiere.csv";
    downloadCsv(csv, filename);
  };

  const handleRowClick = (row) => {
    setSelected(row);
  };

  const handleCloseDetail = () => {
    setSelected(null);
  };

  const handleOpenUfficioDetail = () => {
    if (!selected) return;
    const rapportinoId = selected.rapportino_id || selected.id;
    if (!rapportinoId) return;
    window.open(`/ufficio/rapportini/${rapportinoId}`, "_blank");
  };

  if (!profile) {
    return (
      <div className="text-sm text-slate-400">
        Caricamento profilo in corso…
      </div>
    );
  }

  // ───────────────────── RENDER ─────────────────────
  return (
    <div className="relative space-y-5">
      {/* En-tête / hero CORE Drive */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
            CORE Drive · CNCS · Storico tecnico certificato
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100">
            CORE Drive · Memoria lunga del cantiere
          </h1>
          <p className="text-[12px] text-slate-400 mt-1 max-w-xl">
            Registro storico in sola lettura dei rapportini v1 digitalizzati.
            È la “scatola nera” navale di CORE: se non è qui, non è successo.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 text-[11px]">
          <div className="inline-flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full border border-violet-500/70 bg-violet-900/40 text-violet-100">
              CORE Drive v1 · Read only
            </span>
            <span className="px-2 py-0.5 rounded-full border border-emerald-500/70 bg-emerald-900/40 text-emerald-100">
              Dati certificati · No modifiche
            </span>
          </div>
          <div className="inline-flex gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!filtered.length}
              className={[
                "px-3 py-1.5 rounded-full border text-[11px] font-medium",
                filtered.length
                  ? "border-sky-500 text-sky-100 hover:bg-sky-600/10"
                  : "border-slate-700 text-slate-500 cursor-not-allowed",
              ].join(" ")}
            >
              Export CSV CORE Drive
            </button>
          </div>
        </div>
      </header>

      {/* Résumé chiffres clés */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Rapportini in CORE Drive
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-50">
            {summary.count}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Su {rapportini.length} totali presenti nello storico.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Totale prodotto registrato
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-300">
            {formatNumber(summary.totaleProdotto)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Somma dei valori registrati nei rapportini filtrati.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Finestra temporale
          </div>
          <div className="mt-1 text-sm text-slate-200">
            {summary.firstDate && summary.lastDate ? (
              <>
                {formatDate(summary.firstDate)} →{" "}
                {formatDate(summary.lastDate)}
              </>
            ) : (
              "Nessun dato nei filtri attuali"
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Usa i filtri data per restringere il periodo di analisi in CORE
            Drive.
          </div>
        </div>
      </section>

      {/* Filtres principaux */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Cerca nei rapportini: commessa, costr, note…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="button"
            onClick={() => {
              setSearchText("");
              setFilterCapo("");
              setFilterCommessa("");
              setFilterCostr("");
              setFilterStatus("ALL");
              setFilterFrom("");
              setFilterTo("");
            }}
            className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-950/70 text-[12px] text-slate-300 hover:bg-slate-900"
          >
            Reset filtri
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[12px]">
          {!isCapoView && (
            <select
              value={filterCapo}
              onChange={(e) => setFilterCapo(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-slate-100"
            >
              <option value="">Tutti i capi</option>
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
            <option value="">Costruttore · tutti</option>
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
            <option value="ALL">Status · tutti</option>
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

      {/* Layout principal : gauche = table/timeline, droite = mémoire + comparatif */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)] gap-4">
        {/* Colonne gauche */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Vista principale CORE Drive
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/70 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={[
                  "px-2 py-0.5 rounded-full",
                  viewMode === "TABLE"
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-400",
                ].join(" ")}
              >
                Tabella
              </button>
              <button
                type="button"
                onClick={() => setViewMode("TIMELINE")}
                className={[
                  "px-2 py-0.5 rounded-full",
                  viewMode === "TIMELINE"
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-400",
                ].join(" ")}
              >
                Timeline
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 min-h-[260px] overflow-hidden">
            {loading ? (
              <div className="flex h-52 items-center justify-center text-sm text-slate-400">
                Caricamento CORE Drive…
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-rose-300">{error}</div>
            ) : !filtered.length ? (
              <div className="p-4 text-sm text-slate-400">
                Nessun rapportino trovato con i filtri selezionati.
              </div>
            ) : viewMode === "TABLE" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-[12px] border-collapse">
                  <thead className="bg-slate-950/90 border-b border-slate-800">
                    <tr className="text-left text-slate-400">
                      <th className="px-3 py-2 font-normal">Data</th>
                      {!isCapoView && (
                        <th className="px-3 py-2 font-normal">Capo</th>
                      )}
                      <th className="px-3 py-2 font-normal">Commessa</th>
                      <th className="px-3 py-2 font-normal">Costr</th>
                      <th className="px-3 py-2 font-normal">Status</th>
                      <th className="px-3 py-2 font-normal text-right">
                        Prodotto
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 200).map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => handleRowClick(r)}
                        className="cursor-pointer border-b border-slate-800/60 last:border-0 hover:bg-slate-900/60"
                      >
                        <td className="px-3 py-1.5 text-slate-200">
                          {formatDate(r.data)}
                        </td>
                        {!isCapoView && (
                          <td className="px-3 py-1.5 text-slate-200">
                            {r.capo_name || "—"}
                          </td>
                        )}
                        <td className="px-3 py-1.5 text-slate-200">
                          {r.commessa || "—"}
                        </td>
                        <td className="px-3 py-1.5 text-slate-200">
                          {r.costr || "—"}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={[
                              "inline-flex items-center px-2 py-0.5 rounded-full border text-[11px]",
                              STATUS_BADGE[r.status] ||
                                "bg-slate-800 text-slate-200 border-slate-700",
                            ].join(" ")}
                          >
                            {STATUS_LABELS[r.status] || r.status || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-100">
                          {formatNumber(r.totale_prodotto)}
                        </td>
                      </tr>
                    ))}
                    {filtered.length > 200 && (
                      <tr>
                        <td
                          colSpan={isCapoView ? 5 : 6}
                          className="px-3 py-2 text-[11px] text-slate-500"
                        >
                          Mostrati i primi 200 rapportini. Usa l’export CSV
                          di CORE Drive per l’elenco completo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64 w-full px-4 py-3 flex flex-col">
                {timelineData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[11px] text-slate-500">
                    Nessun dato per la timeline.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span>Timeline: giornate attive in CORE Drive</span>
                      <span>
                        Barre = prodotto · Puntini = numero rapportini
                      </span>
                    </div>
                    <div className="flex-1 flex items-end gap-[3px] overflow-x-auto border-t border-slate-800 pt-2">
                      {timelineData.map((d) => {
                        const hProd =
                          maxProdottoTimeline > 0
                            ? Math.max(
                                6,
                                (d.prodotto / maxProdottoTimeline) * 100
                              )
                            : 0;
                        const hRap =
                          maxRapportiniTimeline > 0
                            ? Math.max(
                                4,
                                (d.rapportini / maxRapportiniTimeline) * 100
                              )
                            : 0;

                        return (
                          <div
                            key={d.date}
                            className="group flex flex-col items-center justify-end min-w-[14px]"
                          >
                            <div className="relative flex items-end h-40">
                              {/* Barre produit */}
                              <div
                                style={{ height: `${hProd}%` }}
                                className="w-[7px] rounded-t bg-sky-500/80 group-hover:bg-sky-400 transition-colors"
                              />
                              {/* Dot rapportini */}
                              <div
                                style={{ height: `${hRap}%` }}
                                className="w-[7px] flex items-start justify-center -ml-[7px]"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                              </div>

                              {/* Tooltip */}
                              <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <div className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-100 whitespace-nowrap shadow-lg">
                                  <div>{d.label}</div>
                                  <div>
                                    Prod:{" "}
                                      <span className="font-mono">
                                      {formatNumber(d.prodotto)}
                                    </span>
                                  </div>
                                  <div>
                                    Rapportini:{" "}
                                    <span className="font-mono">
                                      {d.rapportini}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-1 text-[9px] text-slate-500 rotate-[-50deg] origin-top">
                              {d.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite : mémoire + comparatif */}
        <div className="space-y-3">
          {/* Carte mémoire / CORE Drive */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-[12px]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
              CORE Drive · CNCS
            </div>
            <h2 className="text-sm font-semibold text-slate-100 mb-1.5">
              Memoria lunga del tuo cantiere
            </h2>
            <p className="text-slate-400 mb-2">
              Tutti i rapportini v1 digitali sono conservati qui in sola
              lettura. È la “scatola nera” operativa di CORE: utile per
              confronti, audit, discussioni con cliente e Direzione.
            </p>

            <div className="mt-2 space-y-1 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Rapportini filtrati</span>
                <span className="text-slate-200">{summary.count}</span>
              </div>
              <div className="flex justify-between">
                <span>Prodotto totale</span>
                <span className="text-slate-200">
                  {formatNumber(summary.totaleProdotto)}
                </span>
              </div>
            </div>

            <div className="mt-3 border-t border-slate-800 pt-2">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-1">
                Suggerimenti CORE Drive
              </div>
              <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
                <li>
                  Usa i filtri data per rivedere periodi critici di lavoro e
                  discussioni con il cliente.
                </li>
                <li>
                  Confronta commesse e costruttori per capire dove hai
                  concentrato più produzione.
                </li>
                <li>
                  CORE Drive è in sola lettura: le correzioni si fanno sempre
                  nei nuovi rapportini digitali.
                </li>
              </ul>
            </div>
          </div>

          {/* Comparatif “super méchant” */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-[12px]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Confronto storico CORE Drive
                </div>
                <div className="text-xs text-slate-300">
                  {comparisonMode === "CAPO"
                    ? "Prodotto per capo squadra"
                    : "Prodotto per commessa"}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <select
                  value={comparisonMode}
                  onChange={(e) => setComparisonMode(e.target.value)}
                  className="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-0.5 text-[11px] text-slate-100"
                >
                  <option value="CAPO">Vista per capo</option>
                  <option value="COMMESSA">Vista per commessa</option>
                </select>
                <select
                  value={comparisonRange}
                  onChange={(e) => setComparisonRange(e.target.value)}
                  className="rounded-full border border-slate-700 bg-slate-950/80 px-2 py-0.5 text-[11px] text-slate-100"
                >
                  <option value="ALL">Tutto lo storico</option>
                  <option value="90">Ultimi 90 giorni</option>
                  <option value="365">Ultimi 12 mesi</option>
                </select>
              </div>
            </div>

            <div className="mt-2 space-y-1">
              {comparisonData.length ? (
                comparisonData.slice(0, 8).map((row) => {
                  const width =
                    maxProdottoComparison > 0
                      ? Math.max(
                          4,
                          (row.prodotto / maxProdottoComparison) * 100
                        )
                      : 0;

                  return (
                    <div key={row.label} className="space-y-0.5">
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span className="truncate max-w-[60%]">
                          {row.label}
                        </span>
                        <span className="font-mono text-slate-400">
                          {formatNumber(row.prodotto)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                        <div
                          style={{ width: `${width}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-400 to-emerald-300"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-24 items-center justify-center text-[11px] text-slate-500">
                  Nessun dato sufficiente per il confronto.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Panneau détail “boîte noire” */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-slate-950 border-l border-slate-800 shadow-[0_0_40px_rgba(15,23,42,1)] flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Dettaglio rapportino v1 (CORE Drive)
                </div>
                <div className="text-sm text-slate-100">
                  {formatDate(selected.data)} ·{" "}
                  {selected.commessa || "Senza commessa"}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDetail}
                className="text-slate-400 hover:text-slate-100 text-sm font-medium"
              >
                ✕ Chiudi
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 text-[12px] space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-[0.16em]">
                    Data
                  </div>
                  <div className="text-slate-100">
                    {formatDate(selected.data)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-[0.16em]">
                    Capo
                  </div>
                  <div className="text-slate-100">
                    {selected.capo_name || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-[0.16em]">
                    Commessa
                  </div>
                  <div className="text-slate-100">
                    {selected.commessa || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-[0.16em]">
                    Costr
                  </div>
                  <div className="text-slate-100">
                    {selected.costr || "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-[0.16em]">
                    Status
                  </div>
                  <div className="mt-0.5">
                    <span
                      className={[
                        "inline-flex items-center px-2 py-0.5 rounded-full border text-[11px]",
                        STATUS_BADGE[selected.status] ||
                          "bg-slate-800 text-slate-200 border-slate-700",
                      ].join(" ")}
                    >
                      {STATUS_LABELS[selected.status] ||
                        selected.status ||
                        "—"}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-[0.16em]">
                    Prodotto
                  </div>
                  <div className="text-slate-100 font-mono">
                    {formatNumber(selected.totale_prodotto)}
                  </div>
                </div>
              </div>

              {selected.note && (
                <div>
                  <div className="text-[11px] text-slate-500 uppercase tracking-[0.16em] mb-1">
                    Note operative
                  </div>
                  <div className="text-slate-200 whitespace-pre-wrap border border-slate-800 rounded-md bg-slate-950/60 px-3 py-2">
                    {selected.note}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-800 pt-3">
                <div className="text-[11px] text-slate-500 uppercase tracking-[0.16em] mb-1">
                  Traccia operativa
                </div>
                <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
                  <li>
                    Questo rapportino fa parte dello storico v1 in CORE Drive.
                    Le eventuali correzioni vengono gestite nel nuovo sistema.
                  </li>
                  <li>
                    I dettagli puntuali (ore, attività, cavi) sono
                    consultabili nella vista Ufficio, se disponibili.
                  </li>
                  <li>
                    Usa questo pannello per discussioni con cliente, HSE o
                    Direzione.
                  </li>
                </ul>
              </div>
            </div>

            {!isCapoView && (
              <div className="border-t border-slate-800 px-4 py-3 flex items-center justify-between text-[11px]">
                <div className="text-slate-500">
                  Apri il rapportino nella vista Ufficio per dettaglio
                  completo.
                </div>
                <button
                  type="button"
                  onClick={handleOpenUfficioDetail}
                  className="px-3 py-1.5 rounded-full border border-sky-500 text-sky-100 hover:bg-sky-600/10"
                >
                  Apri in Ufficio →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
