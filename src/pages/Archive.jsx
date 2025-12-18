// /src/pages/Archive.jsx
import React from "react";
import CoreDrivePage from "./CoreDrivePage";

/**
 * Route historique /archive, appelée partout.
 * Décision CORE 1.0:
 * - Archive = CORE Drive (cockpit) avec 2 onglets: Documents + Storico Rapportini v1
 */
export default function ArchivePage() {
  return <CoreDrivePage />;
}
