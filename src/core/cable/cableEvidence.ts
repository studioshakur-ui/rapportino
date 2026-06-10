import {
  cableKeyCompact,
  normalizeCableLoose,
  normalizeCableStrict,
} from "./cableIdentity";

export type CableEvidenceMatchType =
  | "exact"
  | "strict"
  | "loose"
  | "ocr"
  | "telegram"
  | "manual"
  | "ambiguous"
  | "none";

export type CableEvidenceBucket = "linked" | "ambiguous" | "related";

export interface CableEvidenceMatch {
  target_cable_code: string;
  raw_detected_code: string | null;
  normalized_detected_code: string | null;
  match_type: CableEvidenceMatchType;
  match_confidence: number;
  match_reason: string;
  source_text_excerpt: string | null;
  requires_human_validation: boolean;
  bucket: CableEvidenceBucket;
  highlight_start: number | null;
  highlight_end: number | null;
}

export interface ClassifyCableEvidenceInput {
  targetCableCode: string;
  sourceText: string | null | undefined;
  sourceType?: string | null;
  proofSourceType?: string | null;
  validationStatus?: string | null;
  isManualValidation?: boolean;
}

interface DetectedCableCode {
  raw: string;
  normalizedStrict: string;
  normalizedLoose: string;
  start: number;
  end: number;
}

const CABLE_CODE_RE =
  /\b((?:\d{1,2}[-/]\d{1,2}\s+)?[A-Za-z](?:[\s.\-]*[A-Za-z]){1,4}[\s.\-]*\d{2,5}\s*[A-Za-z]?)\b/g;
const GENERIC_TOKENS = new Set([
  "I",
  "SE",
  "C",
  "T",
  "D",
  "A",
  "E",
  "N",
  "S",
  "R",
  "CS",
  "GF",
]);

