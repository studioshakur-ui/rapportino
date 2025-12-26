// src/context/ShipContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const ShipContext = createContext(null);

const STORAGE_KEY = "core-current-ship";

/* -----------------------------
   Storage
----------------------------- */
function getInitialShip() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Minimal sanity check
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.id || !parsed.code) return null;

    return parsed;
  } catch {
    return null;
  }
}

function persistShip(ship) {
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

function normalizeShip(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    yard: row.yard ?? "",
    is_active: row.is_active ?? true,
  };
}

function safeStr(x) {
  return (x ?? "").toString();
}

function sameId(a, b) {
  return safeStr(a) && safeStr(b) && safeStr(a) === safeStr(b);
}

/* -----------------------------
   Provider
----------------------------- */
export function ShipProvider({ children }) {
  const [currentShip, setCurrentShip] = useState(getInitialShip);

  // Canonical list of ships allowed for the current CAPO
  const [ships, setShips] = useState([]);
  const [loadingShips, setLoadingShips] = useState(true);
  const [shipsError, setShipsError] = useState(null);

  const shipsById = useMemo(() => {
    const m = new Map();
    for (const s of ships) {
      if (s?.id) m.set(String(s.id), s);
    }
    return m;
  }, [ships]);

  const isShipAllowed = useCallback(
    (ship) => {
      if (!ship?.id) return false;
      return shipsById.has(String(ship.id));
    },
    [shipsById]
  );

  const clearShip = useCallback(() => setCurrentShip(null), []);

  // Persist any change (but do not “trust” storage for authorization)
  useEffect(() => {
    persistShip(currentShip);
  }, [currentShip]);

  /* -----------------------------
     Load allowed ships for CAPO (strict scope)
     Source of truth: RPC public.capo_my_ships_v1
  ----------------------------- */
  const refreshShips = useCallback(async () => {
    setLoadingShips(true);
    setShipsError(null);

    try {
      const { data, error } = await supabase.rpc("capo_my_ships_v1");
      if (error) throw error;

      const list = Array.isArray(data) ? data.map(normalizeShip).filter(Boolean) : [];
      setShips(list);
    } catch (e) {
      console.error("[ShipContext] refreshShips error:", e);
      setShips([]);
      setShipsError("Impossibile recuperare le navi assegnate.");
    } finally {
      setLoadingShips(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingShips(true);
      setShipsError(null);

      try {
        const { data, error } = await supabase.rpc("capo_my_ships_v1");
        if (error) throw error;

        const list = Array.isArray(data) ? data.map(normalizeShip).filter(Boolean) : [];
        if (!alive) return;

        setShips(list);
      } catch (e) {
        console.error("[ShipContext] initial load ships error:", e);
        if (!alive) return;
        setShips([]);
        setShipsError("Impossibile recuperare le navi assegnate.");
      } finally {
        if (alive) setLoadingShips(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /* -----------------------------
     Authorization guard:
     If currentShip exists but is not in allowed list => clear it.
     Also: if it's allowed, replace it with canonical row (fresh name/yard/etc.)
  ----------------------------- */
  useEffect(() => {
    if (loadingShips) return;

    if (!currentShip) return;

    const allowed = shipsById.get(String(currentShip.id));

    if (!allowed) {
      // Ship persisted but no longer allowed (or was never allowed)
      setCurrentShip(null);
      return;
    }

    // Canonicalize stored ship to avoid stale label inconsistencies
    const canonical = normalizeShip(allowed);
    if (!canonical) return;

    const same =
      sameId(canonical.id, currentShip.id) &&
      safeStr(canonical.code) === safeStr(currentShip.code) &&
      safeStr(canonical.name) === safeStr(currentShip.name) &&
      safeStr(canonical.yard) === safeStr(currentShip.yard);

    if (!same) {
      setCurrentShip(canonical);
    }
  }, [loadingShips, shipsById, currentShip]);

  const value = useMemo(() => {
    return {
      // Selected ship (nullable)
      currentShip,
      setCurrentShip: (ship) => setCurrentShip(ship ? normalizeShip(ship) : null),
      clearShip,

      // Allowed ships for this CAPO
      ships,
      loadingShips,
      shipsError,
      refreshShips,

      // Helpers (useful for UI conditions)
      isShipAllowed,
    };
  }, [currentShip, clearShip, ships, loadingShips, shipsError, refreshShips, isShipAllowed]);

  return <ShipContext.Provider value={value}>{children}</ShipContext.Provider>;
}

export function useShip() {
  const ctx = useContext(ShipContext);
  if (!ctx) {
    throw new Error("useShip must be used within a ShipProvider (wrap your app).");
  }
  return ctx;
}
