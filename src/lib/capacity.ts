/**
 * Capaciteitsmodel. Alle percentages worden over contracturen berekend en
 * slechts éénmaal afgetrokken (geen dubbeltelling).
 */
export type CapacityAssumptions = {
  uren_per_fte_per_jaar: number;
  vakantie_en_verlof_pct: number;
  feestdagen_uren_per_fte: number;
  verwachte_afwezigheid_pct: number;
  overleg_pct: number;
  opleiding_pct: number;
  incidenten_onvoorzien_pct: number;
  managementtaken_pct: number;
};

export type CapacityBreakdown = {
  contracturen: number;
  verlof: number;
  feestdagen: number;
  afwezigheid: number;
  overleg: number;
  opleiding: number;
  nietInzetbaar: number;
  netto: number;
  incidenten: number;
  management: number;
  regulier: number;
  verandercapaciteit: number;
};

/** Capaciteit voor een aantal FTE over een fractie van het jaar (1 = jaar, 0.25 = kwartaal). */
export function capacityFor(fte: number, a: CapacityAssumptions, regulierUren = 0, yearFraction = 1): CapacityBreakdown {
  if (fte < 0) throw new RangeError("FTE kan niet negatief zijn");
  const contracturen = fte * a.uren_per_fte_per_jaar * yearFraction;
  const pct = (p: number) => (contracturen * p) / 100;
  const verlof = pct(a.vakantie_en_verlof_pct);
  const feestdagen = fte * a.feestdagen_uren_per_fte * yearFraction;
  const afwezigheid = pct(a.verwachte_afwezigheid_pct);
  const overleg = pct(a.overleg_pct);
  const opleiding = pct(a.opleiding_pct);
  const nietInzetbaar = verlof + feestdagen + afwezigheid + overleg + opleiding;
  const netto = Math.max(0, contracturen - nietInzetbaar);
  const incidenten = pct(a.incidenten_onvoorzien_pct);
  const management = pct(a.managementtaken_pct);
  const verandercapaciteit = netto - regulierUren - incidenten - management;
  return { contracturen, verlof, feestdagen, afwezigheid, overleg, opleiding, nietInzetbaar, netto, incidenten, management, regulier: regulierUren, verandercapaciteit };
}

/** Capaciteitstekort = benodigd − beschikbaar (positief = tekort). */
export function shortage(required: number | null, available: number | null): number | null {
  if (required === null || available === null) return null;
  return required - available;
}

/** Netto uren per FTE per jaar (voor omrekening tekort → extra FTE). */
export function nettoPerFte(a: CapacityAssumptions) {
  return capacityFor(1, a).netto;
}

export function extraFteNeeded(shortageHours: number | null, a: CapacityAssumptions, yearFraction = 1) {
  if (shortageHours === null) return null;
  if (shortageHours <= 0) return 0;
  return shortageHours / (nettoPerFte(a) * yearFraction);
}

export function loadStatus(required: number, available: number): "Overbelast" | "Krap" | "In balans" | "Onderbenut" | "Onbekend" {
  if (available <= 0) return required > 0 ? "Overbelast" : "Onbekend";
  const r = required / available;
  if (r > 1.05) return "Overbelast";
  if (r > 0.9) return "Krap";
  if (r >= 0.6) return "In balans";
  return "Onderbenut";
}

/** Uren per jaar voor structurele werkzaamheden. */
export function recurringHoursPerYear(hoursPerOccurrence: number | null, occurrencesPerYear: number | null, explicit: number | null) {
  if (explicit !== null && explicit !== undefined) return explicit;
  if (hoursPerOccurrence === null || occurrencesPerYear === null) return null;
  return hoursPerOccurrence * occurrencesPerYear;
}

export const FREQUENCY_PER_YEAR: Record<string, number | null> = {
  Dagelijks: 220,
  Wekelijks: 46,
  Maandelijks: 12,
  "Per kwartaal": 4,
  Halfjaarlijks: 2,
  Jaarlijks: 1,
  Doorlopend: null,
  "Ad hoc": null,
};
