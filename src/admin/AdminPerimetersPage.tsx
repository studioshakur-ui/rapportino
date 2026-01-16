// src/admin/AdminPerimetersPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ImportOperatorsExcel from "./ImportOperatorsExcel";
import { getInitialLang, t } from "../i18n/coreI18n";

function safeText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type ShipRow = {
  id: string;
  code: string | null;
  name: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type ManagerRow = {
  manager_id: string;
  email: string | null;
  display_name: string | null;
  full_name: string | null;
  app_role: string | null;
};

type OperatorRow = {
  id: string;
  display: string; // cognome nome
  cognome: string | null;
  nome: string | null;
  birth_date: string | null;
  roles: string[];
  active: boolean;
};

type OperatorSearchRow = {
  id: string;
  cognome: string | null;
  nome: string | null;
  birth_date: string | null;
  roles: unknown;
};

type InlineMsg = { ok: boolean; text: string };

function operatorDisplay(cognome: unknown, nome: unknown): string {
  const c = safeText(cognome).trim();
  const n = safeText(nome).trim();
  const full = `${c} ${n}`.trim();
  return full || "—";
}

export default function AdminPerimetersPage({ isDark = true }: { isDark?: boolean }): JSX.Element {
  const lang = getInitialLang();

  // Ships
  const [ships, setShips] = useState<ShipRow[]>([]);
  const [selectedShipId, setSelectedShipId] = useState<string>("");
  const [loadingShips, setLoadingShips] = useState<boolean>(true);
  const [shipsError, setShipsError] = useState<string | null>(null);

  const selectedShip = useMemo<ShipRow | null>(() => {
    return ships.find((s) => s.id === selectedShipId) || null;
  }, [ships, selectedShipId]);

  const shipLabel = (s: ShipRow | null): string => {
    const code = safeText(s?.code).trim();
    const name = safeText(s?.name).trim();
    if (code && name) return `${code} · ${name}`;
    return code || name || "Cantiere";
  };

  // Managers on ship
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [loadingManagers, setLoadingManagers] = useState<boolean>(false);
  const [managersError, setManagersError] = useState<string | null>(null);

  const [addManagerEmail, setAddManagerEmail] = useState<string>("");
  const [addingManager, setAddingManager] = useState<boolean>(false);
  const [managerMsg, setManagerMsg] = useState<InlineMsg | null>(null);

  // Operators on ship
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [loadingOperators, setLoadingOperators] = useState<boolean>(false);
  const [operatorsError, setOperatorsError] = useState<string | null>(null);

  // Operator search + link (NEW)
  const [opQuery, setOpQuery] = useState<string>("");
  const [opSearching, setOpSearching] = useState<boolean>(false);
  const [opResults, setOpResults] = useState<OperatorSearchRow[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [linkingOperator, setLinkingOperator] = useState<boolean>(false);
  const [opMsg, setOpMsg] = useState<InlineMsg | null>(null);

  // ----- Loaders -----

  async function loadShips(): Promise<void> {
    setLoadingShips(true);
    setShipsError(null);

    try {
      const { data, error } = await supabase
        .from("ships")
        .select("id, code, name, is_active, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (Array.isArray(data) ? data : []) as ShipRow[];

      const sorted = [...list].sort((a, b) => {
        const aa = a?.is_active ? 0 : 1;
        const bb = b?.is_active ? 0 : 1;
        return aa - bb;
      });

      setShips(sorted);

      const stillExists = sorted.some((s) => s.id === selectedShipId);
      if (!stillExists) {
        const firstActive = sorted.find((s) => s.is_active) || sorted[0];
        setSelectedShipId(firstActive?.id || "");
      }
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("[AdminPerimetersPage] loadShips error:", err);
      const msg =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: unknown }).message || "")
          : "";
      setShipsError(msg || "Errore nel caricamento dei cantieri.");
    } finally {
      setLoadingShips(false);
    }
  }

  async function loadManagersByShip(shipId: string): Promise<void> {
    setLoadingManagers(true);
    setManagersError(null);
    setManagers([]);

    try {
      if (!shipId) {
        setManagers([]);
        return;
      }

      const { data, error } = await supabase
        .from("ship_managers")
        .select(
          `
          manager_id,
          profiles:profiles (
            id,
            email,
            display_name,
            full_name,
            app_role
          )
        `
        )
        .eq("ship_id", shipId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (Array.isArray(data) ? data : []) as Array<{
        profiles?: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          full_name?: string | null;
          app_role?: string | null;
        } | null;
      }>;

      const mapped = rows
        .map((r) => {
          const p = r.profiles;
          if (!p?.id) return null;
          return {
            manager_id: p.id,
            email: p.email ?? null,
            display_name: p.display_name ?? null,
            full_name: p.full_name ?? null,
            app_role: p.app_role ?? null,
          } satisfies ManagerRow;
        })
        .filter(Boolean) as ManagerRow[];

      setManagers(mapped);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("[AdminPerimetersPage] loadManagers error:", err);
      const msg =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: unknown }).message || "")
          : "";
      setManagersError(msg || "Errore nel caricamento dei manager.");
    } finally {
      setLoadingManagers(false);
    }
  }

  async function loadOperatorsByShip(shipId: string): Promise<void> {
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
            cognome,
            nome,
            birth_date,
            roles
          )
        `
        )
        .eq("ship_id", shipId);

      if (error) throw error;

      const rows = (Array.isArray(data) ? data : []) as Array<{
        active?: boolean | null;
        operators?: {
          id?: string;
          cognome?: string | null;
          nome?: string | null;
          birth_date?: string | null;
          roles?: unknown;
        } | null;
      }>;

      const mapped = rows
        .map((r) => {
          const op = r.operators;
          if (!op?.id) return null;

          const rolesArr = Array.isArray(op.roles) ? (op.roles as string[]) : [];

          return {
            id: op.id,
            cognome: op.cognome ?? null,
            nome: op.nome ?? null,
            birth_date: op.birth_date ?? null,
            display: operatorDisplay(op.cognome, op.nome),
            roles: rolesArr,
            active: Boolean(r.active),
          } satisfies OperatorRow;
        })
        .filter(Boolean) as OperatorRow[];

      mapped.sort((a, b) => a.display.localeCompare(b.display));
      setOperators(mapped);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("[AdminPerimetersPage] loadOperators error:", err);
      const msg =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: unknown }).message || "")
          : "";
      setOperatorsError(msg || "Errore nel caricamento delle squadre.");
    } finally {
      setLoadingOperators(false);
    }
  }

  async function searchOperators(q: string): Promise<void> {
    const shipId = selectedShipId;
    const query = safeText(q).trim();

    setOpMsg(null);
    setSelectedOperatorId("");

    if (!shipId || query.length < 2) {
      setOpResults([]);
      return;
    }

    setOpSearching(true);
    try {
      // Search by cognome OR nome (ilike). Limit to 20.
      const { data, error } = await supabase
        .from("operators")
        .select("id, cognome, nome, birth_date, roles")
        .or(`cognome.ilike.%${query}%,nome.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      const rows = (Array.isArray(data) ? data : []) as OperatorSearchRow[];
      setOpResults(rows);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("[AdminPerimetersPage] searchOperators error:", err);
      const msg =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: unknown }).message || "")
          : "";
      setOpMsg({ ok: false, text: msg || "Errore ricerca operatore." });
      setOpResults([]);
    } finally {
      setOpSearching(false);
    }
  }

  // ----- Actions -----

  async function addManager(): Promise<void> {
    const shipId = selectedShipId;
    const email = safeText(addManagerEmail).trim().toLowerCase();
    if (!shipId || !email || addingManager) return;

    setAddingManager(true);
    setManagerMsg(null);

    try {
      const { data: pRows, error: pErr } = await supabase
        .from("profiles")
        .select("id,email,app_role,display_name,full_name")
        .eq("email", email)
        .limit(1);

      if (pErr) throw pErr;

      const p = (Array.isArray(pRows) ? pRows[0] : null) as
        | { id?: string; email?: string | null; app_role?: string | null }
        | null;

      if (!p?.id) throw new Error("Utente non trovato (email).");

      if (String(p.app_role || "").toUpperCase() !== "MANAGER") {
        throw new Error(`Ruolo non valido: ${p.app_role}. Serve app_role=MANAGER.`);
      }

      const { error: insErr } = await supabase
        .from("ship_managers")
        .upsert([{ ship_id: shipId, manager_id: p.id }], { onConflict: "ship_id,manager_id" });

      if (insErr) throw insErr;

      setManagerMsg({ ok: true, text: `Manager assegnato: ${p.email || email}` });
      setAddManagerEmail("");
      await loadManagersByShip(shipId);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("[AdminPerimetersPage] addManager error:", err);
      const msg =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: unknown }).message || "")
          : "";
      setManagerMsg({ ok: false, text: msg || "Errore durante l'assegnazione." });
    } finally {
      setAddingManager(false);
    }
  }

  async function removeManager(managerId: string): Promise<void> {
    const shipId = selectedShipId;
    if (!shipId || !managerId) return;

    setManagerMsg(null);

    try {
      const { error } = await supabase
        .from("ship_managers")
        .delete()
        .eq("ship_id", shipId)
        .eq("manager_id", managerId);

      if (error) throw error;

      setManagerMsg({ ok: true, text: "Manager rimosso." });
      await loadManagersByShip(shipId);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("[AdminPerimetersPage] removeManager error:", err);
      const msg =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: unknown }).message || "")
          : "";
      setManagerMsg({ ok: false, text: msg || "Errore durante la rimozione." });
    }
  }

  async function linkSelectedOperator(): Promise<void> {
    const shipId = selectedShipId;
    const operatorId = safeText(selectedOperatorId).trim();
    if (!shipId || !operatorId || linkingOperator) return;

    setLinkingOperator(true);
    setOpMsg(null);

    try {
      const { error } = await supabase
        .from("ship_operators")
        .upsert([{ ship_id: shipId, operator_id: operatorId, active: true }], {
          onConflict: "ship_id,operator_id",
        });

      if (error) throw error;

      setOpMsg({ ok: true, text: "Operatore collegato al cantiere." });
      setSelectedOperatorId("");
      setOpResults([]);
      setOpQuery("");
      await loadOperatorsByShip(shipId);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("[AdminPerimetersPage] linkSelectedOperator error:", err);
      const msg =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: unknown }).message || "")
          : "";
      setOpMsg({ ok: false, text: msg || "Errore collegamento operatore." });
    } finally {
      setLinkingOperator(false);
    }
  }

  async function toggleOperatorActive(operatorId: string, nextActive: boolean): Promise<void> {
    const shipId = selectedShipId;
    if (!shipId || !operatorId) return;

    try {
      const { error } = await supabase
        .from("ship_operators")
        .update({ active: Boolean(nextActive) })
        .eq("ship_id", shipId)
        .eq("operator_id", operatorId);

      if (error) throw error;
      await loadOperatorsByShip(shipId);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("[AdminPerimetersPage] toggleOperatorActive error:", err);
      const msg =
        typeof err === "object" && err && "message" in err
          ? String((err as { message?: unknown }).message || "")
          : "";
      setOperatorsError(msg || "Errore aggiornamento stato operaio.");
    }
  }

  // ----- Effects -----

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
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await loadManagersByShip(selectedShipId);
      await loadOperatorsByShip(selectedShipId);
      setOpQuery("");
      setOpResults([]);
      setSelectedOperatorId("");
      setOpMsg(null);
    })();
    return () => {
      alive = false;
    };
  }, [selectedShipId]);

  // Debounced operator search
  useEffect(() => {
    const handle = window.setTimeout(() => {
      void searchOperators(opQuery);
    }, 250);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opQuery, selectedShipId]);

  const cardBase = cn(
    "rounded-2xl border p-3 sm:p-4",
    isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white"
  );

  const showNoShips = !loadingShips && ships.length === 0 && !shipsError;

  return (
    <div className="space-y-4">
      <header className="px-3 sm:px-4 pt-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
          {t(lang, "PERIM_SCOPE")}
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-100">{t(lang, "PERIM_TITLE")}</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">{t(lang, "PERIM_SUB")}</p>
      </header>

      {/* SHIP SELECT */}
      <section className={cn(cardBase, "mx-3 sm:mx-4")}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{t(lang, "PERIM_SCOPE")}</div>
            <div className="text-xs text-slate-400 mt-1">{t(lang, "PERIM_SCOPE_HINT")}</div>
          </div>

          <div className="min-w-[260px]">
            <label className="block text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-1">
              {t(lang, "PERIM_SELECT_SHIP")}
            </label>
            <select
              value={selectedShipId}
              onChange={(e) => setSelectedShipId(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 text-sm text-slate-100"
              disabled={loadingShips || ships.length === 0}
            >
              {loadingShips ? (
                <option value="">{t(lang, "PERIM_LOADING")}</option>
              ) : ships.length === 0 ? (
                <option value="">{t(lang, "PERIM_NO_SHIPS")}</option>
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

        {showNoShips ? (
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-3">
            <div className="text-sm font-medium text-slate-100">{t(lang, "PERIM_NO_SHIPS")}</div>
          </div>
        ) : null}
      </section>

      {/* MANAGERS */}
      {selectedShipId ? (
        <section className={cn(cardBase, "mx-3 sm:mx-4")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{t(lang, "PERIM_MANAGERS")}</div>
              <div className="text-xs text-slate-400 mt-1">
                Ship: <span className="text-slate-200">{selectedShip ? shipLabel(selectedShip) : "—"}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 text-right">
              <div className="uppercase tracking-[0.18em] text-slate-600">Admin</div>
              <div>ship_managers</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-1">
                {t(lang, "PERIM_ADD_MANAGER")}
              </label>
              <input
                value={addManagerEmail}
                onChange={(e) => setAddManagerEmail(e.target.value)}
                placeholder="es. manager@core.com"
                className="h-9 w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 text-sm text-slate-100"
              />
            </div>

            <button
              type="button"
              onClick={addManager}
              disabled={addingManager || !safeText(addManagerEmail).trim()}
              className={cn(
                "h-9 px-3 rounded-xl border text-xs font-medium",
                "border-slate-700 text-slate-100 hover:bg-slate-900/60",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {addingManager ? t(lang, "PERIM_LOADING") : t(lang, "PERIM_ADD")}
            </button>
          </div>

          {managerMsg ? (
            <div
              className={cn(
                "mt-3 rounded-xl border px-3 py-2 text-xs",
                managerMsg.ok
                  ? "border-emerald-700/30 bg-emerald-500/10 text-emerald-200"
                  : "border-rose-700/40 bg-rose-500/10 text-rose-200"
              )}
            >
              {managerMsg.text}
            </div>
          ) : null}

          <div className="mt-4 overflow-x-auto border border-slate-800 rounded-xl">
            <table className="min-w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left py-2 px-3">Email</th>
                  <th className="text-left py-2 px-3">Nome</th>
                  <th className="text-left py-2 px-3">Ruolo</th>
                  <th className="text-right py-2 px-3">{t(lang, "ACTIONS")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loadingManagers ? (
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-xs text-slate-500">
                      {t(lang, "PERIM_LOADING")}
                    </td>
                  </tr>
                ) : managers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-xs text-slate-500">
                      {t(lang, "PERIM_NO_MANAGERS")}
                    </td>
                  </tr>
                ) : (
                  managers.map((m) => (
                    <tr key={m.manager_id} className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 text-slate-100">{m.email || "—"}</td>
                      <td className="py-2 px-3 text-slate-300">{m.display_name || m.full_name || "—"}</td>
                      <td className="py-2 px-3 text-slate-400">{m.app_role || "—"}</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => void removeManager(m.manager_id)}
                          className="px-2 py-1 rounded-md border border-rose-700/40 text-rose-200 hover:bg-rose-900/20"
                        >
                          {t(lang, "PERIM_REMOVE")}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {managersError ? (
            <div className="mt-3 rounded-xl border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {managersError}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* IMPORT OPERATORS */}
      {selectedShipId ? (
        <div className="mx-3 sm:mx-4">
          <ImportOperatorsExcel
            shipId={selectedShipId}
            onDone={() => {
              void loadOperatorsByShip(selectedShipId);
            }}
          />
        </div>
      ) : null}

      {/* LINK OPERATOR (NEW) */}
      {selectedShipId ? (
        <section className={cn(cardBase, "mx-3 sm:mx-4")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Perimetri · Link Operatore</div>
              <div className="text-sm font-medium text-slate-100">Collega un operatore esistente al cantiere</div>
              <div className="text-xs text-slate-400 mt-1">
                Creazione identità: <span className="text-slate-200">Admin → Operatori</span>. Qui fai solo il link in{" "}
                <span className="text-slate-200">ship_operators</span>.
              </div>
            </div>
            <div className="text-[11px] text-slate-500 text-right">
              <div className="uppercase tracking-[0.18em] text-slate-600">Scope</div>
              <div>{selectedShip ? shipLabel(selectedShip) : "—"}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-1">
                Cerca operatore (min 2 caratteri)
              </label>
              <input
                value={opQuery}
                onChange={(e) => setOpQuery(e.target.value)}
                placeholder="Es. Belal / Hossain / Rossi / Marco"
                className="h-9 w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 text-sm text-slate-100"
              />
              {opSearching ? <div className="mt-1 text-[11px] text-slate-500">Ricerca…</div> : null}
            </div>

            <button
              type="button"
              onClick={linkSelectedOperator}
              disabled={linkingOperator || !safeText(selectedOperatorId).trim()}
              className={cn(
                "h-9 px-3 rounded-xl border text-xs font-medium",
                "border-slate-700 text-slate-100 hover:bg-slate-900/60",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {linkingOperator ? "Link…" : "Link"}
            </button>
          </div>

          {opMsg ? (
            <div
              className={cn(
                "mt-3 rounded-xl border px-3 py-2 text-xs",
                opMsg.ok
                  ? "border-emerald-700/30 bg-emerald-500/10 text-emerald-200"
                  : "border-rose-700/40 bg-rose-500/10 text-rose-200"
              )}
            >
              {opMsg.text}
            </div>
          ) : null}

          {opResults.length ? (
            <div className="mt-3 overflow-x-auto border border-slate-800 rounded-xl">
              <table className="min-w-full text-[12px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="text-left py-2 px-3">Seleziona</th>
                    <th className="text-left py-2 px-3">Cognome</th>
                    <th className="text-left py-2 px-3">Nome</th>
                    <th className="text-left py-2 px-3">Birth</th>
                    <th className="text-left py-2 px-3">Ruoli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {opResults.map((r) => {
                    const rolesArr = Array.isArray(r.roles) ? (r.roles as string[]) : [];
                    const picked = selectedOperatorId === r.id;
                    return (
                      <tr key={r.id} className="hover:bg-slate-900/40">
                        <td className="py-2 px-3">
                          <input
                            type="radio"
                            name="opPick"
                            checked={picked}
                            onChange={() => setSelectedOperatorId(r.id)}
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-100">{safeText(r.cognome) || "—"}</td>
                        <td className="py-2 px-3 text-slate-100">{safeText(r.nome) || "—"}</td>
                        <td className="py-2 px-3 text-slate-400">{safeText(r.birth_date) || "—"}</td>
                        <td className="py-2 px-3 text-slate-300">{rolesArr.length ? rolesArr.join(", ") : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* OPERATORS LIST */}
      <section className={cn(cardBase, "mx-3 sm:mx-4 mb-4")}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{t(lang, "PERIM_OPS")}</div>
            <div className="text-xs text-slate-400 mt-1">{t(lang, "PERIM_OPS_HINT")}</div>
          </div>
          <div className="text-[11px] text-slate-500 text-right">
            <div className="uppercase tracking-[0.18em] text-slate-600">{t(lang, "PERIM_STATUS")}</div>
            <div>Elenco</div>
          </div>
        </div>

        {operatorsError ? (
          <div className="rounded-xl border border-rose-700/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {operatorsError}
          </div>
        ) : null}

        {loadingOperators ? (
          <div className="text-xs text-slate-400">{t(lang, "PERIM_LOADING")}</div>
        ) : operators.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-3">
            <div className="text-sm font-medium text-slate-100">Nessun operatore collegato</div>
            <div className="text-xs text-slate-400 mt-1">Usa import o “Link Operatore”.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left py-1.5 pr-3">Operatore</th>
                  <th className="text-left py-1.5 pr-3">Ruoli</th>
                  <th className="text-left py-1.5 pr-3">{t(lang, "PERIM_STATUS")}</th>
                  <th className="text-right py-1.5 pr-3">{t(lang, "ACTIONS")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {operators.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-900/40">
                    <td className="py-2 pr-3 text-slate-100">
                      {op.display}
                      <span className="ml-2 text-slate-500 text-[11px]">{op.birth_date ? `(${op.birth_date})` : ""}</span>
                    </td>
                    <td className="py-2 pr-3 text-slate-300">{op.roles.length ? op.roles.join(", ") : "—"}</td>
                    <td className="py-2 pr-3">
                      {op.active ? <span className="text-emerald-400">Active</span> : <span className="text-slate-500">Inactive</span>}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <button
                        type="button"
                        onClick={() => void toggleOperatorActive(op.id, !op.active)}
                        className={cn(
                          "px-2 py-1 rounded-md border text-xs",
                          op.active
                            ? "border-slate-700 text-slate-200 hover:bg-slate-900/50"
                            : "border-emerald-700/40 text-emerald-200 hover:bg-emerald-900/15"
                        )}
                      >
                        {op.active ? "Disattiva" : "Attiva"}
                      </button>
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
