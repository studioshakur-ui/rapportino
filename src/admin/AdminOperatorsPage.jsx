// src/admin/AdminOperatorsPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import ImportOperatorsExcel from "./ImportOperatorsExcel";

function cn(...p) {
  return p.filter(Boolean).join(" ");
}

function normalizeError(e) {
  if (!e) return "Errore sconosciuto";
  if (typeof e === "string") return e;
  if (e.message) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function safeLower(s) {
  return (s ?? "").toString().toLowerCase();
}

function parseRoles(raw) {
  const s = (raw ?? "").toString().trim();
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function shipLabel(ship) {
  // ✅ ROBUST: on n’assume plus "ship_code" (cause du bug actuel)
  // On compose un label à partir des colonnes disponibles.
  const candidates = [
    ship?.ship_code,
    ship?.code,
    ship?.name,
    ship?.project_code,
    ship?.costr && ship?.commessa ? `${ship.costr} · ${ship.commessa}` : null,
    ship?.costr,
    ship?.commessa,
  ].filter(Boolean);

  if (candidates.length > 0) return candidates[0];
  return ship?.id ? `Ship ${String(ship.id).slice(0, 8)}…` : "Cantiere";
}

export default function AdminOperatorsPage() {
  const [ships, setShips] = useState([]);
  const [shipId, setShipId] = useState("");
  const [loadingShips, setLoadingShips] = useState(false);

  const [operators, setOperators] = useState([]);
  const [loadingOps, setLoadingOps] = useState(false);

  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  // manual create
  const [newName, setNewName] = useState("");
  const [newRoles, setNewRoles] = useState("");
  const [busyCreate, setBusyCreate] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);

  const filtered = useMemo(() => {
    const q = safeLower(search).trim();
    if (!q) return operators;

    return operators.filter((r) => {
      // ✅ FIX: la shape est { operator: { name, roles } } (pas operator.operator.name)
      const name = safeLower(r?.operator?.name);
      const rolesStr = Array.isArray(r?.operator?.roles) ? r.operator.roles.join(" ") : "";
      return name.includes(q) || safeLower(rolesStr).includes(q);
    });
  }, [operators, search]);

  const reloadShips = useCallback(async () => {
    setLoadingShips(true);
    setError(null);
    try {
      // ✅ FIX CRITIQUE: on ne sélectionne plus ships.ship_code (qui n’existe pas chez toi)
      // On prend tout, puis on construit un label côté UI.
      const { data, error: e } = await supabase.from("ships").select("*");
      if (e) throw e;

      const rows = Array.isArray(data) ? data : [];
      // tri best-effort
      rows.sort((a, b) => String(shipLabel(a)).localeCompare(String(shipLabel(b))));
      setShips(rows);

      // si shipId n’est plus valide, reset
      if (shipId && !rows.some((s) => s.id === shipId)) setShipId("");
    } catch (e) {
      setError(normalizeError(e));
      setShips([]);
    } finally {
      setLoadingShips(false);
    }
  }, [shipId]);

  const reloadOperators = useCallback(
    async (forceShipId) => {
      const sid = forceShipId ?? shipId;
      if (!sid) {
        setOperators([]);
        return;
      }

      setLoadingOps(true);
      setError(null);

      try {
        // ship_operators → operators (FK)
        const { data, error: e } = await supabase
          .from("ship_operators")
          .select(
            `
            ship_id,
            operator_id,
            active,
            operators:operator_id (
              id,
              name,
              roles
            )
          `
          )
          .eq("ship_id", sid)
          .order("operator_id", { ascending: true });

        if (e) throw e;

        const rows = Array.isArray(data) ? data : [];
        const normalized = rows.map((r) => ({
          ship_id: r.ship_id,
          operator_id: r.operator_id,
          active: r.active,
          operator: r.operators
            ? { id: r.operators.id, name: r.operators.name, roles: r.operators.roles }
            : { id: r.operator_id, name: "—", roles: [] },
        }));

        // Tri par name (UI)
        normalized.sort((a, b) => String(a?.operator?.name || "").localeCompare(String(b?.operator?.name || "")));

        setOperators(normalized);
      } catch (e) {
        setError(normalizeError(e));
        setOperators([]);
      } finally {
        setLoadingOps(false);
      }
    },
    [shipId]
  );

  useEffect(() => {
    reloadShips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // UX: reset msg quand on change de ship
    setCreateMsg(null);
    setSearch("");

    if (shipId) reloadOperators(shipId);
    else setOperators([]);
  }, [shipId, reloadOperators]);

  const selectedShip = useMemo(() => ships.find((s) => s.id === shipId) || null, [ships, shipId]);

  const canCreate = useMemo(() => {
    return !!shipId && !!newName.trim() && !busyCreate;
  }, [shipId, newName, busyCreate]);

  const handleCreate = async () => {
    if (!canCreate) return;

    setBusyCreate(true);
    setError(null);
    setCreateMsg(null);

    try {
      const name = newName.trim();
      const roles = parseRoles(newRoles);

      // 1) upsert operator by name
      const { data: up, error: e1 } = await supabase
        .from("operators")
        .upsert([{ name, roles }], { onConflict: "name" })
        .select("id,name")
        .single();

      if (e1) throw e1;
      if (!up?.id) throw new Error("Creazione fallita: operatore non creato.");

      // 2) link to ship
      const { error: e2 } = await supabase
        .from("ship_operators")
        .upsert([{ ship_id: shipId, operator_id: up.id, active: true }], {
          onConflict: "ship_id,operator_id",
        });

      if (e2) throw e2;

      setCreateMsg(`Operatore creato/aggiornato e assegnato: ${up.name}`);
      setNewName("");
      setNewRoles("");

      await reloadOperators(shipId);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setBusyCreate(false);
    }
  };

  const setActive = async (operatorId, active) => {
    if (!shipId || !operatorId) return;
    setError(null);
    try {
      const { error: e } = await supabase
        .from("ship_operators")
        .update({ active })
        .eq("ship_id", shipId)
        .eq("operator_id", operatorId);

      if (e) throw e;
      await reloadOperators(shipId);
    } catch (e) {
      setError(normalizeError(e));
    }
  };

  const unlink = async (operatorId) => {
    if (!shipId || !operatorId) return;
    setError(null);
    try {
      const { error: e } = await supabase.from("ship_operators").delete().eq("ship_id", shipId).eq("operator_id", operatorId);

      if (e) throw e;
      await reloadOperators(shipId);
    } catch (e) {
      setError(normalizeError(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Admin · Operatori</div>
            <div className="text-lg font-semibold text-slate-100">Gestione lista operai</div>
            <div className="text-xs text-slate-400 mt-1">
              Import Excel e creazione manuale. La verità resta su <span className="text-slate-200">operators</span> +{" "}
              <span className="text-slate-200">ship_operators</span>.
            </div>
          </div>

          <div className="text-xs text-slate-500 text-right">
            <div className="uppercase tracking-[0.18em] text-slate-600">Seleziona un cantiere</div>
            <div className="mt-1">{selectedShip ? shipLabel(selectedShip) : "—"}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1">Seleziona cantiere</div>
            <select
              value={shipId}
              onChange={(e) => setShipId(e.target.value)}
              className={cn("w-full h-10 rounded-xl border bg-slate-950/20 px-3 text-sm", "border-slate-800 text-slate-100")}
              disabled={loadingShips}
            >
              <option value="">{loadingShips ? "Caricamento…" : "— Seleziona —"}</option>
              {ships.map((s) => (
                <option key={s.id} value={s.id}>
                  {shipLabel(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1">Azioni</div>
            <button
              type="button"
              onClick={() => reloadOperators(shipId)}
              disabled={!shipId || loadingOps}
              className={cn(
                "w-full h-10 rounded-xl border text-sm font-medium transition",
                "border-slate-700 text-slate-100 hover:bg-slate-900/35",
                (!shipId || loadingOps) && "opacity-50 cursor-not-allowed"
              )}
            >
              {loadingOps ? "Ricarica…" : "Ricarica lista"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>
        ) : null}
      </div>

      {/* CREAZIONE MANUALE */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Creazione manuale</div>
            <div className="text-sm font-semibold text-slate-100">Crea operatore</div>
            <div className="text-xs text-slate-400 mt-1">
              Crea (o riusa se già esiste) un operatore globale e lo collega al cantiere selezionato.
            </div>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-600">Scope</div>
          <div className="text-xs text-slate-400">Admin only</div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1">Nome (obbligatorio)</div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Es. Rossi Mario"
              className="w-full h-10 rounded-xl border border-slate-800 bg-slate-950/20 px-3 text-sm text-slate-100 placeholder:text-slate-600"
              disabled={!shipId}
            />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1">Ruoli (opzionale)</div>
            <input
              value={newRoles}
              onChange={(e) => setNewRoles(e.target.value)}
              placeholder="Es. Elettricista, Aiuto"
              className="w-full h-10 rounded-xl border border-slate-800 bg-slate-950/20 px-3 text-sm text-slate-100 placeholder:text-slate-600"
              disabled={!shipId}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate}
            className={cn(
              "h-10 px-4 rounded-xl border text-sm font-medium transition",
              "border-slate-700 text-slate-100 hover:bg-slate-900/35",
              !canCreate && "opacity-50 cursor-not-allowed"
            )}
          >
            {busyCreate ? "Creazione…" : "Crea e assegna"}
          </button>
        </div>

        {createMsg ? (
          <div className="mt-3 rounded-xl border border-emerald-700/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            {createMsg}
          </div>
        ) : null}
      </div>

      {/* IMPORT EXCEL */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
        <ImportOperatorsExcel shipId={shipId || null} onDone={() => reloadOperators(shipId)} />
      </div>

      {/* ELENCO */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Elenco cantiere</div>
            <div className="text-sm font-semibold text-slate-100">Operatori assegnati</div>
            <div className="text-xs text-slate-400 mt-1">Attiva/disattiva per cantiere (senza cancellare l’operatore globale).</div>
          </div>
          <div className="text-xs text-slate-500 text-right">
            <div>Totale: {filtered.length}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca nome o ruolo…"
            className="w-full h-10 rounded-xl border border-slate-800 bg-slate-950/20 px-3 text-sm text-slate-100 placeholder:text-slate-600"
            disabled={!shipId}
          />
        </div>

        <div className="mt-3 rounded-2xl border border-slate-800 overflow-hidden">
          {!shipId ? (
            <div className="px-3 py-10 text-center text-sm text-slate-500">Seleziona un cantiere per visualizzare la lista.</div>
          ) : loadingOps ? (
            <div className="px-3 py-10 text-center text-sm text-slate-500">Caricamento…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-slate-500">Nessun operatore assegnato (o filtro vuoto).</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filtered.map((row) => {
                const op = row.operator;
                const roles = Array.isArray(op?.roles) ? op.roles.filter(Boolean) : [];
                return (
                  <div key={row.operator_id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100 truncate">{op?.name || "—"}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{roles.length ? roles.join(" · ") : "—"}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActive(row.operator_id, !row.active)}
                        className={cn(
                          "h-9 px-3 rounded-xl border text-xs font-semibold transition",
                          row.active
                            ? "border-emerald-700/50 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                            : "border-slate-700 bg-slate-950/20 text-slate-200 hover:bg-slate-900/35"
                        )}
                        title={row.active ? "Disattiva" : "Attiva"}
                      >
                        {row.active ? "Active" : "Inactive"}
                      </button>

                      <button
                        type="button"
                        onClick={() => unlink(row.operator_id)}
                        className={cn(
                          "h-9 px-3 rounded-xl border text-xs font-semibold transition",
                          "border-rose-500/40 bg-rose-950/20 text-rose-200 hover:bg-rose-900/25"
                        )}
                        title="Rimuovi dal cantiere"
                      >
                        Unlink
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
