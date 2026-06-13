// src/core/cable/cableMatching.bench.test.ts
// BANC DE TEST — qualité réelle du matching câble sur cas chantier.
//
// Deux étages, comme le pipeline réel :
//   A. EXTRACTION  — texte WhatsApp brut -> codes (normalizer.agent.extractCableRefs)
//   B. RÉSOLUTION  — code -> ligne INCA (cableIdentity.resolveCableMatch)
//
// Les fixtures viennent de formats RÉELS (en-tête normalizer.agent.ts) + des
// pièges connus (mots courants, mots de chantier, préfixes alimento ambigus).
// Le test imprime un tableau de bord chiffré ET asserte un seuil de qualité,
// pour transformer « je crois que c'est bon » en « X/N corrects, voici qui rate ».

import { describe, expect, it } from "vitest";
import { extractCableRefs } from "../../features/core-command/agents/normalizer.agent";
import { resolveCableMatch, type CableMatchSource } from "./cableIdentity";

// ---------------------------------------------------------------------------
// ÉTAGE A — extraction depuis texte chantier brut
// expectCodes = ensemble des codes normalisés attendus (vide = ne doit RIEN extraire)
// ---------------------------------------------------------------------------
type ExtractCase = { label: string; text: string; expectCodes: string[] };

const EXTRACT_CASES: ExtractCase[] = [
  // -- formats réels documentés ---------------------------------------------
  { label: "points entre lettres", text: "T C C..005 fatto", expectCodes: ["TCC 005"] },
  { label: "double point CCS", text: "C C S..574 ok", expectCodes: ["CCS 574"] },
  { label: "minuscules espacées", text: "R co 008 tirato", expectCodes: ["RCO 008"] },
  { label: "collé minuscule", text: "Rco012 da fare", expectCodes: ["RCO 012"] },
  { label: "double espace", text: "T NA  020", expectCodes: ["TNA 020"] },
  { label: "préfixe section ignoré", text: "1-6 c cs 006", expectCodes: ["CCS 006"] },
  { label: "point final", text: "T NA. 023", expectCodes: ["TNA 023"] },
  { label: "symbole ◑ en tête", text: "◑N AH 173 collegato", expectCodes: ["NAH 173"] },
  { label: "emoji feu", text: "T NA🚦009", expectCodes: ["TNA 009"] },
  // -- variantes plausibles -------------------------------------------------
  { label: "suffixe lettre collé", text: "WSF 038A posato", expectCodes: ["WSF 038 A"] },
  { label: "deux câbles, 'e'=et italien", text: "fatto IRS 002 e TVU 074", expectCodes: ["IRS 002", "TVU 074"] },
  { label: "mention whatsapp", text: "@Mario TCC 005 ok", expectCodes: ["TCC 005"] },
  { label: "trois lignes", text: "TCC 005\nCCS 574\nRCO 008", expectCodes: ["TCC 005", "CCS 574", "RCO 008"] },
  // -- pièges : ne doivent RIEN extraire ------------------------------------
  { label: "piège mot courant OK", text: "OK 5 grazie", expectCodes: [] },
  { label: "piège site PONTE", text: "ponte 10 finito", expectCodes: [] },
  { label: "piège site SCALA", text: "scala 3 ok", expectCodes: [] },
  { label: "piège conversation", text: "ho fatto 20 metri oggi", expectCodes: [] },
  { label: "piège SI/NO", text: "SI 12 no problema", expectCodes: [] },
];

// ---------------------------------------------------------------------------
// ÉTAGE B — résolution contre un INCA synthétique réaliste
// (mélange : câbles non préfixés, préfixés uniques, préfixés homonymes)
// ---------------------------------------------------------------------------
const INCA = [
  { id: "irs002", strict: "IRS 002", loose: "IRS 002" },
  { id: "irs002-15", strict: "1-5 IRS 002", loose: "IRS 002" },
  { id: "wsf038-17", strict: "1-7 WSF 038", loose: "WSF 038" },
  { id: "wsf038-18", strict: "1-8 WSF 038", loose: "WSF 038" }, // homonyme -> ambigu en loose
  { id: "tvu074-19", strict: "1-9 TVU 074", loose: "TVU 074" }, // unique en loose
  { id: "tcc005", strict: "TCC 005", loose: "TCC 005" },
  { id: "nah173-11", strict: "1-1 NAH 173", loose: "NAH 173" }, // unique en loose
];

type ResolveCase = {
  label: string;
  raw: string;
  expectId: string | null;
  expectSource: CableMatchSource;
};

const RESOLVE_CASES: ResolveCase[] = [
  { label: "préfixé exact -> strict", raw: "1-5 I RS002", expectId: "irs002-15", expectSource: "strict" },
  { label: "non préfixé exact -> strict", raw: "I RS 002", expectId: "irs002", expectSource: "strict" },
  { label: "strict préfixé WSF", raw: "1-7 W SF038", expectId: "wsf038-17", expectSource: "strict" },
  { label: "field sans préfixe, unique -> loose", raw: "TVU 074", expectId: "tvu074-19", expectSource: "loose" },
  { label: "field sans préfixe, unique NAH -> loose", raw: "N AH173", expectId: "nah173-11", expectSource: "loose" },
  { label: "loose homonyme -> ambigu", raw: "WSF 038", expectId: null, expectSource: "ambiguous" },
  { label: "inexistant -> none", raw: "ZZZ 999", expectId: null, expectSource: "none" },
  { label: "TCC depuis texte -> strict", raw: "TCC 005", expectId: "tcc005", expectSource: "strict" },
];

// ---------------------------------------------------------------------------
// Runner + scoreboard
// ---------------------------------------------------------------------------
function setEq(a: string[], b: string[]): boolean {
  const sa = new Set(a), sb = new Set(b);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
}

describe("BANC matching câble — étage A (extraction texte chantier)", () => {
  const fails: string[] = [];
  for (const c of EXTRACT_CASES) {
    const got = extractCableRefs(c.text).map((r) => r.normalized);
    const ok = setEq(got, c.expectCodes);
    if (!ok) fails.push(`  ✗ ${c.label}: "${c.text.replace(/\n/g, "\\n")}" -> [${got.join(", ")}] (attendu [${c.expectCodes.join(", ")}])`);
  }

  it("scoreboard extraction", () => {
    const total = EXTRACT_CASES.length;
    const passed = total - fails.length;
    // eslint-disable-next-line no-console
    console.log(`\n[ÉTAGE A] extraction : ${passed}/${total} corrects` + (fails.length ? `\n${fails.join("\n")}` : ""));
    expect(passed, fails.join("\n")).toBe(total);
  });
});

describe("BANC matching câble — étage B (résolution INCA)", () => {
  const fails: string[] = [];
  for (const c of RESOLVE_CASES) {
    const r = resolveCableMatch(c.raw, INCA);
    const ok = r.incaCavoId === c.expectId && r.source === c.expectSource;
    if (!ok) fails.push(`  ✗ ${c.label}: "${c.raw}" -> {${r.incaCavoId}, ${r.source}} (attendu {${c.expectId}, ${c.expectSource}})`);
  }

  it("scoreboard résolution", () => {
    const total = RESOLVE_CASES.length;
    const passed = total - fails.length;
    // eslint-disable-next-line no-console
    console.log(`\n[ÉTAGE B] résolution : ${passed}/${total} corrects` + (fails.length ? `\n${fails.join("\n")}` : ""));
    expect(passed, fails.join("\n")).toBe(total);
  });
});
