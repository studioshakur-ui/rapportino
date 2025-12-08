// src/inca/IncaCockpit.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

/**
 * Cockpit INCA fullscreen
 *
 * Props:
 *  - file: row de inca_files (au minimum { id, costr, commessa, file_name, progetto? })
 *  - onClose: () => void
 *  - initialRole?: "CAPO" | "UFFICO" | "DIREZIONE"
 */
export default function IncaCockpit({ file, onClose, initialRole = "UFFICO" }) {
  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(true);
  const [cables, setCables] = useState([]);
  const [error, setError] = useState(null);
  const [selectedCable, setSelectedCable] = useState(null);

  // Filtres
  const [search, setSearch] = useState("");
  const [situazione, setSituazione] = useState("ALL"); // T / P / R / B / E
  const [statoInca, setStatoInca] = useState("ALL"); // M / P / E / V / ...
  const [tipoCavo, setTipoCavo] = useState("ALL");
  const [livello, setLivello] = useState("ALL");
  const [zona, setZona] = useState("ALL");
  const [lunghezzaMax, setLunghezzaMax] = useState(0); // 0 = no limit

  // Pour stats simples
  const [stats, setStats] = useState({
    total: 0,
    bySituazione: {},
    byStatoInca: {},
  });

  // Charger les câbles du fichier INCA
  useEffect(() => {
    let isCancelled = false;

    async function loadCables() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: dbError } = await supabase
          .from("inca_cavi")
          .select("*")
          .eq("inca_file_id", file.id)
          .order("marca_cavo", { ascending: true });

        if (dbError) throw dbError;
        if (isCancelled) return;

        setCables(data || []);

        // Stats de base
        const bySitu = {};
        const byStato = {};
        for (const c of data || []) {
          const s = c.situazione || "—";
          const st = c.stato_inca || "—";
          bySitu[s] = (bySitu[s] || 0) + 1;
          byStato[st] = (byStato[st] || 0) + 1;
        }
        setStats({
          total: data?.length || 0,
          bySituazione: bySitu,
          byStatoInca: byStato,
        });

        // Valeur par défaut de lunghezzaMax = max metri_teo
        const maxTeo = (data || []).reduce(
          (max, c) => Math.max(max, c.metri_teo || 0),
          0
        );
        setLunghezzaMax(maxTeo || 0);

        // Pré-sélectionner le premier câble
        if (data && data.length > 0) {
          setSelectedCable(data[0]);
        }
      } catch (e) {
        console.error("[INCA Cockpit] Error loading cables", e);
        if (!isCancelled) setError(e.message || String(e));
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadCables();
    return () => {
      isCancelled = true;
    };
  }, [file.id]);

  // Options dérivées depuis les données (pour les <select>)
  const filterOptions = useMemo(() => {
    const setTipo = new Set();
    const setLivello = new Set();
    const setZona = new Set();

    for (const c of cables) {
      if (c.tipo) setTipo.add(c.tipo);
      if (c.livello_disturbo) setLivello.add(c.livello_disturbo);
      // on utilise la description du locale d'arrivée comme "zona" principale
      if (c.descrizione_a) setZona.add(c.descrizione_a);
      else if (c.descrizione) setZona.add(c.descrizione);
    }

    const sortAlpha = (a, b) => String(a).localeCompare(String(b), "it");

    return {
      tipo: Array.from(setTipo).sort(sortAlpha),
      livello: Array.from(setLivello).sort(sortAlpha),
      zona: Array.from(setZona).sort(sortAlpha),
    };
  }, [cables]);

  // Application des filtres
  const filteredCables = useMemo(() => {
    const sSearch = search.trim().toLowerCase();

    return cables.filter((c) => {
      // Recherche full-text simple
      if (sSearch) {
        const blob =
          [
            c.marca_cavo,
            c.codice,
            c.descrizione,
            c.descrizione_da,
            c.descrizione_a,
            c.zona_da,
            c.zona_a,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase() || "";

        if (!blob.includes(sSearch)) return false;
      }

      if (situazione !== "ALL") {
        if ((c.situazione || "") !== situazione) return false;
      }

      if (statoInca !== "ALL") {
        if ((c.stato_inca || "") !== statoInca) return false;
      }

      if (tipoCavo !== "ALL") {
        if ((c.tipo || "") !== tipoCavo) return false;
      }

      if (livello !== "ALL") {
        if ((c.livello_disturbo || "") !== livello) return false;
      }

      if (zona !== "ALL") {
        const z =
          c.descrizione_a || c.descrizione || c.zona_a || c.zona_da || "";
        if (z !== zona) return false;
      }

      if (lunghezzaMax > 0) {
        const l = c.metri_teo || 0;
        if (l > lunghezzaMax) return false;
      }

      return true;
    });
  }, [
    cables,
    search,
    situazione,
    statoInca,
    tipoCavo,
    livello,
    zona,
    lunghezzaMax,
  ]);

  const visibleCount = filteredCables.length;

  // Analytics pour le panneau droit (baromètre + graphe)
  const analytics = useMemo(() => {
    const bySitu = {
      T: 0,
      P: 0,
      R: 0,
      B: 0,
      E: 0,
      OTHER: 0,
    };
    let totalCavi = 0;
    let totalMetri = 0;

    for (const c of cables) {
      totalCavi += 1;
      totalMetri += Number(c.metri_teo || 0);

      const s = c.situazione || null;
      if (s === "T" || s === "P" || s === "R" || s === "B" || s === "E") {
        bySitu[s] = (bySitu[s] || 0) + 1;
      } else {
        bySitu.OTHER = (bySitu.OTHER || 0) + 1;
      }
    }

    const labelByCode = {
      P: "Posato",
      T: "Tagliato",
      R: "Richiesto",
      B: "Bloccato",
      E: "Eliminato",
      NP: "Non posati",
    };

    const done = bySitu.P || 0;
    const nonPosati = totalCavi - done;

    let distribData = Object.entries(bySitu)
      .filter(([code, count]) => code !== "OTHER" && count > 0)
      .map(([code, count]) => ({
        code,
        label: labelByCode[code] || code,
        count,
      }));

    // Ajouter la barre agrégée "NP" (Non posati)
    if (nonPosati > 0) {
      distribData.push({
        code: "NP",
        label: labelByCode.NP,
        count: nonPosati,
      });
    }

    // Garder NP à la fin visuellement
    distribData.sort((a, b) => {
      if (a.code === "NP" && b.code !== "NP") return 1;
      if (b.code === "NP" && a.code !== "NP") return -1;
      return a.code.localeCompare(b.code);
    });

    const prodPercent =
      totalCavi > 0 ? (done / totalCavi) * 100 : 0;

    return {
      totalCavi,
      totalMetri,
      distribData,
      prodPercent,
      nonPosati,
      done,
    };
  }, [cables]);

  const roleLabel = {
    CAPO: "Capo Squadra",
    UFFICO: "Ufficio",
    DIREZIONE: "Direzione",
  }[role];

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-stretch justify-center">
      <div className="relative flex flex-col w-full h-full max-w-7xl mx-auto my-4 rounded-3xl bg-slate-950/95 border border-slate-800 shadow-2xl overflow-hidden">
        {/* HEADER */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold tracking-[0.25em] text-sky-400 uppercase">
                INCA · Cockpit
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-100">
                File #{file.id?.slice(0, 8) || "?"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-100">
              <span className="font-semibold">
                {file.file_name || "INCA sconosciuto"}
              </span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">
                {file.costr || "COSTR ?"} · {file.commessa || "COMMESSA ?"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-400">
              <InfoBadge label="Cavi totali" value={stats.total} />
              <InfoBadge
                label="Situazione"
                value={formatSituazioneStat(stats.bySituazione)}
              />
              <InfoBadge
                label="Stato INCA"
                value={formatSituazioneStat(stats.byStatoInca)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Sélecteur de rôle */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Ruolo</span>
              <div className="flex rounded-full bg-slate-900 border border-slate-700 p-1">
                {["CAPO", "UFFICO", "DIREZIONE"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${
                      role === r
                        ? "bg-sky-500 text-white shadow"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <span className="text-slate-500 hidden sm:inline">
                {roleLabel}
              </span>
            </div>

            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800/80 transition"
            >
              <span>Chiudi</span>
              <span className="text-[10px] text-slate-400">ESC</span>
            </button>
          </div>
        </header>

        {/* FILTRES */}
        <FilterBar
          search={search}
          setSearch={setSearch}
          situazione={situazione}
          setSituazione={setSituazione}
          statoInca={statoInca}
          setStatoInca={setStatoInca}
          tipoCavo={tipoCavo}
          setTipoCavo={setTipoCavo}
          livello={livello}
          setLivello={setLivello}
          zona={zona}
          setZona={setZona}
          options={filterOptions}
          lunghezzaMax={lunghezzaMax}
          setLunghezzaMax={setLunghezzaMax}
        />

        {/* CORPS */}
        <main className="flex-1 flex min-h-0">
          {/* TABLEAU GAUCHE */}
          <section className="flex-1 border-r border-slate-800 bg-slate-950/60 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-400 border-b border-slate-800">
              <span>
                Cavi filtrati:{" "}
                <span className="text-sky-400 font-semibold">
                  {visibleCount}
                </span>{" "}
                / {stats.total}
              </span>
              {loading && (
                <span className="text-amber-400 animate-pulse">
                  Caricamento cavi…
                </span>
              )}
              {error && (
                <span className="text-rose-400">
                  Errore caricamento: {error}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              <table className="min-w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-950/95 border-b border-slate-800 z-10">
                  <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                    <Th className="w-[260px]">Marca</Th>
                    <Th>Livello</Th>
                    <Th>Tipo</Th>
                    <Th>Sezione</Th>
                    <Th>Situaz.</Th>
                    <Th>Stato</Th>
                    <Th>Metri dis.</Th>
                    <Th className="w-[260px]">Zona / locale arrivo</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCables.map((c) => (
                    <CableRow
                      key={c.id}
                      cable={c}
                      isSelected={selectedCable?.id === c.id}
                      onSelect={() => setSelectedCable(c)}
                    />
                  ))}
                  {!loading && filteredCables.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        Nessun cavo corrisponde ai filtri attuali.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* PANNEAU DROIT */}
          <aside className="w-[360px] max-w-[40%] bg-slate-950/80 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Analytics & dettagli cavo</span>
              {selectedCable && (
                <span className="text-[11px] text-slate-500">
                  ID: {selectedCable.id?.slice(0, 8)}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-hidden p-4 flex flex-col gap-3">
              <IncaAnalyticsPanel analytics={analytics} />
              <div className="flex-1 overflow-auto">
                {selectedCable ? (
                  <CableDetails cable={selectedCable} />
                ) : (
                  <div className="text-xs text-slate-500">
                    Seleziona un cavo a sinistra per vedere i dettagli.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </main>

        {/* FOOTER */}
        <footer className="h-10 px-4 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-4">
            <span>
              Ruolo:{" "}
              <span className="text-slate-200 font-medium">{roleLabel}</span>
            </span>
            <span className="hidden sm:inline">
              Filtri: ricerca globale, situazione (T/P/R/B/E), stato INCA, tipo
              cavo, livello disturbo, zona, lunghezza.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">
              Scorciatoie:{" "}
              <span className="text-slate-300">↑↓</span> per navigare,{" "}
              <span className="text-slate-300">ESC</span> per chiudere
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ----------------- helpers palette ----------------- */

function colorForSituazione(code) {
  switch (code) {
    case "P":
      // vert
      return "#22c55e"; // emerald-500
    case "T":
      // bleu
      return "#38bdf8"; // sky-400
    case "R":
      // jaune/orange
      return "#fbbf24"; // amber-400
    case "B":
      // rouge
      return "#fb7185"; // rose-400
    case "E":
      // gris
      return "#64748b"; // slate-500
    case "NP":
      // non posati → violet
      return "#a855f7"; // purple-500
    default:
      return "#94a3b8"; // slate-400
  }
}

/* ----------------- sous-composants ----------------- */

function Th({ children, className = "" }) {
  return (
    <th
      className={`px-3 py-2 border-b border-slate-800/80 font-medium ${className}`}
    >
      {children}
    </th>
  );
}

function CableRow({ cable, isSelected, onSelect }) {
  const situ = cable.situazione || "—";
  const stato = cable.stato_inca || "—";

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer border-b border-slate-900/60 hover:bg-slate-800/60 transition-colors ${
        isSelected ? "bg-sky-900/50" : ""
      }`}
    >
      <Td className="font-medium text-slate-50 w-[260px] max-w-[260px] truncate">
        {cable.marca_cavo || "—"}
      </Td>
      <Td>{cable.livello_disturbo || "—"}</Td>
      <Td>{cable.tipo || "—"}</Td>
      <Td>{cable.sezione || "—"}</Td>
      <Td>
        <SituazioneBadge value={situ} />
      </Td>
      <Td className="text-[11px] text-slate-300">{stato}</Td>
      <Td className="text-right">
        {formatMeters(cable.metri_teo)}
      </Td>
      <Td className="max-w-[260px] truncate">
        {cable.descrizione_a ||
          cable.descrizione ||
          cable.zona_a ||
          cable.zona_da ||
          "—"}
      </Td>
    </tr>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`px-3 py-1.5 text-xs text-slate-200 ${className}`}>
      {children}
    </td>
  );
}

function SituazioneBadge({ value }) {
  let label = value;
  let cls =
    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border";

  switch (value) {
    case "T":
      label = "Tagliato";
      cls += " bg-slate-900/80 border-slate-700 text-slate-200";
      break;
    case "P":
      label = "Posato";
      cls += " bg-emerald-900/60 border-emerald-500/60 text-emerald-200";
      break;
    case "R":
      label = "Richiesto";
      cls += " bg-amber-900/60 border-amber-500/70 text-amber-200";
      break;
    case "B":
      label = "Bloccato";
      cls += " bg-rose-900/60 border-rose-500/70 text-rose-100";
      break;
    case "E":
      label = "Eliminato";
      cls += " bg-slate-900/80 border-slate-600 text-slate-300";
      break;
    default:
      label = value || "—";
      cls += " bg-slate-900/60 border-slate-700 text-slate-300";
  }

  return <span className={cls}>{label}</span>;
}

function InfoBadge({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/80 text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className="text-sky-300 font-semibold">{value}</span>
    </span>
  );
}

function formatSituazioneStat(map) {
  const entries = Object.entries(map || {});
  if (!entries.length) return "—";
  return entries
    .map(([k, v]) => `${k}:${v}`)
    .sort()
    .join(" · ");
}

function formatMeters(v) {
  if (v == null) return "—";
  const num = Number(v);
  if (Number.isNaN(num)) return String(v);
  return `${num.toFixed(1)} m`;
}

function FilterBar({
  search,
  setSearch,
  situazione,
  setSituazione,
  statoInca,
  setStatoInca,
  tipoCavo,
  setTipoCavo,
  livello,
  setLivello,
  zona,
  setZona,
  options,
  lunghezzaMax,
  setLunghezzaMax,
}) {
  return (
    <div className="border-b border-slate-800 bg-slate-950/90 px-4 py-3 flex flex-col gap-2">
      {/* Ligne 1 : recherche + situazione + stato */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[220px]">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per marca, codice, descrizione, zona…"
              className="w-full rounded-full bg-slate-900/80 border border-slate-700 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
              CTRL+F
            </span>
          </div>
        </div>

        <SelectSmall
          label="Situazione"
          value={situazione}
          onChange={setSituazione}
          options={[
            { value: "ALL", label: "Tutti" },
            { value: "T", label: "T" },
            { value: "P", label: "P" },
            { value: "R", label: "R" },
            { value: "B", label: "B" },
            { value: "E", label: "E" },
          ]}
        />

        <SelectSmall
          label="Stato INCA"
          value={statoInca}
          onChange={setStatoInca}
          options={[
            { value: "ALL", label: "Tutti" },
            { value: "M", label: "M" },
            { value: "P", label: "P" },
            { value: "E", label: "E" },
            { value: "V", label: "V" },
          ]}
        />
      </div>

      {/* Ligne 2 : tipo / livello / zona / lunghezza */}
      <div className="flex flex-wrap gap-3 items-center text-xs">
        <SelectSmall
          label="Tipo cavo"
          value={tipoCavo}
          onChange={setTipoCavo}
          options={[
            { value: "ALL", label: "Tutti" },
            ...options.tipo.map((t) => ({ value: t, label: t })),
          ]}
        />
        <SelectSmall
          label="Livello disturbo"
          value={livello}
          onChange={setLivello}
          options={[
            { value: "ALL", label: "Tutti" },
            ...options.livello.map((t) => ({ value: t, label: t })),
          ]}
        />
        <SelectSmall
          label="Zona / locale arrivo"
          value={zona}
          onChange={setZona}
          options={[
            { value: "ALL", label: "Tutte" },
            ...options.zona.map((t) => ({ value: t, label: t })),
          ]}
        />

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[11px] text-slate-500 whitespace-nowrap">
            Max metri (disegno)
          </span>
          <input
            type="number"
            min={0}
            value={lunghezzaMax}
            onChange={(e) =>
              setLunghezzaMax(Math.max(0, Number(e.target.value || 0)))
            }
            className="w-20 rounded-lg bg-slate-900/80 border border-slate-700 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <span className="text-[11px] text-slate-500">m</span>
        </div>
      </div>
    </div>
  );
}

function SelectSmall({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-slate-400">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full bg-slate-900/80 border border-slate-700 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function IncaAnalyticsPanel({ analytics }) {
  const {
    totalCavi,
    totalMetri,
    distribData,
    prodPercent,
    nonPosati,
    done,
  } = analytics;

  if (!totalCavi) {
    return (
      <div className="border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-500">
        Nessun cavo INCA caricato per questo file.
      </div>
    );
  }

  return (
    <div className="border border-slate-800 rounded-xl px-3 py-2 bg-slate-950/80 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Panorama INCA
          </div>
          <div className="text-[11px] text-slate-400">
            Distribuzione T / P / R / B / E / NP.
          </div>
        </div>
        <div className="text-right text-[11px]">
          <div className="text-slate-400">
            Cavi totali:{" "}
            <span className="text-slate-100 font-semibold">
              {totalCavi}
            </span>
          </div>
          <div className="text-slate-400">
            Posati (P):{" "}
            <span className="text-emerald-300 font-semibold">
              {done}
            </span>
          </div>
          <div className="text-slate-400">
            Non posati (NP):{" "}
            <span className="text-purple-300 font-semibold">
              {nonPosati}
            </span>
          </div>
          <div className="text-slate-400">
            Tot. metri dis.:{" "}
            <span className="text-slate-100 font-semibold">
              {formatMeters(totalMetri)}
            </span>
          </div>
        </div>
      </div>

      {/* Baromètre de production */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span>Produzione globale (P / tutti)</span>
            <span className="text-sky-300 font-semibold">
              {prodPercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, prodPercent)}%`,
                backgroundColor: colorForSituazione("P"),
              }}
            />
          </div>
        </div>
      </div>

      {/* Graphe barres T/P/R/B/E/NP */}
      {distribData.length > 0 && (
        <div className="h-28 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distribData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="code"
                tick={{ fontSize: 10, fill: "#64748b" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  backgroundColor: "#020617",
                  borderColor: "#1e293b",
                }}
                formatter={(value, name, props) => [
                  value,
                  props.payload?.label || "Situazione",
                ]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distribData.map((d) => (
                  <Cell
                    key={d.code}
                    fill={colorForSituazione(d.code)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Légende détaillée */}
      <div className="flex flex-wrap gap-1.5 mt-1">
        {distribData.map((d) => (
          <span
            key={d.code}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 text-[10px] text-slate-200"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: colorForSituazione(d.code) }}
            />
            <span className="font-semibold">{d.code}</span>
            <span className="text-slate-400">{d.label}</span>
            <span className="text-sky-300 font-semibold">
              {d.count}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function CableDetails({ cable }) {
  return (
    <div className="flex flex-col gap-4 text-xs text-slate-200">
      {/* En-tête */}
      <div>
        <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
          Marca cavo
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-50">
            {cable.marca_cavo || "—"}
          </span>
          {cable.codice && (
            <span className="px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-[11px] text-slate-200">
              {cable.codice}
            </span>
          )}
        </div>
        {cable.descrizione && (
          <div className="mt-1 text-slate-400">{cable.descrizione}</div>
        )}
      </div>

      {/* Caractéristiques */}
      <div className="grid grid-cols-2 gap-3">
        <DetailField label="Livello disturbo" value={cable.livello_disturbo} />
        <DetailField label="Tipo cavo" value={cable.tipo} />
        <DetailField label="Sezione" value={cable.sezione} />
        <DetailField label="WBS" value={cable.wbs} />
      </div>

      {/* Lunghezze */}
      <div>
        <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
          Lunghezze
        </div>
        <div className="grid grid-cols-3 gap-2">
          <DetailField
            label="Disegno"
            value={formatMeters(cable.metri_teo)}
          />
          <DetailField
            label="Posa"
            value={formatMeters(cable.metri_totali)}
          />
          <DetailField
            label="Calcolo"
            value={formatMeters(cable.metri_previsti)}
          />
        </div>
      </div>

      {/* Origine / Arrivo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
            Partenza
          </div>
          <DetailField label="Apparato" value={cable.apparato_da} />
          <DetailField label="Zona" value={cable.zona_da} />
          <DetailField label="Descr." value={cable.descrizione_da} />
        </div>
        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
            Arrivo
          </div>
          <DetailField label="Apparato" value={cable.apparato_a} />
          <DetailField label="Zona" value={cable.zona_a} />
          <DetailField label="Descr." value={cable.descrizione_a} />
        </div>
      </div>

      {/* Stato */}
      <div>
        <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
          Stato INCA
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <SituazioneBadge value={cable.situazione || "—"} />
          <DetailChip label="Stato tecnico" value={cable.stato_inca} />
          <DetailChip label="Rev INCA" value={cable.rev_inca} />
        </div>
      </div>

      {/* Métadonnées file */}
      <div className="border-t border-slate-800 pt-3 mt-1 text-[11px] text-slate-500">
        <div>
          ID cavo:{" "}
          <span className="text-slate-300">{cable.id || "—"}</span>
        </div>
        {cable.created_at && (
          <div>
            Creato:{" "}
            <span className="text-slate-300">
              {new Date(cable.created_at).toLocaleString("it-IT")}
            </span>
          </div>
        )}
        {cable.updated_at && (
          <div>
            Aggiornato:{" "}
            <span className="text-slate-300">
              {new Date(cable.updated_at).toLocaleString("it-IT")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 mb-1.5">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="text-xs text-slate-100 truncate">
        {value != null && value !== "" ? value : "—"}
      </span>
    </div>
  );
}

function DetailChip({ label, value }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-[11px] text-slate-200">
      <span className="text-slate-500">{label}</span>
      <span>{value}</span>
    </span>
  );
}
