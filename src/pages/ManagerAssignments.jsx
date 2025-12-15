import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";
import ImportOperatorsExcel from "../manager/ImportOperatorsExcel";

function safeText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

export default function ManagerAssignments({ isDark = true }) {
  const { profile } = useAuth();

  const [ships, setShips] = useState([]);
  const [selectedShipId, setSelectedShipId] = useState("");
  const [loadingShips, setLoadingShips] = useState(true);
  const [shipsError, setShipsError] = useState(null);

  const [operators, setOperators] = useState([]);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [operatorsError, setOperatorsError] = useState(null);

  const selectedShip = useMemo(
    () => ships.find((s) => s.id === selectedShipId) || null,
    [ships, selectedShipId]
  );

  const shipLabel = (s) => {
    const code = safeText(s?.code).trim();
    const name = safeText(s?.name).trim();
    if (code && name) return `${code} · ${name}`;
    return code || name || "Cantiere";
  };

  async function loadShips() {
    setLoadingShips(true);
    setShipsError(null);

    try {
      if (!profile?.id) {
        setShips([]);
        setSelectedShipId("");
        return;
      }

      const { data, error } = await supabase
        .from("ship_managers")
        .select("ship_id, ships:ships(id, code, name, is_active)")
        .eq("manager_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((r) => r.ships).filter(Boolean);

      setShips(mapped);

      // keep current selection if still present, else pick first active/first
      const stillExists = mapped.some((s) => s.id === selectedShipId);
      if (!stillExists) {
        const firstActive = mapped.find((s) => s.is_active) || mapped[0];
        setSelectedShipId(firstActive?.id || "");
      }
    } catch (err) {
      console.error("[ManagerAssignments] loadShips error:", err);
      setShipsError(err?.message || "Errore nel caricamento dei cantieri.");
    } finally {
      setLoadingShips(false);
    }
  }

  async function loadOperatorsByShip(shipId) {
    setLoadingOperators(true);
    setOperatorsError(null);
    setOperators([]);

    try {
      if (!shipId) {
        setOperators([]);
        return;
      }

      const { data, error } = await supabase
        .from("ship_operators")
        .select(
          `
          operator_id,
          active,
          operators:operators (
            id,
            name,
            roles
          )
        `
        )
        .eq("ship_id", shipId)
        .order("operators(name)", { ascending: true });

      if (error) throw error;

      const mapped =
        (data || [])
          .map((r) => {
            const op = r.operators;
            if (!op?.id) return null;
            return {
              id: op.id,
              name: op.name,
              roles: Array.isArray(op.roles) ? op.roles : [],
              active: !!r.active,
            };
          })
          .filter(Boolean) || [];

      setOperators(mapped);
    } catch (err) {
      console.error("[ManagerAssignments] loadOperators error:", err);
      setOperatorsError(err?.message || "Errore nel caricamento delle squadre.");
    } finally {
      setLoadingOperators(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await loadShips();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await loadOperatorsByShip(selectedShipId);
    })();
    return () => {
      alive = false;
    };
  }, [selectedShipId]);

  const showNoPerimeter = !loadingShips && ships.length === 0 && !shipsError;

  return (
    <div className="space-y-4">
      <header>
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
          Organizzazione operativa
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-100">
          Scopes · Capi · Squadre
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Gestione delle risorse operative per cantiere. Nessuna gestione account o ruoli.
        </p>
      </header>

      {/* PERIMETRO / SHIP SELECT */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Perimetro
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Seleziona un cantiere tra quelli assegnati.
            </div>
          </div>

          <div className="min-w-[260px]">
            <label className="block text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-1">
              Cantiere
            </label>
            <select
              value={selectedShipId}
              onChange={(e) => setSelectedShipId(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 text-sm text-slate-100"
              disabled={loadingShips || ships.length === 0}
            >
              {loadingShips ? (
                <option value="">Caricamento…</option>
              ) : ships.length === 0 ? (
                <option value="">Nessun cantiere assegnato</option>
              ) : (
                ships.map((s) => (
                  <option key={s.id} value={s.id}>
                    {shipLabel(s)}
                    {s.is_active ? "" : " (inattivo)"}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {shipsError ? (
          <div className="mt-3 rounded-xl border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {shipsError}
          </div>
        ) : null}

        {showNoPerimeter ? (
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-3">
            <div className="text-sm font-medium text-slate-100">
              Nessun cantiere assegnato
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Contatta l&apos;ADMIN per l&apos;abilitazione del perimetro.
            </div>
          </div>
        ) : null}
      </section>

      {/* IMPORT (CORE FORMAT) */}
      {selectedShipId ? (
        <ImportOperatorsExcel
          shipId={selectedShipId}
          onDone={() => loadOperatorsByShip(selectedShipId)}
        />
      ) : null}

      {/* OPERATORS LIST */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Squadre operative
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Operai assegnati al cantiere selezionato.
            </div>
          </div>
          <div className="text-[11px] text-slate-500 text-right">
            <div className="uppercase tracking-[0.18em] text-slate-600">Stato</div>
            <div>Elenco</div>
          </div>
        </div>

        {operatorsError ? (
          <div className="rounded-xl border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {operatorsError}
          </div>
        ) : null}

        {loadingOperators ? (
          <div className="text-xs text-slate-400">Caricamento…</div>
        ) : operators.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-3">
            <div className="text-sm font-medium text-slate-100">
              Nessun operaio assegnato
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Importa una lista (formato CORE) o aggiungi manualmente.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left py-1.5 pr-3">Nome</th>
                  <th className="text-left py-1.5 pr-3">Ruoli</th>
                  <th className="text-left py-1.5 pr-3">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {operators.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-900/40">
                    <td className="py-2 pr-3 text-slate-100">
                      {safeText(op.name) || "—"}
                    </td>
                    <td className="py-2 pr-3 text-slate-300">
                      {op.roles.length ? op.roles.join(", ") : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {op.active ? (
                        <span className="text-emerald-400">Attivo</span>
                      ) : (
                        <span className="text-slate-500">Disattivo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
