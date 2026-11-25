/** Nederlandse notatie; ontbrekende waarden tonen we expliciet als onbekend. */
export const UNKNOWN = "Onbekend";
export const NOT_ASSESSED = "Nog niet beoordeeld";

const nf = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const eur = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
// Vaste tijdzone: server en browser formatteren identiek (voorkomt hydratieverschillen).
const TZ = "Europe/Amsterdam";
const df = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
const dtf = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });

const isNil = (v: unknown): v is null | undefined => v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));

export function fmtNumber(v: number | null | undefined, fallback = UNKNOWN) {
  return isNil(v) ? fallback : nf.format(v);
}
export function fmtInt(v: number | null | undefined, fallback = UNKNOWN) {
  return isNil(v) ? fallback : nf0.format(v);
}
export function fmtEuro(v: number | null | undefined, fallback = UNKNOWN) {
  return isNil(v) ? fallback : eur.format(v);
}
export function fmtHours(v: number | null | undefined, fallback = UNKNOWN) {
  return isNil(v) ? fallback : `${nf0.format(v)} uur`;
}
export function fmtFte(v: number | null | undefined, fallback = UNKNOWN) {
  return isNil(v) ? fallback : `${new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(v)} fte`;
}
export function fmtPct(v: number | null | undefined, fallback = UNKNOWN) {
  return isNil(v) ? fallback : `${nf0.format(v)}%`;
}
function toDate(v: string | Date) {
  if (v instanceof Date) return v;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00Z`) : new Date(v);
}
export function fmtDate(v: string | Date | null | undefined, fallback = "—") {
  return v ? df.format(toDate(v)) : fallback;
}
export function fmtDateTime(v: string | Date | null | undefined, fallback = "—") {
  return v ? dtf.format(toDate(v)) : fallback;
}
