// src/utils/formatHuman.js

function safeStr(v) {
  return (v ?? "").toString().trim();
}

/**
 * Title Case “humain” robuste (espaces multiples, tirets, apostrophes).
 * - "maiga" -> "Maiga"
 * - "hamidou maiga" -> "Hamidou Maiga"
 * - "di marco" -> "Di Marco"
 * - "d'amico" -> "D'Amico"
 * - "jean-luc" -> "Jean-Luc"
 */
export function formatHumanName(input) {
  const raw = safeStr(input);
  if (!raw) return "";

  // keep email as-is (people prefer exact address)
  if (raw.includes("@")) return raw;

  const words = raw
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean);

  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  const formatToken = (token) => {
    // handle hyphenated names: "jean-luc"
    if (token.includes("-")) {
      return token
        .split("-")
        .filter(Boolean)
        .map((p) => formatToken(p))
        .join("-");
    }

    // handle apostrophes: "d'amico"
    if (token.includes("'")) {
      const parts = token.split("'").filter((p) => p !== "");
      if (parts.length === 0) return token;
      return parts.map((p, i) => (i === 0 ? cap(p) : cap(p))).join("'");
    }

    return cap(token);
  };

  return words.map(formatToken).join(" ");
}

/**
 * For profiles (Supabase Auth / profiles table).
 */
export function formatDisplayName(profile, fallback = "User") {
  const raw =
    profile?.display_name ||
    profile?.full_name ||
    profile?.email ||
    fallback;

  const out = formatHumanName(raw);
  return out || fallback;
}
