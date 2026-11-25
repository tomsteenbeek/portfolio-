import { describe, expect, it } from "vitest";
import { categorize, isProtected, priorityScore, requiresDeviationRationale, validateWeights } from "@/lib/priority";

const criteria = [
  { id: "wet", code: "WET", name: "Wet", weight: 20 },
  { id: "risico", code: "RISICO", name: "Risico", weight: 25 },
  { id: "strat", code: "STRAT", name: "Strategie", weight: 20 },
  { id: "dienst", code: "DIENST", name: "Dienst", weight: 15 },
  { id: "eff", code: "EFF", name: "Efficiency", weight: 10 },
  { id: "rand", code: "RAND", name: "Rand", weight: 10 },
];

describe("prioriteringsmodel", () => {
  it("standaardgewichten tellen op tot 100", () => {
    expect(validateWeights(criteria.map((c) => c.weight))).toEqual({ ok: true, sum: 100 });
    expect(validateWeights([50, 49]).ok).toBe(false);
  });
  it("maximale score is 100", () => {
    const s = Object.fromEntries(criteria.map((c) => [c.id, 5]));
    expect(priorityScore(criteria, s)).toBe(100);
  });
  it("berekent gewogen score", () => {
    // 4/5*20 + 5/5*25 + 3/5*20 + 2/5*15 + 1/5*10 + 0 = 16+25+12+6+2 = 61
    const s = { wet: 4, risico: 5, strat: 3, dienst: 2, eff: 1, rand: 0 };
    expect(priorityScore(criteria, s)).toBeCloseTo(61, 10);
  });
  it("onvolledige beoordeling geeft null, geen nul", () => {
    expect(priorityScore(criteria, { wet: 5 })).toBeNull();
  });
  it("weigert scores buiten 0..5", () => {
    expect(() => priorityScore(criteria, { wet: 6, risico: 0, strat: 0, dienst: 0, eff: 0, rand: 0 })).toThrow();
  });
  it("classificeert op ongeronde score", () => {
    expect(categorize(100)).toBe("P1");
    expect(categorize(80)).toBe("P1");
    expect(categorize(79.999)).toBe("P2");
    expect(categorize(60)).toBe("P2");
    expect(categorize(59.6)).toBe("P3"); // afgerond 60, maar ongerond P3
    expect(categorize(40)).toBe("P3");
    expect(categorize(39.99)).toBe("P4");
    expect(categorize(0)).toBe("P4");
  });
  it("verplichte initiatieven zijn beschermd", () => {
    expect(isProtected({ flag_legal: true })).toBe(true);
    expect(isProtected({ flag_critical_dependency: true })).toBe(false);
  });
  it("afwijking van consensus vereist motivering", () => {
    expect(requiresDeviationRationale("P2", "P1")).toBe(true);
    expect(requiresDeviationRationale("P2", "P2")).toBe(false);
    expect(requiresDeviationRationale(null, "P3")).toBe(false);
  });
});
