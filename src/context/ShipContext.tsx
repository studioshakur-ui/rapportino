// src/context/ShipContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type Ship = {
  id: string;
  code: string;
  name?: string | null;
  yard?: string | null;
  is_active?: boolean | null;

  // optional fields used elsewhere
  costr?: string | null;
  commessa?: string | null;
};

type ShipContextValue = {
  currentShip: Ship | null;
  ships: Ship[];
  loadingShips: boolean;
  shipsError: string | null;

  setCurrentShip: React.Dispatch<React.SetStateAction<Ship | null>>;
  clearShip: () => void;
  resetShipContext: () => void;
  refreshShips: () => Promise<void>;

  isShipAllowed: (ship: Ship | null) => boolean;
};

const ShipContext = createContext<ShipContextValue | null>(null);

const STORAGE_KEY = "core-current-ship";

function safeStr(x: unknown): string {
  if (x === null || x === undefined) return "";
  return String(x);
}

function sameId(a: unknown, b: unknown): boolean {
  return safeStr(a) !== "" && safeStr(b) !== "" && safeStr(a) === safeStr(b);
}

function normalizeShip(row: any): Ship | null {
  if (!row) return null;
  if (!row.id || !row.code) return null;

  return {
    id: String(row.id),
    code: String(row.code),
    name: row.name ?? null,
    yard: row.yard ?? "",
    is_active: row.is_active ?? true,
    costr: row.costr ?? null,
    commessa: row.commessa ?? null,
  };
}

function getInitialShip(): Ship | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeShip(parsed);
  } catch {
    return null;
  }
}

function persistShip(ship: Ship | null): void {
  try {
    if (ship) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ship));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function ShipProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [currentShip, setCurrentShip] = useState<Ship | null>(() => getInitialShip());

  const [ships, setShips] = useState<Ship[]>([]);
  const [loadingShips, setLoadingShips] = useState<boolean>(true);
  const [shipsError, setShipsError] = useState<string | null>(null);

  const shipsById = useMemo(() => {
    const m = new Map<string, Ship>();
    for (const s of ships) {
      if (s?.id) m.set(String(s.id), s);
    }
    return m;
  }, [ships]);

  const isShipAllowed = useCallback(
    (ship: Ship | null) => {
      if (!ship?.id) return false;
      return shipsById.has(String(ship.id));
    },
    [shipsById]
  );

  const clearShip = useCallback(() => setCurrentShip(null), []);

  const resetShipContext = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setCurrentShip(null);
    setShips([]);
    setShipsError(null);
    setLoadingShips(false);
  }, []);

  useEffect(() => {
    persistShip(currentShip);
  }, [currentShip]);

  const refreshShips = useCallback(async () => {
    setLoadingShips(true);
    setShipsError(null);
    try {
      const { data, error } = await supabase.rpc("capo_my_ships_v1");
      if (error) throw error;

      const list = Array.isArray(data) ? data.map(normalizeShip).filter(Boolean) : [];
      setShips(list as Ship[]);
    } catch (e) {
      console.error("[ShipContext] refreshShips error:", e);
      setShips([]);
      setShipsError("Impossibile recuperare le navi assegnate.");
    } finally {
      setLoadingShips(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingShips(true);
      setShipsError(null);
      try {
        const { data, error } = await supabase.rpc("capo_my_ships_v1");
        if (error) throw error;

        if (!alive) return;

        const list = Array.isArray(data) ? data.map(normalizeShip).filter(Boolean) : [];
        setShips(list as Ship[]);
      } catch (e) {
        if (!alive) return;
        console.error("[ShipContext] initial load ships error:", e);
        setShips([]);
        setShipsError("Impossibile recuperare le navi assegnate.");
      } finally {
        if (!alive) return;
        setLoadingShips(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (loadingShips) return;
    if (!currentShip) return;

    const allowed = shipsById.get(String(currentShip.id));
    if (!allowed) {
      setCurrentShip(null);
      return;
    }

    const canonical = normalizeShip(allowed);
    if (!canonical) return;

    const same =
      sameId(currentShip.id, canonical.id) &&
      safeStr(currentShip.code) === safeStr(canonical.code) &&
      safeStr(currentShip.name) === safeStr(canonical.name);

    if (!same) setCurrentShip(canonical);
  }, [shipsById, currentShip, loadingShips]);

  const value = useMemo<ShipContextValue>(() => {
    return {
      currentShip,
      ships,
      loadingShips,
      shipsError,

      setCurrentShip,
      clearShip,
      resetShipContext,
      refreshShips,

      isShipAllowed,
    };
  }, [currentShip, ships, loadingShips, shipsError, clearShip, resetShipContext, refreshShips, isShipAllowed]);

  return <ShipContext.Provider value={value}>{children}</ShipContext.Provider>;
}

export function useShip(): ShipContextValue {
  const ctx = useContext(ShipContext);
  if (!ctx) throw new Error("useShip must be used within a ShipProvider (wrap your app).");
  return ctx;
}
