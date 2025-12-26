// src/manager/components/NamePill.jsx
import React from "react";
import { corePills } from "../../ui/designSystem";

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
 * - ALWAYS uppercase for display (deterministic UI rule)
 */
export default function NamePill({
  isDark = true,
  tone = "neutral",
  children,
  className = "",
  title = "",
}) {
  const raw = safeText(children);
  const upper = raw ? raw.toUpperCase() : "—";

  return (
    <span
      className={cn(
        corePills(isDark, tone),
        "max-w-full truncate",
        // enforce visual + semantic uppercase (even if CSS differs elsewhere)
        "uppercase",
        className
      )}
      title={title || upper}
    >
      {upper}
    </span>
  );
}
