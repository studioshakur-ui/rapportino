// src/capo/IncaCapoCockpit.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

/**
 * Cockpit INCA pour CAPO
 *
 * Route : /app/ship/:shipId/inca
 * shipId == ID nave (UUID)
 *
 * On récupère la nave dans `ships`, puis on charge les cavi INCA
 * via inca_cavi.costr = ship.costr.
 *
 * Objectif :
 *  - Montrer tous les cavi INCA de ce COSTR
 *  - Permettre au CAPO de jouer le cycle B → (EMPTY) → R → T → P
 *  - Interface très lisible terrain
 */

export default function IncaCapoCockpit() {
  const { shipId } = useParams(); // ID nave (UUID)
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [ship, setShip] = useState(null);
  const [cables, setCables] = useState([]);
  const [selectedCable, setSelectedCable] = useState(null);

  // Filtres CAPO
  const [search, setSearch] = useState("");
  const [situazioneFilter, setSituazioneFilter] = useState("ALL"); // ALL / B / R / T / P / E / EMPTY
  const [lunghezzaMax, setLunghezzaMax] = useState(0); // 0 = pas de limite

  // Charger la nave + tous les cavi pour ce COSTR
  useEffect(() => {
    let cancelled = false;

    async function loadShipAndCables() {
      try {
        setLoading(true);
        setError(null);

        // 1) Récupérer la nave (ships)
        let currentCostr = null;
        let shipRow = null;

        const { data: sRow, error: sError } = await supabase
          .from("ships")
          .select("*")
          .eq("id", shipId)
          .single();

        if (sError) {
          console.warn(
            "[INCA CAPO] Errore caricamento nave, uso shipId come COSTR:",
            sError
          );
          // fallback : au cas où, on essaie quand même avec shipId
          currentCostr = shipId;
        } else {
          shipRow = sRow;
          currentCostr = sRow?.costr || shipId;
        }

        if (!currentCostr) {
          throw new Error(
            "COSTR non disponibile per questa nave. Controlla la configurazione."
          );
        }

        if (cancelled) return;

        setShip(shipRow);

        // 2) Charger les cavi INCA pour ce COSTR
        const { data, error: dbError } = await supabase
          .from("inca_cavi")
          .select("*")
          .eq("costr", currentCostr)
          .order("marca_cavo", { ascending: true });

        if (dbError) throw dbError;
        if (cancelled) return;

        setCables(data || []);

        // Pré-sélection
        if (data && data.length > 0) {
          setSelectedCable(data[0]);
        }

        // Déterminer une valeur max raisonnable pour le filtre longueur
        const maxTeo = (data || []).reduce(
          (max, c) => Math.max(max, c.metri_teo || 0),
          0
        );
        setLunghezzaMax(maxTeo || 0);
      } catch (e) {
        console.error("[INCA CAPO] Error loading ship/cables", e);
        if (!cancelled) {
          setError(e.message || String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadShipAndCables();
    return () => {
      cancelled = true;
    };
  }, [shipId]);

  // Statistiques simples pour CAPO
  const stats = useMemo(() => {
    const base = {
      total: 0,
      bySituazione: { B: 0, R: 0, T: 0, P: 0, E: 0, EMPTY: 0 },
      nonPosati: 0, // tout ce qui n'est pas P
    };

    for (const c of cables) {
      base.total++;
      const s = (c.situazione || "").trim();

      if (["B", "R", "T", "P", "E"].includes(s)) {
        base.bySituazione[s] = (base.bySituazione[s] || 0) + 1;
      } else {
        base.bySituazione.EMPTY = (base.bySituazione.EMPTY || 0) + 1;
      }

      if (s !== "P") {
        base.nonPosati++;
      }
    }
    return base;
  }, [cables]);

  // Cavi filtrés
  const filteredCables = useMemo(() => {
    const s = search.trim().toLowerCase();

    return cables.filter((c) => {
      // filtre situazione
      if (situazioneFilter !== "ALL") {
        const current = (c.situazione || "").trim() || "EMPTY";
        if (current !== situazioneFilter) return false;
      }

      // filtre longueur
      if (lunghezzaMax > 0) {
        const l = c.metri_teo || 0;
        if (l > lunghezzaMax) return false;
      }

      // recherche texte
      if (!s) return true;

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

      return blob.includes(s);
    });
  }, [cables, search, situazioneFilter, lunghezzaMax]);

  // Sélection clavier ↑ ↓
  const handleKeyDown = useCallback(
    (e) => {
      if (!filteredCables.length) return;
      if (!selectedCable) return;

      const idx = filteredCables.findIndex((c) => c.id === selectedCable.id);
      if (idx === -1) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next =
          filteredCables[Math.min(idx + 1, filteredCables.length - 1)];
        setSelectedCable(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = filteredCables[Math.max(idx - 1, 0)];
        setSelectedCable(prev);
      } else if (e.key === "Escape") {
        e.preventDefault();
        navigate(-1); // retour à la page précédente
      }
    },
    [filteredCables, selectedCable, navigate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // --- ACTIONS CAPO SUR SITUAZIONE ---

  async function updateSituazione(nextValue) {
    if (!selectedCable) return;
    if (saving) return;

    const current = (selectedCable.situazione || "").trim() || "EMPTY";

    // Logique métier chantier :
    // B → (EMPTY) → R → T → P ; E = Eliminato
    if (nextValue === "R") {
      if (!["B", "EMPTY"].includes(current)) {
        const ok = window.confirm(
          `Le cavo est actuellement "${current || "-"}". Mettre en "R" (Richiesta) quand même ?`
        );
        if (!ok) return;
      }
    } else if (nextValue === "T") {
      if (!["R", "B", "EMPTY"].includes(current)) {
        const ok = window.confirm(
          `Le cavo est "${current || "-"}". Marquer "T" (Tagliato) quand même ?`
        );
        if (!ok) return;
      }
    } else if (nextValue === "P") {
      if (!["T", "R", "B", "EMPTY"].includes(current)) {
        const ok = window.confirm(
          `Le cavo est "${current || "-"}". Marquer "P" (Posato) quand même ?`
        );
        if (!ok) return;
      }
    } else if (nextValue === "B") {
      const ok = window.confirm(
        "Mettre ce cavo en B (Bloccato) ? Il sera affiché comme bloqué jusqu'à sblocco / richiesta."
      );
      if (!ok) return;
    } else if (nextValue === "EMPTY") {
      if (current !== "B" && current !== "R") {
        const ok = window.confirm(
          `Ce cavo n'est pas en B/R (actuel = "${current ||
            "-"}"). Le réinitialiser à neutre quand même ?`
        );
        if (!ok) return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      const valueToStore = nextValue === "EMPTY" ? null : nextValue;

      const { data, error: dbError } = await supabase
        .from("inca_cavi")
        .update({ situazione: valueToStore })
        .eq("id", selectedCable.id)
        .select()
        .single();

      if (dbError) throw dbError;

      // Mettre à jour la liste locale
      setCables((prev) =>
        prev.map((c) => (c.id === selectedCable.id ? data : c))
      );
      setSelectedCable(data);
    } catch (e) {
      console.error("[INCA CAPO] updateSituazione error", e);
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  // --- RENDU ---

  if (loading && !cables.length) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-950 text-slate-300">
        <div className="text-sm">
          Caricamento cavi INCA per nave… (ID {shipId})
        </div>
      </div>
    );
  }

  const displayCostr = ship?.costr || shipId || "?";
  const displayName =
    ship?.display_name || ship?.name || ship?.ship_name || "";

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-stretch justify-center">
      <div className="relative flex flex-col w-full h-full max-w-7xl mx-auto my-4 rounded-3xl bg-slate-950/95 border border-slate-800 shadow-2xl overflow-hidden">
        {/* HEADER */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold tracking-[0.25em] text-emerald-400 uppercase">
                INCA · CAPO
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-900 text-slate-100">
                COSTR {displayCostr}
              </span>
              {displayName && (
                <span className="text-[11px] text-slate-400">
                  {displayName}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-400">
              <InfoBadge label="Cavi totali" value={stats.total} />
              <InfoBadge
                label="Non posati"
                value={stats.nonPosati}
                tone="sky"
              />
              <InfoBadge
                label="B (Bloccato)"
                value={stats.bySituazione.B}
                tone="rose"
              />
              <InfoBadge
                label="R (Richiesta)"
                value={stats.bySituazione.R}
                tone="amber"
              />
              <InfoBadge
                label="T (Tagliato)"
                value={stats.bySituazione.T}
                tone="sky"
              />
              <InfoBadge
                label="P (Posato)"
                value={stats.bySituazione.P}
                tone="emerald"
              />
              <InfoBadge
                label="E (Eliminato)"
                value={stats.bySituazione.E}
                tone="slate"
              />
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="hidden sm:inline">
                ↑↓ = naviga · ESC = esci
              </span>
              {saving && (
                <span className="text-amber-400 animate-pulse">
                  Salvataggio…
                </span>
              )}
            </div>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800/80 transition"
            >
              <span>Chiudi cockpit CAPO</span>
              <span className="text-[10px] text-slate-400">ESC</span>
            </button>
          </div>
        </header>

        {/* BARRE DE FILTRES CAPO */}
        <CapoFilterBar
          search={search}
          setSearch={setSearch}
          situazioneFilter={situazioneFilter}
          setSituazioneFilter={setSituazioneFilter}
          lunghezzaMax={lunghezzaMax}
          setLunghezzaMax={setLunghezzaMax}
        />

        {/* CORPS */}
        <main className="flex-1 flex min-h-0">
          {/* TABLEAU GAUCHE */}
          <section className="flex-[1.4] border-r border-slate-800 bg-slate-950/60 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-2 text-[11px] text-slate-400 border-b border-slate-800">
              <span>
                Cavi filtrati:{" "}
                <span className="text-emerald-400 font-semibold">
                  {filteredCables.length}
                </span>{" "}
                / {stats.total}
              </span>
              {error && (
                <span className="text-rose-400 truncate max-w-[260px]">
                  Errore: {error}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              <table className="min-w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-950/95 border-b border-slate-800 z-10">
                  <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                    <Th className="w-[200px]">Marca / Codice</Th>
                    <Th>Situaz.</Th>
                    <Th>Stato Tec</Th>
                    <Th>Stato Cant.</Th>
                    <Th>Metri dis.</Th>
                    <Th className="w-[260px]">
                      Arrivo (locale / descr.)
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCables.map((c) => (
                    <CapoCableRow
                      key={c.id}
                      cable={c}
                      isSelected={selectedCable?.id === c.id}
                      onSelect={() => setSelectedCable(c)}
                    />
                  ))}
                  {!loading && filteredCables.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        Nessun cavo corrisponde ai filtri attuali.
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        Caricamento cavi…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* PANNEAU DROIT : ACTIONS CAPO + DETTAGLI */}
          <aside className="flex-[1] max-w-[40%] bg-slate-950/85 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Dettagli cavo & azioni CAPO</span>
              {selectedCable && (
                <span className="text-[11px] text-slate-500">
                  ID: {selectedCable.id?.slice(0, 8)}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3 p-4 overflow-auto">
              {selectedCable ? (
                <>
                  <CapoActionBar
                    cable={selectedCable}
                    onSetSituazione={updateSituazione}
                    saving={saving}
                  />
                  <CapoCableDetails cable={selectedCable} />
                </>
              ) : (
                <div className="text-xs text-slate-500">
                  Seleziona un cavo nella tabella a sinistra.
                </div>
              )}
            </div>
          </aside>
        </main>

        {/* FOOTER */}
        <footer className="h-9 px-4 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800 bg-slate-950/90">
          <span>
            Flusso CAPO consigliato:{" "}
            <span className="text-slate-300">
              B (Bloccato) → Sblocco (vuoto) → R (Richiesta) → T
              (Tagliato) → P (Posato)
            </span>
          </span>
          <span className="hidden sm:inline">
            Usa INCA per tutte le fasi cavo (richiesta, taglio, posa) ·
            niente più testo libero nel rapportino.
          </span>
        </footer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              SOUS-COMPOSANTS                               */
/* -------------------------------------------------------------------------- */

function Th({ children, className = "" }) {
  return (
    <th
      className={
        "px-3 py-2 border-b border-slate-800/80 font-medium text-left " +
        className
      }
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td className={`px-3 py-1.5 text-xs text-slate-200 ${className}`}>
      {children}
    </td>
  );
}

function CapoCableRow({ cable, isSelected, onSelect }) {
  const situ = (cable.situazione || "").trim() || "EMPTY";

  return (
    <tr
      onClick={onSelect}
      className={[
        "cursor-pointer border-b border-slate-900/60 hover:bg-slate-800/60 transition-colors",
        isSelected ? "bg-emerald-900/40" : "",
      ].join(" ")}
    >
      <Td className="font-medium text-slate-50">
        <div className="flex flex-col">
          <span className="truncate">{cable.marca_cavo || "—"}</span>
          <span className="text-[10px] text-slate-400">
            {cable.codice || "—"}
          </span>
        </div>
      </Td>
      <Td>
        <SituazioneBadge value={situ} />
      </Td>
      <Td className="text-[11px] text-slate-300">
        {cable.stato_inca || cable.stato_tec || "—"}
      </Td>
      <Td className="text-[11px] text-slate-300">
        {cable.stato_cantiere || "—"}
      </Td>
      <Td className="text-right">{formatMeters(cable.metri_teo)}</Td>
      <Td className="max-w-[260px]">
        <div className="flex flex-col">
          <span className="truncate text-slate-100">
            {cable.zona_a || cable.app_arrivo_zona || "—"}
          </span>
          <span className="truncate text-[10px] text-slate-400">
            {cable.descrizione_a || cable.descrizione || "—"}
          </span>
        </div>
      </Td>
    </tr>
  );
}

function SituazioneBadge({ value }) {
  let label = value;
  let cls =
    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border";

  switch (value) {
    case "P":
      label = "Posato";
      cls += " bg-emerald-900/60 border-emerald-500/70 text-emerald-100";
      break;
    case "T":
      label = "Tagliato";
      cls += " bg-sky-900/60 border-sky-500/70 text-sky-100";
      break;
    case "R":
      label = "Richiesta";
      cls += " bg-amber-900/60 border-amber-500/70 text-amber-100";
      break;
    case "B":
      label = "Bloccato";
      cls += " bg-rose-900/60 border-rose-500/70 text-rose-100";
      break;
    case "E":
      label = "Eliminato";
      cls += " bg-slate-900/60 border-slate-600 text-slate-100";
      break;
    case "EMPTY":
      label = "—";
      cls += " bg-slate-900/60 border-slate-700 text-slate-300";
      break;
    default:
      label = value || "—";
      cls += " bg-slate-900/60 border-slate-700 text-slate-300";
  }

  return <span className={cls}>{label}</span>;
}

function InfoBadge({ label, value, tone = "sky" }) {
  const toneMap = {
    sky: "text-sky-300",
    emerald: "text-emerald-300",
    rose: "text-rose-300",
    amber: "text-amber-300",
    slate: "text-slate-300",
  };
  const toneClass = toneMap[tone] || toneMap.sky;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/80 text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className={toneClass + " font-semibold"}>{value}</span>
    </span>
  );
}

function formatMeters(v) {
  if (v == null) return "—";
  const num = Number(v);
  if (Number.isNaN(num)) return String(v);
  return `${num.toFixed(1)} m`;
}

/* -------------------------------------------------------------------------- */

function CapoFilterBar({
  search,
  setSearch,
  situazioneFilter,
  setSituazioneFilter,
  lunghezzaMax,
  setLunghezzaMax,
}) {
  return (
    <div className="border-b border-slate-800 bg-slate-950/90 px-4 py-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Recherche globale */}
        <div className="flex-1 min-w-[220px]">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per marca, codice, descrizione, zona…"
              className="w-full rounded-full bg-slate-900/80 border border-slate-700 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
              CAPO · FIND
            </span>
          </div>
        </div>

        {/* Filtre situazione */}
        <label className="flex items-center gap-1 text-[11px] text-slate-400">
          <span>Situazione</span>
          <select
            value={situazioneFilter}
            onChange={(e) => setSituazioneFilter(e.target.value)}
            className="rounded-full bg-slate-900/80 border border-slate-700 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">Tutte</option>
            <option value="P">P · Posato</option>
            <option value="T">T · Tagliato</option>
            <option value="R">R · Richiesta</option>
            <option value="B">B · Bloccato</option>
            <option value="E">E · Eliminato</option>
            <option value="EMPTY">Vuote</option>
          </select>
        </label>

        {/* Filtre longueur */}
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
            className="w-20 rounded-lg bg-slate-900/80 border border-slate-700 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-[11px] text-slate-500">m</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CapoActionBar({ cable, onSetSituazione, saving }) {
  const current = (cable.situazione || "").trim() || "EMPTY";

  const btnBase =
    "px-2.5 py-1 rounded-full text-[11px] font-medium border transition disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-wrap gap-2 items-center mb-1">
      <span className="text-[11px] text-slate-400 mr-2">
        Stato CAPO (situazione):
      </span>

      <button
        type="button"
        disabled={saving || current === "B"}
        onClick={() => onSetSituazione("B")}
        className={
          btnBase +
          " border-rose-500/70 text-rose-100 bg-rose-900/40 hover:bg-rose-900/70"
        }
      >
        B · Bloccato
      </button>

      <button
        type="button"
        disabled={saving || current === "R"}
        onClick={() => onSetSituazione("R")}
        className={
          btnBase +
          " border-amber-500/70 text-amber-100 bg-amber-900/40 hover:bg-amber-900/70"
        }
      >
        R · Richiesta
      </button>

      <button
        type="button"
        disabled={saving || current === "T"}
        onClick={() => onSetSituazione("T")}
        className={
          btnBase +
          " border-sky-500/70 text-sky-100 bg-sky-900/40 hover:bg-sky-900/70"
        }
      >
        T · Tagliato
      </button>

      <button
        type="button"
        disabled={saving || current === "P"}
        onClick={() => onSetSituazione("P")}
        className={
          btnBase +
          " border-emerald-500/70 text-emerald-100 bg-emerald-900/40 hover:bg-emerald-900/70"
        }
      >
        P · Posato
      </button>

      <button
        type="button"
        disabled={saving || current === "EMPTY"}
        onClick={() => onSetSituazione("EMPTY")}
        className={
          btnBase +
          " border-slate-500/70 text-slate-100 bg-slate-900/40 hover:bg-slate-900/70"
        }
      >
        Sblocca / Reset
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CapoCableDetails({ cable }) {
  return (
    <div className="flex flex-col gap-4 text-xs text-slate-200">
      {/* Header */}
      <div>
        <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
          Marca / codice
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

      {/* Lunghezze */}
      <div>
        <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
          Lunghezze
        </div>
        <div className="grid grid-cols-3 gap-2">
          <DetailField label="Disegno" value={formatMeters(cable.metri_teo)} />
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

      {/* Partenza / Arrivo */}
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

      {/* Stato INCA (lecture seule) */}
      <div>
        <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">
          Stato INCA (originale)
        </div>
        <div className="grid grid-cols-2 gap-2">
          <DetailField label="Stato tecnico" value={cable.stato_inca} />
          <DetailField label="Stato cantiere" value={cable.stato_cantiere} />
        </div>
      </div>

      {/* Métadonnées */}
      <div className="border-t border-slate-800 pt-3 mt-1 text-[11px] text-slate-500">
        {cable.rev_inca && (
          <div>
            Rev INCA:{" "}
            <span className="text-slate-300">{cable.rev_inca}</span>
          </div>
        )}
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
      <span className="text-xs text-slate-100 break-words">
        {value != null && value !== "" ? value : "—"}
      </span>
    </div>
  );
}
