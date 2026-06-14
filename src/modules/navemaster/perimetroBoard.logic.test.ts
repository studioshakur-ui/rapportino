import { describe, expect, it } from "vitest";
import type { PerimetroBoardRow } from "./navemaster.types";
import {
  buildMorningSentence,
  cableLevers,
  describeHighlight,
  isActionable,
  isOverdue,
  pickMorningHighlights,
  rankForMorning,
} from "./perimetroBoard.logic";

function row(p: Partial<PerimetroBoardRow> & { perimetro: string }): PerimetroBoardRow {
  return {
    perimetro: p.perimetro,
    data_consegna: p.data_consegna ?? null,
    giorni_al_target: p.giorni_al_target ?? null,
    tot_cavi: p.tot_cavi ?? 0,
    posati: p.posati ?? 0,
    collegati: p.collegati ?? 0,
    bloccati: p.bloccati ?? 0,
    da_completare: p.da_completare ?? 0,
    pct_posa: p.pct_posa ?? 0,
    pct_coll: p.pct_coll ?? 0,
    sistemati: p.sistemati ?? 0,
    da_posare: p.da_posare ?? 0,
    da_sistemare: p.da_sistemare ?? 0,
    pronto_coll: p.pronto_coll ?? 0,
    coll_parziale: p.coll_parziale ?? 0,
    pct_sist: p.pct_sist ?? 0,
    coll_previsti: p.coll_previsti ?? 0,
    coll_fatti: p.coll_fatti ?? 0,
    pct_coll_pin: p.pct_coll_pin ?? 0,
  };
}

describe("perimetroBoard.logic", () => {
  it("isActionable / isOverdue", () => {
    expect(isActionable(row({ perimetro: "A", da_completare: 0 }))).toBe(false);
    expect(isActionable(row({ perimetro: "A", da_completare: 2 }))).toBe(true);
    expect(isOverdue(row({ perimetro: "A", giorni_al_target: -1 }))).toBe(true);
    expect(isOverdue(row({ perimetro: "A", giorni_al_target: 0 }))).toBe(false);
    expect(isOverdue(row({ perimetro: "A", giorni_al_target: null }))).toBe(false);
  });

  it("classe les en-retard d'abord, puis le moins de câbles restants", () => {
    const rows = [
      row({ perimetro: "FUTUR_PROCHE", giorni_al_target: 5, da_completare: 1, pronto_coll: 1, pct_posa: 95 }),
      row({ perimetro: "RETARD_GROS", giorni_al_target: -40, da_completare: 8, da_posare: 8, pct_posa: 60 }),
      row({ perimetro: "RETARD_PETIT", giorni_al_target: -78, da_completare: 3, pronto_coll: 3, pct_posa: 50 }),
      row({ perimetro: "COMPLET", da_completare: 0, pct_posa: 100 }), // exclu
    ];
    const ranked = rankForMorning(rows).map((r) => r.perimetro);
    // les deux en retard d'abord (petit nombre de restants en tête), puis le futur
    expect(ranked).toEqual(["RETARD_PETIT", "RETARD_GROS", "FUTUR_PROCHE"]);
    expect(ranked).not.toContain("COMPLET");
  });

  it("pickMorningHighlights limite à N", () => {
    const rows = Array.from({ length: 6 }, (_, i) =>
      row({ perimetro: `P${i}`, da_completare: i + 1, pronto_coll: i + 1, giorni_al_target: -1 }),
    );
    expect(pickMorningHighlights(rows, 3)).toHaveLength(3);
  });

  it("cableLevers décompose les gestes à faire", () => {
    expect(cableLevers(row({ perimetro: "INAV 2", tot_cavi: 16, posati: 16, collegati: 14 }))).toEqual({
      daPosare: 0,
      daCollegare: 2,
    });
    expect(cableLevers(row({ perimetro: "DDS", tot_cavi: 19, posati: 18, collegati: 17 }))).toEqual({
      daPosare: 1,
      daCollegare: 1,
    });
  });

  it("describeHighlight rend une puce lisible avec retard et bloccati", () => {
    const s = describeHighlight(
      row({
        perimetro: "INAV 2",
        tot_cavi: 16,
        posati: 16,
        collegati: 14,
        da_completare: 2,
        pronto_coll: 2,
        bloccati: 1,
        giorni_al_target: -78,
      }),
    );
    expect(s).toBe("INAV 2 — 2 pronti da collegare · in ritardo di 78 g · 1 bloccati");
  });

  it("describeHighlight garde le bucket dominant da_sistemare", () => {
    const s = describeHighlight(
      row({
        perimetro: "DDS",
        tot_cavi: 19,
        posati: 18,
        collegati: 17,
        da_completare: 2,
        da_posare: 1,
        da_sistemare: 1,
        giorni_al_target: -75,
      }),
    );
    expect(s).toBe("DDS — 1 da posare · in ritardo di 75 g");
  });

  it("describeHighlight décrit un bucket da_sistemare", () => {
    const s = describeHighlight(
      row({
        perimetro: "INAV",
        da_completare: 8,
        da_sistemare: 8,
        coll_parziale: 3,
        giorni_al_target: -23,
      }),
    );
    expect(s).toBe("INAV — 8 da sistemare · in ritardo di 23 g");
  });

  it("describeHighlight décrit les collegamenti parziali en da finire", () => {
    const s = describeHighlight(
      row({
        perimetro: "LRAS",
        da_completare: 1,
        coll_parziale: 1,
        giorni_al_target: -20,
      }),
    );
    expect(s).toBe("LRAS — 1 da finire · in ritardo di 20 g");
  });

  it("buildMorningSentence: cas nominal, complet, vide", () => {
    expect(buildMorningSentence([])).toBe("Nessun perimetro nel baseline INCA attivo.");
    expect(buildMorningSentence([row({ perimetro: "A", da_completare: 0, pct_posa: 100 })])).toBe(
      "Tutti i perimetri sono completi. Niente da chiudere oggi.",
    );
    const s = buildMorningSentence([
      row({
        perimetro: "INAV 2",
        tot_cavi: 16,
        posati: 16,
        collegati: 14,
        da_completare: 2,
        pronto_coll: 2,
        giorni_al_target: -78,
      }),
    ]);
    expect(s).toContain("Da chiudere:");
    expect(s).toContain("INAV 2 — 2 pronti da collegare");
  });
});
