// src/utils/formatHuman.js

function safeStr(v: unknown): string {
  return (v ?? "").toString().trim();
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Title Case "humain" robuste (espaces, tirets, apostrophes).
 * - "maiga" -> "Maiga"
 * - "hamidou maiga" -> "Hamidou Maiga"
 * - "jean-luc" -> "Jean-Luc"
 * - "d'amico" -> "D'Amico"
 *
 * Note: si c’est un email, on le laisse tel quel.
 */
export function formatHumanName(input: unknown): string {
  const raw = safeStr(input);
  if (!raw) return "";

  if (raw.includes("@")) return raw;

  const cleaned = raw.replace(/\s+/g, " ").toLowerCase();

  const formatToken = (token: string): string => {
    if (!token) return token;

    // hyphenated
    if (token.includes("-")) {
      return token
        .split("-")
        .filter(Boolean)
        .map((p) => formatToken(p))
        .join("-");
    }

    // apostrophe
    if (token.includes("'")) {
      const parts = token.split("'").filter((p) => p !== "");
      if (parts.length === 0) return token;
      return parts.map((p) => cap(p)).join("'");
    }

    return cap(token);
  };

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map(formatToken)
    .join(" ");
}

/**
 * Profile → display name (safe fallback)
 */
export function formatDisplayName(profile: unknown, fallback = "User"): string {
  const p = profile as { display_name?: unknown; full_name?: unknown; email?: unknown } | null | undefined;
  const raw =
    p?.display_name ||
    p?.full_name ||
    p?.email ||
    fallback;

  const out = formatHumanName(raw);
  return out || fallback;
}
