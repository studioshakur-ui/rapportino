// src/admin/AdminCatalogoPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function cn(...p) {
  return p.filter(Boolean).join(" ");
}

function safeText(v) {
  return (v == null ? "" : String(v)).trim();
}

function lowerTrim(v) {
  return safeText(v).toLowerCase();
}

function fmtNum(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return String(n);
}

function parseNumOrNull(v) {
  const s = safeText(v);
  if (!s) return null;
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const UNIT_OPTIONS = ["MT", "PZ", "COEFF", "NONE"];

export default function AdminCatalogoPage() {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(""); // `${activity_id}`
  const [err, setErr] = useState("");

  // context
  const [ships, setShips] = useState([]);
  const [shipId, setShipId] = useState("");
  const [commessa, setCommessa] = useState("");

  // data
  const [globalActs, setGlobalActs] = useState([]);
  const [scopeRows, setScopeRows] = useState([]); // rows from catalogo_ship_commessa_attivita
  const scopeByActivityId = useMemo(() => {
    const m = new Map();
    for (const r of scopeRows) m.set(String(r.activity_id), r);
    return m;
  }, [scopeRows]);

  // ui
  const [q, setQ] = useState("");
  const [onlyScoped, setOnlyScoped] = useState(false);
  const [onlyActive, setOnlyActive] = useState(true);

  // draft edits stored by activity_id
  const [draft, setDraft] = useState({}); // { [activityId]: {is_active, previsto_value, unit_override, note} }

  const effectiveShip = useMemo(() => {
    return ships.find((s) => String(s.id) === String(shipId)) || null;
  }, [ships, shipId]);

  const canScope = !!shipId && !!safeText(commessa);

  async function loadAll() {
    setLoading(true);
    setErr("");
    try {
      const [{ data: shipsData, error: shipsErr }, { data: actsData, error: actsErr }] =
        await Promise.all([
          supabase
            .from("ships")
            .select("id,code,name,costr,commessa,is_active")
            .order("code", { ascending: true }),
          supabase
            .from("catalogo_attivita")
            .select(
              "id,categoria,descrizione,activity_type,unit,previsto_value,is_active,synonyms,created_at,updated_at"
            )
            .order("categoria", { ascending: true })
            .order("descrizione", { ascending: true }),
        ]);

      if (shipsErr) throw shipsErr;
      if (actsErr) throw actsErr;

      setShips(Array.isArray(shipsData) ? shipsData : []);
      setGlobalActs(Array.isArray(actsData) ? actsData : []);
    } catch (e) {
      console.error("[AdminCatalogoPage] loadAll error:", e);
      setErr(e?.message || "Impossibile caricare i dati.");
    } finally {
      setLoading(false);
    }
  }

  async function loadScope(shipIdArg, commessaArg) {
    const sid = String(shipIdArg || "");
    const c = safeText(commessaArg);
    if (!sid || !c) {
      setScopeRows([]);
      setDraft({});
      return;
    }

    setErr("");
    try {
      const { data, error } = await supabase
        .from("catalogo_ship_commessa_attivita")
        .select("id,ship_id,commessa,activity_id,previsto_value,unit_override,is_active,note,created_at,updated_at")
        .eq("ship_id", sid)
        .eq("commessa", c);

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      setScopeRows(rows);

      // initialize drafts from DB scope rows (so UI is stable)
      const nextDraft = {};
      for (const r of rows) {
        const aid = String(r.activity_id);
        nextDraft[aid] = {
          is_active: !!r.is_active,
          previsto_value: r.previsto_value,
          unit_override: r.unit_override || "",
          note: r.note || "",
        };
      }
      setDraft(nextDraft);
    } catch (e) {
      console.error("[AdminCatalogoPage] loadScope error:", e);
      setErr(e?.message || "Impossibile caricare il catalogo per Ship/Commessa.");
      setScopeRows([]);
      setDraft({});
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadScope(shipId, commessa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipId, commessa]);

  const filtered = useMemo(() => {
    const qq = lowerTrim(q);
    const rows = Array.isArray(globalActs) ? globalActs : [];
    return rows.filter((a) => {
      if (!a?.id) return false;

      // global active filter (optional)
      if (onlyActive) {
        // onlyActive means: show only scope-active OR scope-missing but global active? We keep it strict:
        // - if scoped exists => use scoped is_active
        // - else => use global is_active
        const scoped = scopeByActivityId.get(String(a.id));
        const active = scoped ? !!scoped.is_active : !!a.is_active;
        if (!active) return false;
      }

      if (onlyScoped) {
        if (!scopeByActivityId.has(String(a.id))) return false;
      }

      if (!qq) return true;

      const cat = lowerTrim(a.categoria);
      const desc = lowerTrim(a.descrizione);
      const syn = Array.isArray(a.synonyms) ? a.synonyms : [];
      const hay = [cat, desc, ...syn.map((s) => lowerTrim(s))].join(" ");
      return hay.includes(qq);
    });
  }, [globalActs, q, onlyScoped, onlyActive, scopeByActivityId]);

  function getDraftFor(activityId) {
    const aid = String(activityId);
    if (draft[aid]) return draft[aid];

    const scoped = scopeByActivityId.get(aid);
    if (scoped) {
      return {
        is_active: !!scoped.is_active,
        previsto_value: scoped.previsto_value,
        unit_override: scoped.unit_override || "",
        note: scoped.note || "",
      };
    }

    return {
      is_active: true,
      previsto_value: null,
      unit_override: "",
      note: "",
    };
  }

  function setDraftFor(activityId, patch) {
    const aid = String(activityId);
    setDraft((prev) => {
      const curr = prev[aid] || getDraftFor(aid);
      return {
        ...prev,
        [aid]: { ...curr, ...patch },
      };
    });
  }

  async function upsertScope(activity, opts = {}) {
    const sid = String(shipId || "");
    const c = safeText(commessa);
    const aid = String(activity?.id || "");
    if (!sid || !c || !aid) return;

    const d = getDraftFor(aid);

    const payload = {
      ship_id: sid,
      commessa: c,
      activity_id: aid,

      is_active: d.is_active !== false,
      previsto_value: parseNumOrNull(d.previsto_value),
      unit_override: safeText(d.unit_override) ? safeText(d.unit_override) : null,
      note: safeText(d.note) ? safeText(d.note) : null,
    };

    setSavingKey(aid);
    setErr("");
    try {
      const { error } = await supabase
        .from("catalogo_ship_commessa_attivita")
        .upsert(payload, { onConflict: "ship_id,commessa,activity_id" });

      if (error) throw error;

      await loadScope(sid, c);

      if (opts?.toast) {
        // page is dark admin; keep UI minimal
      }
    } catch (e) {
      console.error("[AdminCatalogoPage] upsertScope error:", e);
      setErr(e?.message || "Errore salvataggio catalogo (Ship/Commessa).");
    } finally {
      setSavingKey("");
    }
  }

  async function deactivateScope(activity) {
    const sid = String(shipId || "");
    const c = safeText(commessa);
    const aid = String(activity?.id || "");
    if (!sid || !c || !aid) return;

    // We keep row, set is_active=false (no delete)
    setDraftFor(aid, { is_active: false });
    await upsertScope(activity);
  }

  function applyGlobalPrevisto(activity) {
    const aid = String(activity?.id || "");
    const pv = activity?.previsto_value ?? null;
    setDraftFor(aid, { previsto_value: pv });
  }

  function applyGlobalUnit(activity) {
    const aid = String(activity?.id || "");
    const u = safeText(activity?.unit);
    // unit_override empty = use default; but some admins want "explicit"
    // We'll set override = empty (use default) only if matches default; otherwise explicit.
    setDraftFor(aid, { unit_override: "" });
    if (u) {
      // keep override blank; effective = global
      // (If you want explicit override, set to u.)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="text-[12px] text-slate-400">Caricamento…</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Catalogo · Ship + Commessa
            </div>
            <div className="mt-1 text-[14px] font-semibold text-slate-100">
              Gestione catalogo operativo (scopato)
            </div>
            <div className="mt-1 text-[12px] text-slate-400">
              Regola canonica: il Capo vede solo le attività attive per <span className="text-slate-200">Ship</span> e{" "}
              <span className="text-slate-200">Commessa</span>.
            </div>
          </div>

          <button
            type="button"
            onClick={loadAll}
            className="rounded-full border border-slate-800 bg-slate-950/30 px-3 py-2 text-[12px] font-semibold text-slate-100 hover:bg-slate-900/35"
          >
            Ricarica
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_240px_240px] gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.20em] text-slate-500 mb-2">Ship</div>
            <select
              value={shipId}
              onChange={(e) => setShipId(e.target.value)}
              className={cn(
                "w-full rounded-2xl border",
                "border-slate-800 bg-slate-950/60",
                "px-3 py-3 text-[13px] text-slate-50",
                "outline-none focus:ring-2 focus:ring-sky-500/35"
              )}
            >
              <option value="">Seleziona Ship…</option>
              {ships.map((s) => {
                const label = `${safeText(s.code)} · ${safeText(s.name) || "Ship"}${safeText(s.costr) ? ` (COSTR ${safeText(s.costr)})` : ""}`;
                return (
                  <option key={String(s.id)} value={String(s.id)}>
                    {label}
                  </option>
                );
              })}
            </select>
            {effectiveShip ? (
              <div className="mt-2 text-[11px] text-slate-400">
                Selezionato:{" "}
                <span className="text-slate-200 font-semibold">
                  {safeText(effectiveShip.code)} · {safeText(effectiveShip.name)}
                </span>{" "}
                {safeText(effectiveShip.commessa) ? (
                  <span className="text-slate-500">· ships.commessa={safeText(effectiveShip.commessa)}</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.20em] text-slate-500 mb-2">Commessa</div>
            <input
              value={commessa}
              onChange={(e) => setCommessa(e.target.value)}
              placeholder="Es: SDC"
              className={cn(
                "w-full rounded-2xl border",
                "border-slate-800 bg-slate-950/60",
                "px-3 py-3 text-[13px] text-slate-50",
                "placeholder:text-slate-500",
                "outline-none focus:ring-2 focus:ring-sky-500/35"
              )}
            />
            <div className="mt-2 text-[11px] text-slate-400">
              Commessa è un contesto operativo del rapportino (es: SDC). Non dipende dal campo ships.commessa.
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.20em] text-slate-500 mb-2">Ricerca</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cerca descrizione / sinonimi…"
              className={cn(
                "w-full rounded-2xl border",
                "border-slate-800 bg-slate-950/60",
                "px-3 py-3 text-[13px] text-slate-50",
                "placeholder:text-slate-500",
                "outline-none focus:ring-2 focus:ring-sky-500/35"
              )}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-[12px] text-slate-300">
                <input
                  type="checkbox"
                  checked={onlyScoped}
                  onChange={(e) => setOnlyScoped(e.target.checked)}
                />
                Solo in scope
              </label>

              <label className="inline-flex items-center gap-2 text-[12px] text-slate-300">
                <input
                  type="checkbox"
                  checked={onlyActive}
                  onChange={(e) => setOnlyActive(e.target.checked)}
                />
                Solo attive
              </label>
            </div>
          </div>
        </div>

        {!canScope ? (
          <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
            Seleziona <b>Ship</b> e inserisci <b>Commessa</b> per modificare il catalogo.
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2 text-[12px] text-slate-200">
            Contesto attivo:{" "}
            <span className="font-semibold">
              {safeText(effectiveShip?.code || "")} · {safeText(effectiveShip?.name || "")}
            </span>{" "}
            · COMMESSA{" "}
            <span className="font-semibold">{safeText(commessa)}</span>
          </div>
        )}

        {err ? (
          <div className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">
            {err}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="text-[12px] text-slate-300">
            Attività globali: <span className="text-slate-100 font-semibold">{globalActs.length}</span> · In scope:{" "}
            <span className="text-slate-100 font-semibold">{scopeRows.length}</span> · Filtrate:{" "}
            <span className="text-slate-100 font-semibold">{filtered.length}</span>
          </div>

          <div className="text-[11px] text-slate-500">
            Modifiche scrivono su <span className="text-slate-300">catalogo_ship_commessa_attivita</span>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1100px] w-full text-[12px]">
            <thead className="bg-slate-950/40">
              <tr className="text-slate-400">
                <th className="px-4 py-3 text-left w-[160px]">CATEGORIA</th>
                <th className="px-4 py-3 text-left w-[420px]">DESCRIZIONE</th>
                <th className="px-4 py-3 text-left w-[130px]">TIPO</th>
                <th className="px-4 py-3 text-left w-[110px]">UNITÀ</th>
                <th className="px-4 py-3 text-right w-[130px]">PREV. GLOBALE</th>
                <th className="px-4 py-3 text-right w-[140px]">PREV. SCOPE</th>
                <th className="px-4 py-3 text-center w-[110px]">ATTIVA</th>
                <th className="px-4 py-3 text-left w-[260px]">NOTE</th>
                <th className="px-4 py-3 text-right w-[180px]">AZIONI</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-slate-500">
                    Nessuna attività trovata.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const aid = String(a.id);
                  const scoped = scopeByActivityId.get(aid);
                  const d = getDraftFor(aid);

                  const isInScope = !!scoped;
                  const effectiveActive = isInScope ? !!d.is_active : false;

                  const disableEdit = !canScope;

                  return (
                    <tr key={aid} className="border-t border-slate-800">
                      <td className="px-4 py-3 align-top">
                        <div className="text-slate-200 font-semibold">{safeText(a.categoria)}</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {isInScope ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                              In scope
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-slate-600" />
                              Fuori scope
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="text-slate-100 font-semibold">{safeText(a.descrizione)}</div>
                        {Array.isArray(a.synonyms) && a.synonyms.length > 0 ? (
                          <div className="mt-1 text-[11px] text-slate-500">
                            Syn: {a.synonyms.slice(0, 6).map((s) => safeText(s)).filter(Boolean).join(", ")}
                            {a.synonyms.length > 6 ? "…" : ""}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 align-top text-slate-200">
                        {safeText(a.activity_type) || "—"}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="text-slate-300 text-[11px]">Default: {safeText(a.unit) || "—"}</div>
                        <select
                          value={safeText(d.unit_override)}
                          onChange={(e) => setDraftFor(aid, { unit_override: e.target.value })}
                          disabled={disableEdit}
                          className={cn(
                            "mt-2 w-full rounded-xl border px-2 py-2",
                            "border-slate-800 bg-slate-950/60 text-slate-100",
                            disableEdit ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-900/35"
                          )}
                          title="Unità override (vuoto = usa default)"
                        >
                          <option value="">(usa default)</option>
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => applyGlobalUnit(a)}
                          disabled={disableEdit}
                          className={cn(
                            "mt-2 text-[11px] rounded-full border px-2.5 py-1",
                            "border-slate-800 bg-slate-950/30 text-slate-200",
                            disableEdit ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-900/35"
                          )}
                        >
                          Usa default
                        </button>
                      </td>

                      <td className="px-4 py-3 align-top text-right text-slate-200">
                        {a.previsto_value == null ? "—" : fmtNum(a.previsto_value)}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <input
                          value={d.previsto_value == null ? "" : String(d.previsto_value)}
                          onChange={(e) => setDraftFor(aid, { previsto_value: e.target.value })}
                          placeholder="es: 600"
                          disabled={disableEdit}
                          className={cn(
                            "w-full rounded-xl border px-2 py-2 text-right",
                            "border-slate-800 bg-slate-950/60 text-slate-100",
                            "placeholder:text-slate-600",
                            disableEdit ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-900/35"
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => applyGlobalPrevisto(a)}
                          disabled={disableEdit}
                          className={cn(
                            "mt-2 text-[11px] rounded-full border px-2.5 py-1",
                            "border-slate-800 bg-slate-950/30 text-slate-200",
                            disableEdit ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-900/35"
                          )}
                          title="Copia previsto globale nel previsto scopato"
                        >
                          Copia globale
                        </button>
                      </td>

                      <td className="px-4 py-3 align-top text-center">
                        <label className={cn("inline-flex items-center gap-2", disableEdit ? "opacity-60" : "")}>
                          <input
                            type="checkbox"
                            checked={effectiveActive}
                            disabled={disableEdit}
                            onChange={(e) => {
                              const next = !!e.target.checked;
                              setDraftFor(aid, { is_active: next });
                            }}
                          />
                          <span className="text-[11px] text-slate-300">{effectiveActive ? "ON" : "OFF"}</span>
                        </label>

                        {!isInScope ? (
                          <div className="mt-2 text-[11px] text-slate-600">(crea row al salvataggio)</div>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <input
                          value={safeText(d.note)}
                          onChange={(e) => setDraftFor(aid, { note: e.target.value })}
                          disabled={disableEdit}
                          className={cn(
                            "w-full rounded-xl border px-2 py-2",
                            "border-slate-800 bg-slate-950/60 text-slate-100",
                            "placeholder:text-slate-600",
                            disableEdit ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-900/35"
                          )}
                          placeholder="Note (opzionale)"
                        />
                      </td>

                      <td className="px-4 py-3 align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={disableEdit || savingKey === aid}
                            onClick={() => upsertScope(a)}
                            className={cn(
                              "rounded-full border px-3 py-2 text-[12px] font-semibold",
                              "border-sky-500/45 bg-sky-500/10 text-sky-100",
                              disableEdit || savingKey === aid
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:bg-sky-500/15"
                            )}
                          >
                            {savingKey === aid ? "Salvo…" : "Salva"}
                          </button>

                          <button
                            type="button"
                            disabled={disableEdit || savingKey === aid || !isInScope}
                            onClick={() => deactivateScope(a)}
                            className={cn(
                              "rounded-full border px-3 py-2 text-[12px] font-semibold",
                              "border-slate-800 bg-slate-950/30 text-slate-200",
                              disableEdit || savingKey === aid || !isInScope
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:bg-slate-900/35"
                            )}
                            title="Disattiva nel scope (non cancella)"
                          >
                            OFF
                          </button>
                        </div>

                        {isInScope ? (
                          <div className="mt-2 text-[10px] text-slate-600">
                            upd: {safeText(scoped?.updated_at || "").replace("T", " ").slice(0, 19)}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
