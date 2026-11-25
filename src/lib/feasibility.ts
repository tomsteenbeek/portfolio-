/**
 * Haalbaarheid: zeven dimensies, elk 0..5 waarbij 5 = gunstig (veel capaciteit,
 * expertise of budget beschikbaar; lage complexiteit; weinig afhankelijkheden;
 * organisatie gereed). Score = gemiddelde × 20 (0–100).
 */
export const FEASIBILITY_DIMENSIONS = [
  { key: "capacity", label: "Beschikbaarheid interne capaciteit", low: "Geen capaciteit", high: "Ruim beschikbaar" },
  { key: "expertise", label: "Beschikbaarheid expertise", low: "Expertise ontbreekt", high: "Volledig aanwezig" },
  { key: "budget", label: "Beschikbaarheid budget", low: "Geen budget", high: "Budget geborgd" },
  { key: "technical_complexity", label: "Technische complexiteit", low: "Zeer complex", high: "Eenvoudig" },
  { key: "organizational_complexity", label: "Organisatorische complexiteit", low: "Zeer complex", high: "Eenvoudig" },
  { key: "dependencies", label: "Afhankelijkheden", low: "Veel kritieke afhankelijkheden", high: "Geen afhankelijkheden" },
  { key: "readiness", label: "Gereedheid van de organisatie", low: "Niet gereed", high: "Volledig gereed" },
] as const;

export type FeasibilityKey = (typeof FEASIBILITY_DIMENSIONS)[number]["key"];
export type FeasibilityInput = Partial<Record<FeasibilityKey, number | null>>;

export function feasibilityScore(input: FeasibilityInput): number | null {
  const vals = FEASIBILITY_DIMENSIONS.map((d) => input[d.key]);
  if (vals.some((v) => v === null || v === undefined)) return null;
  return ((vals as number[]).reduce((a, b) => a + b, 0) / vals.length) * 20;
}

export type Quadrant = "Direct oppakken" | "Randvoorwaarden organiseren" | "Mogelijke quick win" | "Uitstellen of heroverwegen";

export function quadrant(priority: number, feasibility: number, pThreshold = 60, fThreshold = 50): Quadrant {
  const hp = priority >= pThreshold;
  const hf = feasibility >= fThreshold;
  if (hp && hf) return "Direct oppakken";
  if (hp && !hf) return "Randvoorwaarden organiseren";
  if (!hp && hf) return "Mogelijke quick win";
  return "Uitstellen of heroverwegen";
}

/**
 * Acute risico's en verplichte initiatieven verdwijnen nooit door lage
 * haalbaarheid: zij worden naar 'Randvoorwaarden organiseren' geleid.
 */
export function effectiveQuadrant(priority: number, feasibility: number, isProtected: boolean, pT = 60, fT = 50): Quadrant {
  const q = quadrant(priority, feasibility, pT, fT);
  if (isProtected && q === "Uitstellen of heroverwegen") return "Randvoorwaarden organiseren";
  return q;
}
