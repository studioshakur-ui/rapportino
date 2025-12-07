// src/context/ShipContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const ShipContext = createContext(null);

function getInitialShip() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("core-current-ship");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function ShipProvider({ children }) {
  const [currentShip, setCurrentShip] = useState(getInitialShip);

  useEffect(() => {
    try {
      if (currentShip) {
        window.localStorage.setItem(
          "core-current-ship",
          JSON.stringify(currentShip)
        );
      } else {
        window.localStorage.removeItem("core-current-ship");
      }
    } catch {
      // ignore
    }
  }, [currentShip]);

  const clearShip = () => setCurrentShip(null);

  const value = {
    currentShip,
    setCurrentShip,
    clearShip,
  };

  return (
    <ShipContext.Provider value={value}>{children}</ShipContext.Provider>
  );
}

export function useShip() {
  const ctx = useContext(ShipContext);
  if (!ctx) {
    throw new Error(
      "useShip must be used within a ShipProvider (wrap your app)."
    );
  }
  return ctx;
}
