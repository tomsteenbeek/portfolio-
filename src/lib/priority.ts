/**
 * Prioriteringslogica (puur, zonder I/O) zodat berekeningen reproduceerbaar
 * en testbaar zijn.  PriorityScore = Σ (score / 5 × gewicht), max 100.
 */
export type Category = "P1" | "P2" | "P3" | "P4";
export type Criterion = { id: string; code: string; name: string; weight: number };
export type ScoreMap = Record<string, number | null | undefined>; // criterionId -> 0..5

export const MAX_SCORE = 5;

export function validateWeights(weights: number[]): { ok: boolean; sum: number } {
  const sum = Math.round(weights.reduce((a, b) => a + b, 0) * 100) / 100;
  return { ok: sum === 100 && weights.every((w) => w >= 0), sum };
}

/** Geeft null terug wanneer niet alle criteria zijn gescoord (onvolledig ≠ 0). */
export function priorityScore(criteria: Criterion[], scores: ScoreMap): number | null {
  let total = 0;
  for (const c of criteria) {
    const s = scores[c.id];
    if (s === null || s === undefined) return null;
    if (!Number.isInteger(s) || s < 0 || s > MAX_SCORE) throw new RangeError(`Score voor ${c.name} moet 0 t/m 5 zijn`);
    total += (s / MAX_SCORE) * c.weight;
  }
  return total;
}

/** Classificatie op basis van de ongeronde score. */
export function categorize(score: number): Category {
  if (score < 0 || score > 100.0000001) throw new RangeError("Score buiten bereik 0–100");
  if (score >= 80) return "P1";
  if (score >= 60) return "P2";
  if (score >= 40) return "P3";
  return "P4";
}

export const CATEGORY_LABELS: Record<Category, string> = {
  P1: "P1 – Hoogste prioriteit",
  P2: "P2 – Hoge prioriteit",
  P3: "P3 – Gemiddelde prioriteit",
  P4: "P4 – Lage prioriteit",
};

export type Flags = {
  flag_legal?: boolean;
  flag_hard_deadline?: boolean;
  flag_acute_risk?: boolean;
  flag_admin_decided?: boolean;
  flag_critical_dependency?: boolean;
};

export const FLAG_LABELS: Record<keyof Flags, string> = {
  flag_legal: "Wettelijk verplicht",
  flag_hard_deadline: "Harde deadline",
  flag_acute_risk: "Acuut continuïteitsrisico",
  flag_admin_decided: "Bestuurlijk vastgesteld",
  flag_critical_dependency: "Kritische afhankelijkheid",
};

export function activeFlags(f: Flags): string[] {
  return (Object.keys(FLAG_LABELS) as (keyof Flags)[]).filter((k) => f[k]).map((k) => FLAG_LABELS[k]);
}

/** Verplichte/urgente initiatieven mogen niet uitsluitend op basis van score worden uitgesloten. */
export function isProtected(f: Flags): boolean {
  return Boolean(f.flag_legal || f.flag_hard_deadline || f.flag_acute_risk || f.flag_admin_decided);
}

/** Een afwijking van de consensus vereist motivering (min. 10 tekens; gelijk aan DB-constraint). */
export function requiresDeviationRationale(consensus: Category | null, final: Category) {
  return consensus !== null && consensus !== final;
}
