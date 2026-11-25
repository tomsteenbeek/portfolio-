export type Summary = {
  n: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  stdev: number | null;
  range: number | null;
  agreement: "Sterk eens" | "Redelijk eens" | "Verdeeld" | "Sterk oneens" | "Onvoldoende beoordelingen";
};

export function summarize(values: number[]): Summary {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const n = v.length;
  if (n === 0) return { n, mean: null, median: null, min: null, max: null, stdev: null, range: null, agreement: "Onvoldoende beoordelingen" };
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  const stdev = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / n); // populatie-standaardafwijking
  const range = v[n - 1] - v[0];
  return { n, mean, median, min: v[0], max: v[n - 1], stdev, range, agreement: agreementLevel(n, stdev, range) };
}

/** Drempels op een 0–100 schaal. Spreiding > 20 punten of range ≥ 40 = sterk oneens. */
export function agreementLevel(n: number, stdev: number, range: number): Summary["agreement"] {
  if (n < 2) return "Onvoldoende beoordelingen";
  if (stdev <= 7.5 && range <= 20) return "Sterk eens";
  if (stdev <= 12.5) return "Redelijk eens";
  if (stdev <= 20 && range < 40) return "Verdeeld";
  return "Sterk oneens";
}
