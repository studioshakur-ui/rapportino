// src/capo/IncaCapoCockpit.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const SITUAZIONI = ["P", "T", "R", "B", "E", "NP"];

function norm(v) {
  return String(v ?? "").trim();
}

function situazioneKey(v) {
  const s = norm(v);
  if (s === "") return "NP";
  if (SITUAZIONI.includes(s)) return s;
  return "NP";
}

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function Chip({ active, children, onClick, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-full text-[12px] font-semibold border transition",
        active
          ? "bg-emerald-600 text-white border-emerald-500"
          : "bg-slate-900/40 text-slate-100 border-slate-700 hover:bg-slate-900/70",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function KpiTile({ label, value, sub, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-w-[140px] rounded-xl border px-3 py-2 text-left transition",
        active
          ? "border-emerald-500 bg-emerald-500/10"
          : "border-slate-700 bg-slate-950/50 hover:bg-slate-950/70",
      ].join(" ")}
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-300">
        {label}
      </div>
      <div className="mt-1 text-[20px] leading-none font-semibold text-slate-50">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-[11px] text-slate-300">{sub}</div>
      ) : (
        <div className="mt-1 text-[11px] text-slate-300">&nbsp;</div>
      )}
    </button>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-700 bg-slate-950/60 text-slate-50 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/60"
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export default function IncaCapoCockpit() {
  const { shipId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [ship, setShip] = useState(null);

  const [costr, setCostr] = useState("");
  const [commessa, setCommessa] = useState("");

  const [commesseDisponibili, setCommesseDisponibili] = useState([]);

  const [cables, setCables] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedSituazioni, setSelectedSituazioni] = useState([]); // multi
  const [onlyNonPosati, setOnlyNonPosati] = useState(false);

  const [selectedCableId, setSelectedCableId] = useState(null);

  const selectedCable = useMemo(
    () => cables.find((c) => c.id === selectedCableId) ?? null,
    [cables, selectedCableId]
  );

  const abortRef = useRef({ cancelled: false });

  const loadBase = useCallback(async () => {
    setLoading(true);
    setError("");

    abortRef.current.cancelled = false;
    const localAbort = abortRef.current;

    try {
      // 1) Resolve ship -> costr/commessa
      let resolvedCostr = "";
      let resolvedCommessa = "";

      let shipRow = null;

      const { data: sRow, error: sErr } = await supabase
        .from("ships")
        .select("*")
        .eq("id", shipId)
        .single();

      if (!sErr && sRow) {
        shipRow = sRow;
        resolvedCostr = norm(sRow.costr) || "";
        resolvedCommessa = norm(sRow.commessa) || "";
      } else {
        // fallback: shipId peut être un COSTR (mode test)
        resolvedCostr = norm(shipId);
      }

      if (localAbort.cancelled) return;

      if (!resolvedCostr) {
        throw new Error("COSTR non disponibile. Verifica ships oppure il parametro route.");
      }

      setShip(shipRow);
      setCostr(resolvedCostr);
      setCommessa(resolvedCommessa);

      // 2) Charge commesse distinctes depuis INCA (si plus d’une)
      const { data: commRows, error: commErr } = await supabase
        .from("inca_cavi")
        .select("commessa")
        .eq("costr", resolvedCostr);

      if (commErr) throw commErr;
      if (localAbort.cancelled) return;

      const uniq = Array.from(
        new Set(
          (commRows || [])
            .map((r) => norm(r.commessa))
            .filter((x) => x !== "")
        )
      ).sort((a, b) => a.localeCompare(b));

      const opts = uniq.map((c) => ({ value: c, label: c }));
      setCommesseDisponibili(opts);

      // si ship.commessa vide ou invalide, prendre la première commessa INCA
      if (!resolvedCommessa) {
        if (opts.length === 1) setCommessa(opts[0].value);
      } else {
        const exists = opts.some((o) => o.value === resolvedCommessa);
        if (!exists && opts.length === 1) setCommessa(opts[0].value);
        if (!exists && opts.length > 1) {
          // garde ship.commessa affichée mais invite à sélectionner
          setCommessa(resolvedCommessa);
        }
      }
    } catch (e) {
      console.error("[INCA CAPO] loadBase error", e);
      setError(e?.message || String(e));
    } finally {
      if (!localAbort.cancelled) setLoading(false);
    }
  }, [shipId]);

  const loadCables = useCallback(
    async (resolvedCostr, resolvedCommessa) => {
      setLoading(true);
      setError("");

      abortRef.current.cancelled = false;
      const localAbort = abortRef.current;

      try {
        if (!resolvedCostr) throw new Error("COSTR mancante.");
        if (!resolvedCommessa) throw new Error("COMMESSA mancante. Seleziona una commessa.");

        const { data, error: dbErr } = await supabase
          .from("inca_cavi")
          .select(
            [
              "id",
              "costr",
              "commessa",
              "marca_cavo",
              "metri_teo",
              "metri_dis",
              "situazione",
              "updated_at",
            ].join(",")
          )
          .eq("costr", resolvedCostr)
          .eq("commessa", resolvedCommessa)
          .order("marca_cavo", { ascending: true });

        if (dbErr) throw dbErr;
        if (localAbort.cancelled) return;

        setCables(data || []);
        setSelectedCableId((data && data[0]?.id) || null);
      } catch (e) {
        console.error("[INCA CAPO] loadCables error", e);
        setError(e?.message || String(e));
      } finally {
        if (!localAbort.cancelled) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadBase();
    return () => {
      abortRef.current.cancelled = true;
    };
  }, [loadBase]);

  useEffect(() => {
    const c = norm(costr);
    const m = norm(commessa);

    if (!c) return;
    if (!m) return;

    loadCables(c, m);
    return () => {
      abortRef.current.cancelled = true;
    };
  }, [costr, commessa, loadCables]);

  const stats = useMemo(() => {
    const base = {
      total: 0,
      by: { P: 0, T: 0, R: 0, B: 0, E: 0, NP: 0 },
      nonPosati: 0,
      metriTeo: 0,
      metriDis: 0,
    };

    for (const c of cables) {
      base.total += 1;
      const k = situazioneKey(c.situazione);
      base.by[k] = (base.by[k] || 0) + 1;

      const metriTeo = Number(c.metri_teo ?? 0) || 0;
      const metriDis = Number(c.metri_dis ?? 0) || 0;
      base.metriTeo += metriTeo;
      base.metriDis += metriDis;

      if (k !== "P") base.nonPosati += 1;
    }

    return base;
  }, [cables]);

  const filteredCables = useMemo(() => {
    const q = norm(search).toLowerCase();
    const selectedSet = new Set(selectedSituazioni);

    return cables.filter((c) => {
      const k = situazioneKey(c.situazione);

      if (selectedSet.size > 0 && !selectedSet.has(k)) return false;

      if (onlyNonPosati && k === "P") return false;

      if (q) {
        const code = norm(c.marca_cavo).toLowerCase();
        if (!code.includes(q)) return false;
      }

      return true;
    });
  }, [cables, search, selectedSituazioni, onlyNonPosati]);

  const toggleSituazione = useCallback((k) => {
    setSelectedSituazioni((prev) => {
      const s = new Set(prev);
      if (s.has(k)) s.delete(k);
      else s.add(k);
      return Array.from(s);
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSelectedSituazioni([]);
    setOnlyNonPosati(false);
  }, []);

  const applyQuickFilter = useCallback((k) => {
    if (!k) {
      setSelectedSituazioni([]);
      return;
    }
    setSelectedSituazioni([k]);
  }, []);

  const updateSituazione = useCallback(
    async (cableId, next) => {
      const target = cables.find((x) => x.id === cableId);
      if (!target) return;

      const valueToStore = next === "NP" ? null : next;

      try {
        setError("");
        const { data, error: dbErr } = await supabase
          .from("inca_cavi")
          .update({ situazione: valueToStore })
          .eq("id", cableId)
          .select(
            [
              "id",
              "costr",
              "commessa",
              "marca_cavo",
              "metri_teo",
              "metri_dis",
              "situazione",
              "updated_at",
            ].join(",")
          )
          .single();

        if (dbErr) throw dbErr;

        setCables((prev) => prev.map((x) => (x.id === cableId ? data : x)));
        setSelectedCableId(cableId);
      } catch (e) {
        console.error("[INCA CAPO] updateSituazione error", e);
        setError(e?.message || String(e));
      }
    },
    [cables]
  );

  const commessaLabel = useMemo(() => {
    const m = norm(commessa);
    if (!m) return "—";
    return m;
  }, [commessa]);

  const titleLine = useMemo(() => {
    const c = norm(costr) || "—";
    const m = norm(commessa) || "—";
    return `COSTR ${c} · COMMESSA ${m}`;
  }, [costr, commessa]);

  if (loading && cables.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50">
        <div className="max-w-6xl mx-auto px-3 py-6">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-300">
              INCA · Cockpit
            </div>
            <div className="mt-2 text-[14px] text-slate-200">
              Caricamento cavi INCA…
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <div className="max-w-6xl mx-auto px-2 sm:px-3 py-4 sm:py-6">
        {/* Top cockpit card */}
        <div className="rounded-2xl border border-slate-700 bg-slate-950/55 shadow-[0_18px_45px_rgba(0,0,0,0.35)] overflow-hidden">
          {/* Header */}
          <div className="px-3 sm:px-4 py-3 border-b border-slate-800">
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-300">
                  INCA · Cockpit CAPO
                </div>
                <div className="mt-1 text-[14px] font-semibold truncate">
                  {titleLine}
                </div>
                <div className="mt-1 text-[11px] text-slate-300">
                  {ship ? (
                    <>
                      Nave: <span className="text-slate-100 font-semibold">{norm(ship.code) || "—"}</span>{" "}
                      · <span className="text-slate-200">{norm(ship.name) || "—"}</span>
                    </>
                  ) : (
                    <>Nave: —</>
                  )}
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950/70 hover:bg-slate-950 text-[12px]"
                >
                  Indietro
                </button>
              </div>
            </div>

            {/* Commessa selector */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
                <div className="text-[11px] text-slate-300">
                  Stato:{" "}
                  {loading ? (
                    <span className="text-slate-100 font-semibold">Caricamento…</span>
                  ) : (
                    <span className="text-emerald-300 font-semibold">OK</span>
                  )}
                  {" · "}
                  Cavi: <span className="text-slate-100 font-semibold">{stats.total}</span>
                  {" · "}
                  Filtrati:{" "}
                  <span className="text-slate-100 font-semibold">{filteredCables.length}</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  Tip: usa chips P/T/R/B/E/NP + ricerca per filtrare rapidamente.
                </div>
              </div>

              <div>
                <Select
                  value={commessa || ""}
                  onChange={(v) => setCommessa(v)}
                  options={commesseDisponibili.length ? commesseDisponibili : [{ value: commessaLabel, label: commessaLabel }]}
                  placeholder={commesseDisponibili.length > 1 ? "Seleziona COMMESSA" : undefined}
                />
              </div>
            </div>
          </div>

          {/* KPI strip */}
          <div className="px-3 sm:px-4 py-3 border-b border-slate-800">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <KpiTile
                label="Totale"
                value={stats.total}
                sub={`Copertura P: ${pct(stats.by.P, stats.total)}%`}
                onClick={() => applyQuickFilter("")}
                active={selectedSituazioni.length === 0}
              />
              <KpiTile
                label="P · POSA"
                value={stats.by.P}
                sub={`${pct(stats.by.P, stats.total)}%`}
                onClick={() => applyQuickFilter("P")}
                active={selectedSituazioni.length === 1 && selectedSituazioni[0] === "P"}
              />
              <KpiTile
                label="T · TERMINATO"
                value={stats.by.T}
                sub={`${pct(stats.by.T, stats.total)}%`}
                onClick={() => applyQuickFilter("T")}
                active={selectedSituazioni.length === 1 && selectedSituazioni[0] === "T"}
              />
              <KpiTile
                label="R · RIPRESA"
                value={stats.by.R}
                sub={`${pct(stats.by.R, stats.total)}%`}
                onClick={() => applyQuickFilter("R")}
                active={selectedSituazioni.length === 1 && selectedSituazioni[0] === "R"}
              />
              <KpiTile
                label="B · BLOCCATO"
                value={stats.by.B}
                sub={`${pct(stats.by.B, stats.total)}%`}
                onClick={() => applyQuickFilter("B")}
                active={selectedSituazioni.length === 1 && selectedSituazioni[0] === "B"}
              />
              <KpiTile
                label="E · ELIMINATO"
                value={stats.by.E}
                sub={`${pct(stats.by.E, stats.total)}%`}
                onClick={() => applyQuickFilter("E")}
                active={selectedSituazioni.length === 1 && selectedSituazioni[0] === "E"}
              />
              <KpiTile
                label="NP · NON PIAN."
                value={stats.by.NP}
                sub={`${pct(stats.by.NP, stats.total)}%`}
                onClick={() => applyQuickFilter("NP")}
                active={selectedSituazioni.length === 1 && selectedSituazioni[0] === "NP"}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="px-3 sm:px-4 py-3 border-b border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-2">
              <div className="flex flex-col gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca marca/codice cavo…"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 text-slate-50 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-emerald-500/60"
                />

                <div className="flex flex-wrap gap-2">
                  {SITUAZIONI.map((k) => (
                    <Chip
                      key={k}
                      active={selectedSituazioni.includes(k)}
                      onClick={() => toggleSituazione(k)}
                      title={`Filtra ${k}`}
                    >
                      {k}
                    </Chip>
                  ))}

                  <button
                    type="button"
                    onClick={() => setOnlyNonPosati((v) => !v)}
                    className={[
                      "px-3 py-1.5 rounded-full text-[12px] font-semibold border transition",
                      onlyNonPosati
                        ? "bg-sky-600 text-white border-sky-500"
                        : "bg-slate-900/40 text-slate-100 border-slate-700 hover:bg-slate-900/70",
                    ].join(" ")}
                    title="Nascondi POSA (P)"
                  >
                    Solo non P
                  </button>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold border border-slate-700 bg-slate-950/60 hover:bg-slate-950"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-300">
                  Metriche
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                    <div className="text-slate-300 text-[11px]">Metri teorici</div>
                    <div className="text-slate-50 font-semibold">{Math.round(stats.metriTeo)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                    <div className="text-slate-300 text-[11px]">Metri posati</div>
                    <div className="text-slate-50 font-semibold">{Math.round(stats.metriDis)}</div>
                  </div>
                </div>

                {error ? (
                  <div className="mt-2 text-[12px] text-rose-200 bg-rose-500/10 border border-rose-500/40 rounded-lg px-2 py-2">
                    {error}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="px-3 sm:px-4 py-3">
            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-2">
              {filteredCables.map((c) => {
                const k = situazioneKey(c.situazione);
                const active = c.id === selectedCableId;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCableId(c.id)}
                    className={[
                      "text-left rounded-2xl border p-3 transition",
                      active
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-800 bg-slate-950/40 hover:bg-slate-950/60",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-slate-50 truncate">
                          {norm(c.marca_cavo) || "—"}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-300">
                          Disegno: <span className="text-slate-100 font-semibold">{Number(c.metri_teo ?? 0) || 0}</span>{" "}
                          · Posati:{" "}
                          <span className="text-slate-100 font-semibold">{Number(c.metri_dis ?? 0) || 0}</span>
                        </div>
                      </div>

                      <div className="ml-auto flex flex-col items-end gap-2">
                        <span
                          className={[
                            "px-2 py-1 rounded-full text-[11px] font-semibold border",
                            k === "P"
                              ? "bg-emerald-600 text-white border-emerald-500"
                              : k === "T"
                              ? "bg-sky-600 text-white border-sky-500"
                              : k === "R"
                              ? "bg-amber-600 text-white border-amber-500"
                              : k === "B"
                              ? "bg-rose-600 text-white border-rose-500"
                              : k === "E"
                              ? "bg-slate-600 text-white border-slate-500"
                              : "bg-slate-900/40 text-slate-100 border-slate-700",
                          ].join(" ")}
                        >
                          {k}
                        </span>

                        <select
                          value={k}
                          onChange={(e) => updateSituazione(c.id, e.target.value)}
                          className="rounded-lg border border-slate-700 bg-slate-950/60 text-slate-50 px-2 py-1 text-[12px] outline-none"
                        >
                          {SITUAZIONI.map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredCables.length === 0 ? (
                <div className="text-center text-[13px] text-slate-300 py-10">
                  Nessun cavo trovato con i filtri attuali.
                </div>
              ) : null}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <div className="rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead className="bg-slate-950/70">
                    <tr className="text-slate-200">
                      <th className="px-3 py-2 text-left">Marca / codice</th>
                      <th className="px-3 py-2 text-right">Lung. disegno</th>
                      <th className="px-3 py-2 text-right">Metri posati</th>
                      <th className="px-3 py-2 text-center">Situazione</th>
                      <th className="px-3 py-2 text-center">Azioni rapide</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCables.map((c) => {
                      const k = situazioneKey(c.situazione);
                      const active = c.id === selectedCableId;

                      return (
                        <tr
                          key={c.id}
                          className={[
                            "border-t border-slate-800",
                            active ? "bg-emerald-500/10" : "bg-slate-950/30 hover:bg-slate-950/50",
                          ].join(" ")}
                          onClick={() => setSelectedCableId(c.id)}
                        >
                          <td className="px-3 py-2 font-semibold text-slate-50">
                            {norm(c.marca_cavo) || "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-100">
                            {Number(c.metri_teo ?? 0) || 0}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-100">
                            {Number(c.metri_dis ?? 0) || 0}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={[
                                "inline-flex px-2 py-1 rounded-full text-[11px] font-semibold border",
                                k === "P"
                                  ? "bg-emerald-600 text-white border-emerald-500"
                                  : k === "T"
                                  ? "bg-sky-600 text-white border-sky-500"
                                  : k === "R"
                                  ? "bg-amber-600 text-white border-amber-500"
                                  : k === "B"
                                  ? "bg-rose-600 text-white border-rose-500"
                                  : k === "E"
                                  ? "bg-slate-600 text-white border-slate-500"
                                  : "bg-slate-900/40 text-slate-100 border-slate-700",
                              ].join(" ")}
                            >
                              {k}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="inline-flex items-center gap-2">
                              <select
                                value={k}
                                onChange={(e) => updateSituazione(c.id, e.target.value)}
                                className="rounded-lg border border-slate-700 bg-slate-950/60 text-slate-50 px-2 py-1 text-[12px] outline-none"
                              >
                                {SITUAZIONI.map((x) => (
                                  <option key={x} value={x}>
                                    {x}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredCables.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-10 text-center text-slate-300">
                          Nessun cavo trovato con i filtri attuali.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {/* Selected detail (desktop only) */}
              {selectedCable ? (
                <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-300">
                    Dettaglio selezione
                  </div>
                  <div className="mt-1 flex items-start gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-slate-50 truncate">
                        {norm(selectedCable.marca_cavo) || "—"}
                      </div>
                      <div className="mt-1 text-[12px] text-slate-200">
                        Disegno:{" "}
                        <span className="font-semibold text-slate-50">
                          {Number(selectedCable.metri_teo ?? 0) || 0}
                        </span>{" "}
                        · Posati:{" "}
                        <span className="font-semibold text-slate-50">
                          {Number(selectedCable.metri_dis ?? 0) || 0}
                        </span>{" "}
                        · Situazione:{" "}
                        <span className="font-semibold text-emerald-300">
                          {situazioneKey(selectedCable.situazione)}
                        </span>
                      </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateSituazione(selectedCable.id, "P")}
                        className="px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-600/15 hover:bg-emerald-600/25 text-[12px] font-semibold"
                      >
                        Set P
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSituazione(selectedCable.id, "R")}
                        className="px-3 py-1.5 rounded-lg border border-amber-600 bg-amber-600/15 hover:bg-amber-600/25 text-[12px] font-semibold"
                      >
                        Set R
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSituazione(selectedCable.id, "B")}
                        className="px-3 py-1.5 rounded-lg border border-rose-600 bg-rose-600/15 hover:bg-rose-600/25 text-[12px] font-semibold"
                      >
                        Set B
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSituazione(selectedCable.id, "NP")}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950/60 hover:bg-slate-950 text-[12px] font-semibold"
                      >
                        Set NP
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer spacing for mobile */}
        <div className="h-6" />
      </div>
    </div>
  );
}
