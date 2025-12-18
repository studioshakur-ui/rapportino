// /src/pages/Archive.jsx
import React from "react";
import CoreDrivePage from "./CoreDrivePage";

/**
 * Route historique /archive, appelée partout.
 * Décision CORE 1.0 :
 * - Archive = CORE Drive (documents) sans casser les imports.
 */
export default function ArchivePage() {
  return <CoreDrivePage />;
}
