// src/manager/components/NamePill.jsx
import React from "react";
import { corePills } from "../../ui/designSystem";
import { formatHumanName } from "../../utils/formatHuman";

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function safeText(v) {
  return (v == null ? "" : String(v)).trim();
}

/**
 * NamePill
 * - tone: "emerald" for CAPO, "sky" for OPERATORE
 * - renders the NAME directly as a pill (no extra label)
 * - Human names are displayed in Title Case (never forced uppercase)
 */
export default function NamePill({
  isDark = true,
  tone = "neutral",
  children,
  className = "",
  title = "",
}) {
  const raw = safeText(children);
  const name = raw ? formatHumanName(raw) : "—";

  return (
    <span
      className={cn(
        corePills(isDark, tone),
        "max-w-full truncate",
        className
      )}
      title={title || name}
    >
      {name}
    </span>
  );
}
