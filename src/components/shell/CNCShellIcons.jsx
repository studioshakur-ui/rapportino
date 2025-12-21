// src/components/shell/CNCShellIcons.jsx
import React from "react";

/**
 * Petit set d’icônes inline, cohérent CNCS (Direction style).
 */
export function NavIcon({ name, className = "" }) {
  const base = "h-4 w-4";
  switch (name) {
    case "dashboard":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" />
          <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" />
          <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" />
          <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" />
        </svg>
      );
    case "presentation":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <path d="M4 5h16v10H4z" stroke="currentColor" />
          <path d="M8 19h8" stroke="currentColor" />
        </svg>
      );
    case "ufficio":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <path d="M4 21V7l8-4 8 4v14" stroke="currentColor" />
          <path d="M9 21v-6h6v6" stroke="currentColor" />
        </svg>
      );
    case "archive":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="6" rx="2" stroke="currentColor" />
          <rect x="3" y="10" width="18" height="10" rx="2" stroke="currentColor" />
        </svg>
      );
    case "rapportini":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <path d="M7 3h10v18H7z" stroke="currentColor" />
          <path d="M9 7h6" stroke="currentColor" />
          <path d="M9 11h6" stroke="currentColor" />
          <path d="M9 15h4" stroke="currentColor" />
        </svg>
      );
    case "inca":
      return (
        <svg className={`${base} ${className}`} viewBox="0 0 24 24" fill="none">
          <path d="M4 7h16" stroke="currentColor" />
          <path d="M4 12h16" stroke="currentColor" />
          <path d="M4 17h16" stroke="currentColor" />
          <path d="M8 7v10" stroke="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}
