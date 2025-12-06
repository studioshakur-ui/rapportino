import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function formatDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("it-IT");
}

function formatNumber(value) {
  if (value == null || isNaN(value)) return "0";
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

const STATUS_COLORS = {
  DRAFT: "bg-gray-100 text-gray-700",
  VALIDATED_CAPO: "bg-emerald-100 text-emerald-700",
  APPROVED_UFFICIO: "bg-blue-100 text-blue-700",
  RETURNED: "bg-amber-100 text-amber-700",
};

export default function ArchivePage() {
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

  // Chargement initial des rapportini v1 archivés
  useEffect(() => {
    const loadArchive = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("archive_rapportini_v1")
        .select("*")
        .order("data", { ascending: false })
        .limit(2000); // archive = gros volumes, mais on limite pour l’UI

      if (error) {
        console.error("Error loading archive_rapportini_v1", error);
        setError("Errore nel caricamento dell'archivio storico.");
        setLoading(false);
        return;
      }

      setRapportini(data || []);
      setLoading(false);
    };

    loadArchive();
  }, []);

  // Facettes (capo / commessa / costr / status)
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

  // Application des filtres + recherche
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

  // Groupement par commessa pour une vue “projet”
  const groupedByCommessa = useMemo(() => {
    const groups = new Map();
    filtered.forEach((r) => {
      const key = r.commessa || "— senza commessa";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(r);
    });
    // on transforme en tableau trié
    return Array.from(groups.entries())
      .map(([commessa, items]) => ({
        commessa,
        items: items.sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        ),
      }))
      .sort((a, b) => a.commessa.localeCompare(b.commessa));
  }, [filtered]);

  // Statistiques rapides
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

  // Chargement du détail (righe + cavi)
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            ARCHIVE · Rapportini v1
          </h1>
          <p className="text-sm text-gray-500">
            Memoria storica certificata dei vecchi rapportini · sola lettura.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
          >
            Reset filtri
          </button>
        </div>
      </div>

      {/* Barre de recherche + stats */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recherche globale */}
        <div className="lg:col-span-2">
          <div className="bg-white border rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Cerca nell'archivio: capo, commessa, costr, note..."
                className="w-full border-none focus:ring-0 focus:outline-none text-sm"
              />
            </div>
            <div className="hidden md:block text-xs text-gray-400">
              {stats.count > 0
                ? `${stats.count} rapportini trovati`
                : "Nessun risultato"}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white border rounded-2xl shadow-sm p-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-gray-500 mb-0.5">Rapportini</div>
            <div className="text-lg font-semibold">
              {formatNumber(stats.count)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-0.5">Totale prodotto</div>
            <div className="text-lg font-semibold">
              {formatNumber(stats.totalProd)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-0.5">Capi</div>
            <div className="text-lg font-semibold">
              {formatNumber(stats.uniqueCapi)}
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-0.5">Commesse</div>
            <div className="text-lg font-semibold">
              {formatNumber(stats.uniqueCommesse)}
            </div>
          </div>
        </div>
      </div>

      {/* Filtres avancés */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 grid md:grid-cols-6 gap-3 text-xs">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="font-medium text-gray-600">Capo</label>
          <input
            type="text"
            list="archive-capi"
            value={filterCapo}
            onChange={(e) => setFilterCapo(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-xs"
            placeholder="Filtra per capo..."
          />
          <datalist id="archive-capi">
            {facets.capi.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="font-medium text-gray-600">Commessa</label>
          <input
            type="text"
            list="archive-commesse"
            value={filterCommessa}
            onChange={(e) => setFilterCommessa(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-xs"
            placeholder="Filtra per commessa..."
          />
          <datalist id="archive-commesse">
            {facets.commesse.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-gray-600">Costr</label>
          <input
            type="text"
            list="archive-costr"
            value={filterCostr}
            onChange={(e) => setFilterCostr(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-xs"
            placeholder="Costruttore..."
          />
          <datalist id="archive-costr">
            {facets.costr.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-gray-600">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-xs"
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
          <label className="font-medium text-gray-600">Dal</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-xs"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-medium text-gray-600">Al</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Contenu : grouped par commessa */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Liste des commesse / rapportini */}
        <div className="lg:col-span-2 bg-white border rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">
              Caricamento archivio storico…
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : groupedByCommessa.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              Nessun rapportino trovato con i filtri selezionati.
            </div>
          ) : (
            <div className="divide-y">
              {groupedByCommessa.map((group) => (
                <div key={group.commessa}>
                  <div className="px-4 py-2 bg-gray-50 flex items-center justify-between text-xs">
                    <div className="font-medium text-gray-700">
                      Commessa: {group.commessa}
                    </div>
                    <div className="text-gray-400">
                      {group.items.length} rapportini
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-white text-gray-500">
                        <tr>
                          <th className="px-3 py-1.5 text-left">Data</th>
                          <th className="px-3 py-1.5 text-left">Capo</th>
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
                            className="border-t hover:bg-gray-50 cursor-pointer"
                            onClick={() => openDetail(r)}
                          >
                            <td className="px-3 py-1.5">
                              {formatDate(r.data)}
                            </td>
                            <td className="px-3 py-1.5">
                              {r.capo_name || "—"}
                            </td>
                            <td className="px-3 py-1.5">
                              {r.costr || "—"}
                            </td>
                            <td className="px-3 py-1.5">
                              {formatNumber(r.totale_prodotto)}
                            </td>
                            <td className="px-3 py-1.5">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full ${
                                  STATUS_COLORS[r.status] ||
                                  "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <button
                                type="button"
                                className="px-2 py-1 rounded-full border text-[11px] bg-white hover:bg-gray-100"
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
          )}
        </div>

        {/* Panneau latéral “carte d’identité” */}
        <div className="bg-white border rounded-2xl shadow-sm p-4 text-xs space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
              ARCHIVE · CNCS
            </div>
            <div className="text-sm font-semibold text-gray-800">
              Memoria lunga del cantiere
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Qui trovi la storia completa dei rapportini v1. I dati sono
              in sola lettura, pensati per audit, analisi e confronto fra
              navi/commesse.
            </p>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Rapportini filtrati</span>
              <span className="font-semibold">
                {formatNumber(stats.count)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Prodotto totale</span>
              <span className="font-semibold">
                {formatNumber(stats.totalProd)}
              </span>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-400">
              Suggerimenti
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-500">
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
                I dati qui non si modificano: è la{" "}
                <span className="font-medium">memoria certificata</span>.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Détail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Header modal */}
            <div className="flex items-center justify-between border-b px-6 py-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400">
                  Rapportino v1 · Archivio
                </div>
                <div className="text-sm font-semibold">
                  {formatDate(selected.data)} · {selected.capo_name} ·{" "}
                  {selected.commessa || "senza commessa"}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Costr: {selected.costr || "—"} · Stato:{" "}
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full ${
                      STATUS_COLORS[selected.status] ||
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {selected.status}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-300 hover:bg-gray-50"
              >
                Chiudi
              </button>
            </div>

            {/* Body modal */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {detailLoading ? (
                <div className="text-gray-500">Caricamento dettagli…</div>
              ) : (
                <>
                  {/* Righe attività */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">
                        Righe attività
                      </h3>
                      <div className="text-[11px] text-gray-400">
                        {righe.length} righe
                      </div>
                    </div>
                    {righe.length === 0 ? (
                      <p className="text-[11px] text-gray-500">
                        Nessuna riga trovata per questo rapportino.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border rounded-xl">
                        <table className="min-w-full text-[11px]">
                          <thead className="bg-gray-100 text-gray-600">
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
                              <tr key={row.id} className="border-t">
                                <td className="px-2 py-1.5">
                                  {row.row_index}
                                </td>
                                <td className="px-2 py-1.5">
                                  {row.categoria || "—"}
                                </td>
                                <td className="px-2 py-1.5 max-w-xs">
                                  {row.descrizione || "—"}
                                </td>
                                <td className="px-2 py-1.5">
                                  {row.operatori || "—"}
                                </td>
                                <td className="px-2 py-1.5">
                                  {row.tempo || "—"}
                                </td>
                                <td className="px-2 py-1.5">
                                  {row.previsto != null
                                    ? row.previsto
                                    : "—"}
                                </td>
                                <td className="px-2 py-1.5">
                                  {row.prodotto != null
                                    ? row.prodotto
                                    : "—"}
                                </td>
                                <td className="px-2 py-1.5 max-w-xs">
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
                      <h3 className="text-sm font-semibold">Cavi</h3>
                      <div className="text-[11px] text-gray-400">
                        {cavi.length} cavi
                      </div>
                    </div>
                    {cavi.length === 0 ? (
                      <p className="text-[11px] text-gray-500">
                        Nessun cavo collegato a questo rapportino.
                      </p>
                    ) : (
                      <div className="overflow-x-auto border rounded-xl">
                        <table className="min-w-full text-[11px]">
                          <thead className="bg-gray-100 text-gray-600">
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
                              <tr key={c.id} className="border-t">
                                <td className="px-2 py-1.5">
                                  {c.codice || "—"}
                                </td>
                                <td className="px-2 py-1.5 max-w-xs">
                                  {c.descrizione || "—"}
                                </td>
                                <td className="px-2 py-1.5">
                                  {c.metri_totali != null
                                    ? c.metri_totali
                                    : "0"}
                                </td>
                                <td className="px-2 py-1.5">
                                  {c.metri_posati != null
                                    ? c.metri_posati
                                    : "0"}
                                </td>
                                <td className="px-2 py-1.5">
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

                  {/* Notes ufficio */}
                  {(selected.ufficio_note || selected.note_ufficio) && (
                    <div className="border-t pt-3">
                      <h3 className="text-sm font-semibold mb-1">
                        Note ufficio (storico)
                      </h3>
                      <p className="text-[11px] text-gray-700 whitespace-pre-line">
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
