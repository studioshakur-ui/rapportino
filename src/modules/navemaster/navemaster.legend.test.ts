import { describe, expect, it } from "vitest";
import {
  resolveNavemasterStateLegend,
  resolveNavemasterSituationLegend,
  resolveNavemasterTechnicalLegend,
  translateIncaLegendStatus,
} from "./navemaster.legend";

describe("Navemaster legend separation", () => {
  it("keeps INCA translation explicit and separate from Navemaster codes", () => {
    expect(translateIncaLegendStatus("P").status).toBe("POSATO");
    expect(translateIncaLegendStatus("B").status).toBe("BLOCCATO");
  });

  it("resolves Navemaster situation and technical legends independently", () => {
    expect(resolveNavemasterSituationLegend("P")).toBeNull();
    expect(resolveNavemasterTechnicalLegend("C")?.code).toBe("C");
  });

  it("resolves Navemaster state legend without implying INCA meaning", () => {
    expect(resolveNavemasterStateLegend("P")?.label).toBe("Installed");
    expect(resolveNavemasterStateLegend("B")?.label).toBe("Blocked");
  });
});
