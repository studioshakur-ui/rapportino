// src/capo/CapoRapportinoGate.tsx
// Guard for /app/ship/:shipId/rapportino:
// - If the CAPO role isn't selected yet, redirect to /rapportino/role
// - Otherwise render the actual RapportinoPage

import React, { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";

import RapportinoPage from "../components/RapportinoPage";

type CapoRole = "ELETTRICISTA" | "CARPENTERIA" | "MONTAGGIO";

function readStoredRole(): CapoRole | null {
  try {
    const v = String(window.localStorage.getItem("core-current-role") || "").trim();
    if (v === "ELETTRICISTA" || v === "CARPENTERIA" || v === "MONTAGGIO") return v;
    if (v) window.localStorage.removeItem("core-current-role");
    return null;
  } catch {
    return null;
  }
}

export default function CapoRapportinoGate(): React.ReactElement {
  const { shipId } = useParams();

  const role = useMemo(() => readStoredRole(), []);

  // No shipId should never happen (route contract), but safe fallback.
  if (!shipId) {
    return <Navigate to="/app/ship-selector" replace />;
  }

  // If role isn't selected yet → force role selection first.
  if (!role) {
    return <Navigate to={`/app/ship/${shipId}/rapportino/role`} replace />;
  }

  return <RapportinoPage />;
}