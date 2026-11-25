import { describe, expect, it } from "vitest";
import { summarize } from "@/lib/stats";
import { effectiveQuadrant, feasibilityScore, quadrant } from "@/lib/feasibility";
import { capacityFor, extraFteNeeded, shortage, type CapacityAssumptions } from "@/lib/capacity";

describe("statistiek", () => {
  it("gemiddelde, mediaan, spreiding", () => {
    const s = summarize([60, 70, 80, 90]);
    expect(s.mean).toBe(75);
    expect(s.median).toBe(75);
    expect(s.min).toBe(60);
    expect(s.max).toBe(90);
    expect(s.range).toBe(30);
    expect(s.stdev).toBeCloseTo(11.18, 2);
    expect(s.agreement).toBe("Redelijk eens");
  });
  it("detecteert sterke onenigheid", () => {
    expect(summarize([10, 90, 20, 95]).agreement).toBe("Sterk oneens");
    expect(summarize([70, 72, 74]).agreement).toBe("Sterk eens");
  });
  it("lege set is onbekend, niet nul", () => {
    expect(summarize([]).mean).toBeNull();
  });
});

describe("haalbaarheid", () => {
  it("score = gemiddelde × 20", () => {
    expect(feasibilityScore({ capacity: 5, expertise: 5, budget: 5, technical_complexity: 5, organizational_complexity: 5, dependencies: 5, readiness: 5 })).toBe(100);
    expect(feasibilityScore({ capacity: 2 })).toBeNull();
  });
  it("kwadranten", () => {
    expect(quadrant(85, 70)).toBe("Direct oppakken");
    expect(quadrant(85, 20)).toBe("Randvoorwaarden organiseren");
    expect(quadrant(30, 70)).toBe("Mogelijke quick win");
    expect(quadrant(30, 20)).toBe("Uitstellen of heroverwegen");
  });
  it("acuut risico verdwijnt niet door lage haalbaarheid", () => {
    expect(effectiveQuadrant(30, 20, true)).toBe("Randvoorwaarden organiseren");
  });
});

describe("capaciteit", () => {
  const a: CapacityAssumptions = {
    uren_per_fte_per_jaar: 1872, vakantie_en_verlof_pct: 10, feestdagen_uren_per_fte: 57.6,
    verwachte_afwezigheid_pct: 5, overleg_pct: 10, opleiding_pct: 5, incidenten_onvoorzien_pct: 10, managementtaken_pct: 0,
  };
  it("netto = contracturen − niet-inzetbaar, zonder dubbele aftrek", () => {
    const c = capacityFor(1, a, 200);
    expect(c.contracturen).toBe(1872);
    expect(c.nietInzetbaar).toBeCloseTo(1872 * 0.3 + 57.6, 5);
    expect(c.netto).toBeCloseTo(1872 - (1872 * 0.3 + 57.6), 5);
    expect(c.verandercapaciteit).toBeCloseTo(c.netto - 200 - 187.2, 5);
  });
  it("tekort en extra fte", () => {
    expect(shortage(1000, 600)).toBe(400);
    expect(shortage(null, 600)).toBeNull();
    expect(extraFteNeeded(-5, a)).toBe(0);
    expect(extraFteNeeded(capacityFor(1, a).netto, a)).toBeCloseTo(1, 10);
  });
});
