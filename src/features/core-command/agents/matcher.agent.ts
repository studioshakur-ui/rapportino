// src/features/core-command/agents/matcher.agent.ts
// V2 — batch lookup. Une seule requête Supabase pour N codes.
// LECTURE SEULE sur inca_cavi. Aucune écriture.

import { supabase } from "../../../lib/supabaseClient";

export interface MatchResult {
  cable_code_normalized: string;
  inca_cavo_id: string | null;
  matched: boolean;
  confidence: number;
}

function compactCode(code: string): string {
  return code.replace(/\s+/g, "");
}

function sanitizeCodeVariant(code: string): string {
  return code
    .replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/[◑●○◐◒◓◔◕▶▷►◀◁◄]/g, "")
    .replace(/[.\s]+/g, " ")
    .trim()
    .toUpperCase();
}

function buildLetterGroupings(letters: string): string[] {
  if (letters.length <= 1) return [letters];

  const values = new Set<string>();
  for (let index = 1; index < letters.length; index += 1) {
    const head = letters.slice(0, index);
    const tail = letters.slice(index);
    for (const groupedTail of buildLetterGroupings(tail)) {
      values.add(`${head} ${groupedTail}`);
    }
  }
  values.add(letters);
  return Array.from(values);
}

function buildCodeVariants(normalizedCode: string): string[] {
  const values = new Set<string>();
  const sanitized = sanitizeCodeVariant(normalizedCode);

  if (sanitized) {
    values.add(sanitized);
    values.add(compactCode(sanitized));
  }

  const match = sanitized.match(/^([A-Z]{2,5})\s+(\d{2,5})(?:\s+([A-Z]))?$/);
  if (!match) return Array.from(values);

  const [, letters, digits, suffix] = match;
  for (const grouping of buildLetterGroupings(letters)) {
    values.add(suffix ? `${grouping} ${digits} ${suffix}` : `${grouping} ${digits}`);
  }

  return Array.from(values);
}

// Lookup unitaire (utilisé ponctuellement)
export async function matchCableCode(cableCodeNormalized: string): Promise<MatchResult> {
  if (!cableCodeNormalized) {
    return { cable_code_normalized: cableCodeNormalized, inca_cavo_id: null, matched: false, confidence: 0 };
  }
  const variants = buildCodeVariants(cableCodeNormalized);
  const compactVariants = Array.from(new Set(variants.map((variant) => compactCode(variant)).filter(Boolean)));
  const wildcardVariants = Array.from(
    new Set(
      variants
        .filter((variant) => /\s/.test(variant))
        .map((variant) => `%${variant.replace(/\s+/g, "%")}%`)
    )
  );

  const queries = [
    supabase.from("inca_cavi").select("id, codice, codice_norm").in("codice", variants).limit(1),
    supabase.from("inca_cavi").select("id, codice, codice_norm").in("codice_norm", compactVariants).limit(1),
    ...wildcardVariants.slice(0, 2).map((variant) =>
      supabase.from("inca_cavi").select("id, codice, codice_norm").ilike("codice", variant).limit(1)
    ),
  ];

  const results = await Promise.all(queries);
  const firstMatch = results.flatMap((result) => result.data ?? [])[0] ?? null;

  if (!firstMatch) {
    return { cable_code_normalized: cableCodeNormalized, inca_cavo_id: null, matched: false, confidence: 0 };
  }

  const exactMatch = variants.includes(sanitizeCodeVariant(firstMatch.codice ?? ""));
  const normMatch = compactVariants.includes(String(firstMatch.codice_norm ?? "").trim().toUpperCase());
  const confidence = exactMatch ? 0.95 : normMatch ? 0.9 : 0.85;

  return { cable_code_normalized: cableCodeNormalized, inca_cavo_id: firstMatch.id, matched: true, confidence };
}

// Batch lookup — UNE seule requête pour tous les codes.
// Retourne une Map<normalized_code, MatchResult>.
export async function batchMatchCableCodes(
  codes: string[]
): Promise<Map<string, MatchResult>> {
  const results = new Map<string, MatchResult>();
  if (codes.length === 0) return results;

  // Initialiser tous à non-matché
  for (const c of codes) {
    results.set(c, { cable_code_normalized: c, inca_cavo_id: null, matched: false, confidence: 0 });
  }

  // Un seul SELECT avec filtre OR sur codice
  // On utilise ilike pour chaque code (espaces → %)
  // Supabase ne supporte pas facilement ilike multi-valeurs, donc on filtre côté JS.
  const { data } = await supabase
    .from("inca_cavi")
    .select("id, codice, codice_norm")
    .limit(10000); // charger tout le référentiel une fois

  if (!data) return results;

  // Index local multi-clés : codice brut, compact, et codice_norm si présent.
  const incaIndex = new Map<string, { id: string; confidence: number }>();
  for (const row of data) {
    const rawCode = sanitizeCodeVariant(String(row.codice ?? ""));
    const compactRaw = compactCode(rawCode);
    const normCode = String(row.codice_norm ?? "").trim().toUpperCase();

    if (rawCode && !incaIndex.has(rawCode)) {
      incaIndex.set(rawCode, { id: row.id, confidence: 0.95 });
    }
    if (compactRaw && !incaIndex.has(compactRaw)) {
      incaIndex.set(compactRaw, { id: row.id, confidence: 0.9 });
    }
    if (normCode && !incaIndex.has(normCode)) {
      incaIndex.set(normCode, { id: row.id, confidence: 0.9 });
    }
  }

  // Matcher chaque code normalisé
  for (const code of codes) {
    const variants = buildCodeVariants(code);
    for (const variant of variants) {
      const match = incaIndex.get(variant);
      if (match) {
        results.set(code, {
          cable_code_normalized: code,
          inca_cavo_id: match.id,
          matched: true,
          confidence: match.confidence,
        });
        break;
      }
    }
  }

  return results;
}
