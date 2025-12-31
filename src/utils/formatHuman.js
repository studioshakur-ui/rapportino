// src/utils/formatHuman.js
// Canonical human formatting utilities (CORE)
//
// Rules:
// - Human names must NEVER be forced uppercase in UI.
// - We normalize to a readable Title Case for display.
// - We do not mutate DB values; this is presentation-only.

function safeStr(v) {
  return (v == null ? "" : String(v)).trim();
}

function capitalizeToken(token) {
  const t = safeStr(token);
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Best-effort Title Case for human names.
// Handles spaces, hyphens, and apostrophes in a readable way:
// - "maiga" -> "Maiga"
// - "hamidou maiga" -> "Hamidou Maiga"
// - "d'angelo" -> "D'Angelo"
// - "di-marco" -> "Di-Marco"
export function formatHumanName(raw) {
  const s = safeStr(raw);
  if (!s) return "";

  const lower = s.toLowerCase();

  const tokens = lower
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      // Keep hyphen parts
      const hy = tok.split("-").filter(Boolean);
      const hy2 = hy.map((part) => {
        // Keep apostrophe parts
        const ap = part.split("'");
        if (ap.length === 1) return capitalizeToken(part);
        return ap
          .map((p) => capitalizeToken(p))
          .filter(Boolean)
          .join("'");
      });
      return hy2.join("-");
    });

  return tokens.join(" ");
}

// Canonical display name from a Supabase profile
export function formatDisplayName(profile, fallback = "Capo") {
  if (!profile || typeof profile !== "object") return formatHumanName(fallback);
  const raw =
    profile.display_name ||
    profile.full_name ||
    profile.email ||
    fallback;
  return formatHumanName(raw);
}

// Utility: normalize arbitrary name-ish fields from mixed rows
export function formatMaybeHuman(v, fallback = "") {
  const s = safeStr(v);
  return formatHumanName(s || fallback);
}
