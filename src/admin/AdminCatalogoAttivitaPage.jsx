// src/admin/AdminCatalogoAttivitaPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function cn(...p) {
  return p.filter(Boolean).join(" ");
}

function Pill({ children, tone = "slate" }) {
  const cls =
    tone === "sky"
      ? "border-sky-500/40 bg-sky-500/10 text-sky-100"
      : tone === "emerald"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
      : tone === "amber"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
      : "border-slate-700 bg-slate-950/20 text-slate-200";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold", cls)}>
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.20em] text-slate-500">{label}</div>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function toUpperEnum(v) {
  return String(v || "").toUpperCase().trim();
}

const ACTIVITY_TYPES = ["QUANTITATIVE", "FORFAIT", "QUALITATIVE"];
const ACTIVITY_UNITS = ["MT", "PZ", "COEFF", "NONE"];

export default function AdminCatalogoAttivitaPage() {
  // Context (SHIP + COMMESSA) — obligatoire
  const [ships, setShips] = useState([]);
  const [shipId, setShipId] = useState("");
  const [commessa, setCommessa] = useState("");

  // Dictionary (global)
  const [dict, setDict] = useState([]);
  const [dictLoading, setDictLoading] = useState(false);
  const [dictErr, setDictErr] = useState("");

  const [qDict, setQDict] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState("");

  // Context catalog (ship+commessa)
  const [ctxItems, setCtxItems] = useState([]);
  const [ctxLoading, setCtxLoading] = useState(false);
  const [ctxErr, setCtxErr] = useState("");
  const [qCtx, setQCtx] = useState("");

  // Create / edit dictionary
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null); // dict row
  const [saving, setSaving] = useState(false);

  // Form (dictionary)
  const [fCategoria, setFCategoria] = useState("");
  const [fDescrizione, setFDescrizione] = useState("");
  const [fType, setFType] = useState("QUANTITATIVE");
  const [fUnit, setFUnit] = useState("NONE");
  const [fSynonyms, setFSynonyms] = useState("");

  // Form (context item)
  const [ctxPrevisto, setCtxPrevisto] = useState("");
  const [ctxUnitOverride, setCtxUnitOverride] = useState("");
  const [ctxIsActive, setCtxIsActive] = useState(true);

  const contextReady = Boolean(shipId && String(commessa || "").trim());

  // Load ships
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("ships")
          .select("id,ship_code,name")
          .order("ship_code", { ascending: true });
        if (error) throw error;
        if (!alive) return;
        setShips(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("[AdminCatalogo] load ships error:", e);
        if (!alive) return;
        setShips([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load dictionary
  const loadDict = async () => {
    setDictLoading(true);
    setDictErr("");
    try {
      const { data, error } = await supabase
        .from("catalogo_attivita")
        .select("id,categoria,descrizione,activity_type,unit,previsto_value,is_active,synonyms,created_at,updated_at")
        .order("categoria", { ascending: true })
        .order("descrizione", { ascending: true });

      if (error) throw error;
      setDict(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[AdminCatalogo] load dict error:", e);
      setDictErr(e?.message || "Impossibile caricare il dizionario attività.");
      setDict([]);
    } finally {
      setDictLoading(false);
    }
  };

  useEffect(() => {
    loadDict();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load context items
  const loadCtx = async () => {
    if (!contextReady) {
      setCtxItems([]);
      return;
    }
    setCtxLoading(true);
    setCtxErr("");
    try {
      const { data, error } = await supabase
        .from("catalogo_commessa_attivita_public_v1")
        .select(
          "catalogo_item_id,ship_id,ship_code,ship_name,commessa,activity_id,categoria,descrizione,activity_type,unit_default,unit_override,unit_effective,previsto_value,is_active,note,created_at,updated_at"
        )
        .eq("ship_id", shipId)
        .eq("commessa", String(commessa).trim())
        .order("categoria", { ascending: true })
        .order("descrizione", { ascending: true });

      if (error) throw error;
      setCtxItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[AdminCatalogo] load ctx error:", e);
      setCtxErr(e?.message || "Impossibile caricare il catalogo (ship + commessa).");
      setCtxItems([]);
    } finally {
      setCtxLoading(false);
    }
  };

  useEffect(() => {
    loadCtx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipId, commessa]);

  const dictFiltered = useMemo(() => {
    const qq = String(qDict || "").trim().toLowerCase();
    if (!qq) return dict;
    return dict.filter((it) => {
      const cat = String(it?.categoria || "").toLowerCase();
      const desc = String(it?.descrizione || "").toLowerCase();
      const syn = Array.isArray(it?.synonyms) ? it.synonyms : [];
      const hay = [cat, desc, ...syn.map((x) => String(x || "").toLowerCase())].join(" ");
      return hay.includes(qq);
    });
  }, [dict, qDict]);

  const ctxFiltered = useMemo(() => {
    const qq = String(qCtx || "").trim().toLowerCase();
    if (!qq) return ctxItems;
    return ctxItems.filter((it) => {
      const cat = String(it?.categoria || "").toLowerCase();
      const desc = String(it?.descrizione || "").toLowerCase();
      return (cat + " " + desc).includes(qq);
    });
  }, [ctxItems, qCtx]);

  const selectedDict = useMemo(() => {
    if (!selectedActivityId) return null;
    return dict.find((d) => String(d.id) === String(selectedActivityId)) || null;
  }, [dict, selectedActivityId]);

  const ctxByActivityId = useMemo(() => {
    const map = new Map();
    for (const it of ctxItems) {
      map.set(String(it.activity_id), it);
    }
    return map;
  }, [ctxItems]);

  const openCreate = () => {
    setEditing(null);
    setCreateOpen(true);
    setFCategoria("");
    setFDescrizione("");
    setFType("QUANTITATIVE");
    setFUnit("NONE");
    setFSynonyms("");
  };

  const openEdit = (row) => {
    setEditing(row);
    setCreateOpen(true);
    setFCategoria(String(row?.categoria || ""));
    setFDescrizione(String(row?.descrizione || ""));
    setFType(toUpperEnum(row?.activity_type || "QUANTITATIVE"));
    setFUnit(toUpperEnum(row?.unit || "NONE"));
    setFSynonyms(Array.isArray(row?.synonyms) ? row.synonyms.join(", ") : "");
  };

  const parseSynonyms = (raw) => {
    const s = String(raw || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return s.length ? s : null;
  };

  const saveDict = async () => {
    const categoria = String(fCategoria || "").trim();
    const descrizione = String(fDescrizione || "").trim();
    const activity_type = toUpperEnum(fType || "");
    const unit = toUpperEnum(fUnit || "");
    const synonyms = parseSynonyms(fSynonyms);

    if (!categoria || !descrizione) {
      setDictErr("Categoria e descrizione sono obbligatorie.");
      return;
    }
    if (!ACTIVITY_TYPES.includes(activity_type)) {
      setDictErr("Tipo attività non valido.");
      return;
    }
    if (!ACTIVITY_UNITS.includes(unit)) {
      setDictErr("Unità non valida.");
      return;
    }

    setSaving(true);
    setDictErr("");
    try {
      if (editing?.id) {
        const { error } = await supabase
          .from("catalogo_attivita")
          .update({
            categoria,
            descrizione,
            activity_type,
            unit,
            synonyms,
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("catalogo_attivita").insert({
          categoria,
          descrizione,
          activity_type,
          unit,
          synonyms,
          is_active: true,
        });
        if (error) throw error;
      }

      setCreateOpen(false);
      await loadDict();
    } catch (e) {
      console.error("[AdminCatalogo] save dict error:", e);
      setDictErr(e?.message || "Errore salvataggio dizionario.");
    } finally {
      setSaving(false);
    }
  };

  const toggleDictActive = async (row, next) => {
    setSaving(true);
    setDictErr("");
    try {
      const { error } = await supabase.from("catalogo_attivita").update({ is_active: !!next }).eq("id", row.id);
      if (error) throw error;
      await loadDict();
    } catch (e) {
      console.error("[AdminCatalogo] toggle dict error:", e);
      setDictErr(e?.message || "Errore aggiornamento stato attività.");
    } finally {
      setSaving(false);
    }
  };

  const upsertCtxItem = async () => {
    if (!contextReady) {
      setCtxErr("Seleziona Nave e Commessa prima.");
      return;
    }
    if (!selectedActivityId) {
      setCtxErr("Seleziona un’attività dal dizionario.");
      return;
    }

    const previsto_value =
      String(ctxPrevisto || "").trim() === "" ? null : Number(String(ctxPrevisto).replace(",", "."));

    if (previsto_value !== null && !Number.isFinite(previsto_value)) {
      setCtxErr("Previsto non valido.");
      return;
    }

    const unit_override_raw = String(ctxUnitOverride || "").trim();
    const unit_override = unit_override_raw ? toUpperEnum(unit_override_raw) : null;
    if (unit_override && !ACTIVITY_UNITS.includes(unit_override)) {
      setCtxErr("Unit override non valida.");
      return;
    }

    setSaving(true);
    setCtxErr("");
    try {
      // upsert by unique (ship_id, commessa, activity_id)
      const payload = {
        ship_id: shipId,
        commessa: String(commessa).trim(),
        activity_id: selectedActivityId,
        previsto_value,
        unit_override,
        is_active: !!ctxIsActive,
      };

      const existing = ctxByActivityId.get(String(selectedActivityId));
      if (existing?.catalogo_item_id) {
        const { error } = await supabase
          .from("catalogo_commessa_attivita")
          .update(payload)
          .eq("id", existing.catalogo_item_id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("catalogo_commessa_attivita").insert(payload);
        if (error) throw error;
      }

      await loadCtx();
    } catch (e) {
      console.error("[AdminCatalogo] upsert ctx error:", e);
      setCtxErr(e?.message || "Errore aggiornamento catalogo di commessa.");
    } finally {
      setSaving(false);
    }
  };

  const removeCtxItem = async (item) => {
    setSaving(true);
    setCtxErr("");
    try {
      // Suppression autorisée ADMIN; historiquement OK car rapportino_rows a ON DELETE SET NULL.
      const { error } = await supabase.from("catalogo_commessa_attivita").delete().eq("id", item.catalogo_item_id);
      if (error) throw error;
      await loadCtx();
    } catch (e) {
      console.error("[AdminCatalogo] remove ctx error:", e);
      setCtxErr(e?.message || "Errore rimozione attività dal catalogo di commessa.");
    } finally {
      setSaving(false);
    }
  };

  const ctxHeader = useMemo(() => {
    const ship = ships.find((s) => String(s.id) === String(shipId));
    if (!shipId && !commessa) return "Seleziona Nave + Commessa";
    if (!contextReady) return "Contesto incompleto";
    return `Catalogo · ${ship?.ship_code || "—"} · ${String(commessa).trim()}`;
  }, [ships, shipId, commessa, contextReady]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">ADMIN</div>
            <div className="mt-1 text-[16px] font-semibold text-slate-50">Catalogo attività (Ship + Commessa)</div>
            <div className="mt-1 text-[12px] text-slate-400">
              Règle canonique: le Capo consomme un catalogo contextuel. Le dizionario global sert de base.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="rounded-full border border-slate-800 bg-slate-950/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-100 hover:bg-slate-900/35"
            >
              + Nuova attività (dizionario)
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_220px_240px] gap-3">
          <Field label="Nave (Ship)">
            <select
              value={shipId}
              onChange={(e) => setShipId(e.target.value)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-3 text-[13px] text-slate-50 outline-none focus:ring-2 focus:ring-sky-500/35"
            >
              <option value="">Seleziona nave…</option>
              {ships.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.ship_code} {s.name ? `— ${s.name}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Commessa">
            <input
              value={commessa}
              onChange={(e) => setCommessa(e.target.value)}
              placeholder="Es: SDC / 12345"
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-3 text-[13px] text-slate-50 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-sky-500/35"
            />
          </Field>

          <Field label="Stato contesto">
            <div className="h-[46px] flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/30 px-3">
              {contextReady ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-[12px] font-semibold text-emerald-200">READY</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-[12px] font-semibold text-amber-200">Seleziona ship + commessa</span>
                </>
              )}
            </div>
          </Field>
        </div>

        {(dictErr || ctxErr) ? (
          <div className="mt-3 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
            {dictErr || ctxErr}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* LEFT: Dictionary */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Dizionario globale</div>
              <div className="mt-1 text-[13px] font-semibold text-slate-50">Attività base</div>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone="slate">{dict.length} items</Pill>
              <button
                type="button"
                onClick={loadDict}
                className="rounded-full border border-slate-800 bg-slate-950/20 px-3 py-2 text-[11px] font-semibold text-slate-100 hover:bg-slate-900/35"
              >
                Ricarica
              </button>
            </div>
          </div>

          <div className="mt-3">
            <input
              value={qDict}
              onChange={(e) => setQDict(e.target.value)}
              placeholder="Cerca categoria / descrizione / sinonimi…"
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-3 text-[13px] text-slate-50 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-sky-500/35"
            />
          </div>

          <div className="mt-3 max-h-[62vh] overflow-auto space-y-2 pr-1">
            {dictLoading ? (
              <div className="text-[12px] text-slate-400">Caricamento…</div>
            ) : dictFiltered.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-[12px] text-slate-400">
                Nessuna attività trovata.
              </div>
            ) : (
              dictFiltered.map((it) => {
                const active = String(selectedActivityId) === String(it.id);
                const isCtx = contextReady && ctxByActivityId.has(String(it.id));
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      setSelectedActivityId(it.id);
                      // prefill context editor from existing ctx
                      const existing = ctxByActivityId.get(String(it.id));
                      if (existing) {
                        setCtxPrevisto(existing.previsto_value == null ? "" : String(existing.previsto_value));
                        setCtxUnitOverride(existing.unit_override || "");
                        setCtxIsActive(!!existing.is_active);
                      } else {
                        setCtxPrevisto("");
                        setCtxUnitOverride("");
                        setCtxIsActive(true);
                      }
                    }}
                    className={cn(
                      "w-full text-left rounded-2xl border px-3 py-3 transition",
                      active
                        ? "border-sky-500/55 bg-sky-500/10"
                        : "border-slate-800 bg-slate-950/30 hover:bg-slate-900/35"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.20em] text-slate-400 truncate">
                          {it.categoria}
                        </div>
                        <div className="mt-1 text-[13px] font-semibold text-slate-50 truncate">
                          {it.descrizione}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Pill tone="sky">{toUpperEnum(it.activity_type)}</Pill>
                          <Pill tone="slate">UNITÀ: {toUpperEnum(it.unit)}</Pill>
                          {it.is_active ? <Pill tone="emerald">ATTIVA</Pill> : <Pill tone="amber">DISATTIVA</Pill>}
                          {isCtx ? <Pill tone="emerald">IN CATALOGO</Pill> : <Pill tone="slate">—</Pill>}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEdit(it);
                          }}
                          className="rounded-full border border-slate-800 bg-slate-950/20 px-3 py-1.5 text-[11px] font-semibold text-slate-100 hover:bg-slate-900/35"
                        >
                          Modifica
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleDictActive(it, !it.is_active);
                          }}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                            it.is_active
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
                              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                          )}
                        >
                          {it.is_active ? "Disattiva" : "Attiva"}
                        </button>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Context Catalog */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Catalogo operativo</div>
              <div className="mt-1 text-[13px] font-semibold text-slate-50">{ctxHeader}</div>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone="slate">{ctxItems.length} items</Pill>
              <button
                type="button"
                onClick={loadCtx}
                disabled={!contextReady}
                className={cn(
                  "rounded-full border px-3 py-2 text-[11px] font-semibold text-slate-100",
                  !contextReady
                    ? "border-slate-800 bg-slate-950/10 text-slate-600 cursor-not-allowed"
                    : "border-slate-800 bg-slate-950/20 hover:bg-slate-900/35"
                )}
              >
                Ricarica
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Filtro catalogo">
              <input
                value={qCtx}
                onChange={(e) => setQCtx(e.target.value)}
                placeholder="Cerca nel catalogo…"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-3 text-[13px] text-slate-50 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-sky-500/35"
              />
            </Field>

            <Field label="Attività selezionata">
              <div className="h-[46px] flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/30 px-3">
                {selectedDict ? (
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-300 truncate">{selectedDict.categoria}</div>
                    <div className="text-[12px] font-semibold text-slate-50 truncate">{selectedDict.descrizione}</div>
                  </div>
                ) : (
                  <div className="text-[12px] text-slate-500">Seleziona a sinistra…</div>
                )}
              </div>
            </Field>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/25 p-3">
            <div className="text-[11px] uppercase tracking-[0.20em] text-slate-500">Parametri locali (ship + commessa)</div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_160px] gap-3">
              <Field label="Previsto (override)">
                <input
                  value={ctxPrevisto}
                  onChange={(e) => setCtxPrevisto(e.target.value)}
                  placeholder="Es: 12,5"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-3 text-[13px] text-slate-50 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-sky-500/35"
                />
              </Field>

              <Field label="Unit override (opzionale)">
                <select
                  value={ctxUnitOverride}
                  onChange={(e) => setCtxUnitOverride(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-3 text-[13px] text-slate-50 outline-none focus:ring-2 focus:ring-sky-500/35"
                >
                  <option value="">(usa unit default)</option>
                  {ACTIVITY_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Attiva">
                <div className="h-[46px] flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/30 px-3">
                  <input
                    id="ctxIsActive"
                    type="checkbox"
                    checked={ctxIsActive}
                    onChange={(e) => setCtxIsActive(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="ctxIsActive" className="text-[12px] text-slate-200 font-semibold">
                    {ctxIsActive ? "SI" : "NO"}
                  </label>
                </div>
              </Field>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={upsertCtxItem}
                disabled={!contextReady || !selectedActivityId || saving}
                className={cn(
                  "rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]",
                  !contextReady || !selectedActivityId || saving
                    ? "border-slate-800 bg-slate-950/10 text-slate-600 cursor-not-allowed"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                )}
              >
                {ctxByActivityId.has(String(selectedActivityId)) ? "Aggiorna catalogo" : "Aggiungi al catalogo"}
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-[48vh] overflow-auto space-y-2 pr-1">
            {!contextReady ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-[12px] text-slate-400">
                Seleziona prima una Nave e una Commessa.
              </div>
            ) : ctxLoading ? (
              <div className="text-[12px] text-slate-400">Caricamento…</div>
            ) : ctxFiltered.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-[12px] text-slate-400">
                Nessuna attività nel catalogo per questo contesto.
              </div>
            ) : (
              ctxFiltered.map((it) => (
                <div
                  key={it.catalogo_item_id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/30 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-[0.20em] text-slate-400 truncate">
                        {it.categoria}
                      </div>
                      <div className="mt-1 text-[13px] font-semibold text-slate-50 truncate">
                        {it.descrizione}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Pill tone="sky">{toUpperEnum(it.activity_type)}</Pill>
                        <Pill tone="slate">UNITÀ: {toUpperEnum(it.unit_effective)}</Pill>
                        <Pill tone="slate">PREVISTO: {it.previsto_value == null ? "—" : String(it.previsto_value)}</Pill>
                        {it.is_active ? <Pill tone="emerald">ATTIVA</Pill> : <Pill tone="amber">DISATTIVA</Pill>}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedActivityId(it.activity_id);
                          setCtxPrevisto(it.previsto_value == null ? "" : String(it.previsto_value));
                          setCtxUnitOverride(it.unit_override || "");
                          setCtxIsActive(!!it.is_active);
                        }}
                        className="rounded-full border border-slate-800 bg-slate-950/20 px-3 py-1.5 text-[11px] font-semibold text-slate-100 hover:bg-slate-900/35"
                      >
                        Carica parametri
                      </button>

                      <button
                        type="button"
                        onClick={() => removeCtxItem(it)}
                        disabled={saving}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                          saving
                            ? "border-slate-800 bg-slate-950/10 text-slate-600 cursor-not-allowed"
                            : "border-rose-500/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                        )}
                      >
                        Rimuovi
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL create/edit dictionary */}
      {createOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center sm:justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setCreateOpen(false);
            }}
          />
          <div className="relative w-full sm:w-[min(880px,96vw)] rounded-t-3xl sm:rounded-3xl border border-slate-800 bg-[#050910] px-4 pt-4 pb-4 shadow-[0_-40px_120px_rgba(0,0,0,0.70)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Dizionario attività</div>
                <div className="mt-1 text-[14px] font-semibold text-slate-50">
                  {editing ? "Modifica attività" : "Nuova attività"}
                </div>
                <div className="mt-1 text-[12px] text-slate-400">
                  Nota: il catalogo operativo si definisce sempre per ship + commessa.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/35"
              >
                Chiudi
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Categoria">
                <input
                  value={fCategoria}
                  onChange={(e) => setFCategoria(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-3 text-[13px] text-slate-50 outline-none focus:ring-2 focus:ring-sky-500/35"
                />
              </Field>

              <Field label="Tipo attività">
                <select
                  value={fType}
                  onChange={(e) => setFType(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-3 text-[13px] text-slate-50 outline-none focus:ring-2 focus:ring-sky-500/35"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="sm:col-span-2">
                <Field label="Descrizione">
                  <input
                    value={fDescrizione}
                    onChange={(e) => setFDescrizione(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-3 text-[13px] text-slate-50 outline-none focus:ring-2 focus:ring-sky-500/35"
                  />
                </Field>
              </div>

              <Field label="Unità default">
                <select
                  value={fUnit}
                  onChange={(e) => setFUnit(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-3 text-[13px] text-slate-50 outline-none focus:ring-2 focus:ring-sky-500/35"
                >
                  {ACTIVITY_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Sinonimi (CSV)">
                <input
                  value={fSynonyms}
                  onChange={(e) => setFSynonyms(e.target.value)}
                  placeholder="Es: posa cavi, installazione, ..."
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-3 text-[13px] text-slate-50 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-sky-500/35"
                />
              </Field>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={saveDict}
                disabled={saving}
                className={cn(
                  "rounded-full border px-4 py-2 text-[12px] font-semibold",
                  saving
                    ? "border-slate-800 bg-slate-950/10 text-slate-600 cursor-not-allowed"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                )}
              >
                {saving ? "Salvataggio…" : "Salva"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