export function detectCableCodesInText(
  text: string | null | undefined,
): DetectedCableCode[] {
  const value = String(text ?? "");
  const matches: DetectedCableCode[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  CABLE_CODE_RE.lastIndex = 0;
  while ((match = CABLE_CODE_RE.exec(value)) !== null) {
    const raw = match[1].trim();
    const normalizedStrict = normalizeCableStrict(raw);
    const normalizedLoose = normalizeCableLoose(raw);
    const compact = cableKeyCompact(normalizedLoose);
    const letters = compact.replace(/\d.*$/, "");

    if (!normalizedLoose || !/\d{2,5}/.test(normalizedLoose)) continue;
    if (letters.length < 2 || GENERIC_TOKENS.has(letters)) continue;

    const key = `${match.index}:${raw}:${normalizedStrict}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({
      raw,
      normalizedStrict,
      normalizedLoose,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return matches;
}

export function classifyCableEvidence(
  input: ClassifyCableEvidenceInput,
): CableEvidenceMatch {
  const targetStrict = normalizeCableStrict(input.targetCableCode);
  const targetLoose = normalizeCableLoose(input.targetCableCode);
  const targetStrictKey = cableKeyCompact(targetStrict);
  const targetLooseKey = cableKeyCompact(targetLoose);
  const text = String(input.sourceText ?? "");
  const detected = detectCableCodesInText(text);
  const strictHit = detected.find(
    (code) => cableKeyCompact(code.normalizedStrict) === targetStrictKey,
  );

  if (strictHit) {
    const proofSourceType = String(input.proofSourceType ?? "").toLowerCase();
    const sourceType = String(input.sourceType ?? "").toLowerCase();
    const isOcr = proofSourceType.includes("ocr");
    const isTelegram =
      sourceType.includes("telegram") || proofSourceType.includes("telegram");
    const matchType: CableEvidenceMatchType = isOcr
      ? "ocr"
      : isTelegram
        ? "telegram"
        : strictHit.raw === input.targetCableCode
          ? "exact"
          : "strict";
    return {
      target_cable_code: targetStrict,
      raw_detected_code: strictHit.raw,
      normalized_detected_code: strictHit.normalizedStrict,
      match_type: matchType,
      match_confidence: matchType === "ocr" ? 0.9 : 1,
      match_reason: `Codice target rilevato esplicitamente nel testo: ${strictHit.raw}`,
      source_text_excerpt: buildExcerpt(text, strictHit.start, strictHit.end),
      requires_human_validation: false,
      bucket: "linked",
      highlight_start: strictHit.start,
      highlight_end: strictHit.end,
    };
  }

  if (
    input.isManualValidation ||
    String(input.validationStatus ?? "").toLowerCase() === "validated"
  ) {
    return {
      target_cable_code: targetStrict,
      raw_detected_code: null,
      normalized_detected_code: null,
      match_type: "manual",
      match_confidence: 1,
      match_reason:
        "Prova collegata da validazione manuale del capo, senza conferma automatica dal testo.",
      source_text_excerpt: text
        ? buildExcerpt(text, 0, Math.min(text.length, 80))
        : null,
      requires_human_validation: false,
      bucket: "linked",
      highlight_start: null,
      highlight_end: null,
    };
  }

  const looseHit = detected.find(
    (code) => cableKeyCompact(code.normalizedLoose) === targetLooseKey,
  );
  if (looseHit) {
    return {
      target_cable_code: targetStrict,
      raw_detected_code: looseHit.raw,
      normalized_detected_code: looseHit.normalizedStrict,
      match_type: "loose",
      match_confidence: 0.65,
      match_reason:
        "Il testo contiene una forma compatibile solo in loose match: serve validazione umana prima di collegarla allo storico.",
      source_text_excerpt: buildExcerpt(text, looseHit.start, looseHit.end),
      requires_human_validation: true,
      bucket: "ambiguous",
      highlight_start: looseHit.start,
      highlight_end: looseHit.end,
    };
  }

  const anyOtherCode = detected[0] ?? null;
  return {
    target_cable_code: targetStrict,
    raw_detected_code: anyOtherCode?.raw ?? null,
    normalized_detected_code: anyOtherCode?.normalizedStrict ?? null,
    match_type: anyOtherCode ? "ambiguous" : "none",
    match_confidence: 0,
    match_reason: anyOtherCode
      ? `Segnale correlato: contiene altri codici (${detected.map((code) => code.normalizedStrict).join(", ")}) ma non il target ${targetStrict}.`
      : `Nessuna porzione del testo dimostra il codice target ${targetStrict}.`,
    source_text_excerpt: anyOtherCode
      ? buildExcerpt(text, anyOtherCode.start, anyOtherCode.end)
      : text
        ? buildExcerpt(text, 0, Math.min(text.length, 80))
        : null,
    requires_human_validation: true,
    bucket: anyOtherCode ? "related" : "ambiguous",
    highlight_start: anyOtherCode?.start ?? null,
    highlight_end: anyOtherCode?.end ?? null,
  };
}

export function buildHighlightedText(
  text: string,
  start: number | null,
  end: number | null,
): Array<{ text: string; highlight: boolean }> {
  if (
    start == null ||
    end == null ||
    start < 0 ||
    end <= start ||
    start >= text.length
  ) {
    return [{ text, highlight: false }];
  }
  return [
    { text: text.slice(0, start), highlight: false },
    { text: text.slice(start, Math.min(end, text.length)), highlight: true },
    { text: text.slice(Math.min(end, text.length)), highlight: false },
  ].filter((part) => part.text.length > 0);
}

function buildExcerpt(text: string, start: number, end: number): string | null {
  if (!text) return null;
  const left = Math.max(0, start - 80);
  const right = Math.min(text.length, end + 80);
  const prefix = left > 0 ? "…" : "";
  const suffix = right < text.length ? "…" : "";
  return `${prefix}${text.slice(left, right)}${suffix}`;
}
