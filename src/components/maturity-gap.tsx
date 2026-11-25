import Link from "next/link";
import { MATURITY_LABELS } from "@/components/ui/badge";

/** Maturity gap: per onderwerp huidig → gewenst niveau op één schaal (1–5). */
export function MaturityGap({ rows }: { rows: { id: string; code: string; title: string; current: number | null; target: number | null }[] }) {
  const assessed = rows.filter((r) => r.current && r.target);
  const missing = rows.length - assessed.length;
  if (!assessed.length) return <p className="text-sm text-muted">Nog geen volwassenheid beoordeeld{rows.length ? ` (0 van ${rows.length} onderwerpen)` : ""}. Leg niveaus vast via de deepdive of het onderwerp.</p>;
  const pos = (l: number) => `${((l - 1) / 4) * 100}%`;
  const sorted = [...assessed].sort((a, b) => b.target! - b.current! - (a.target! - a.current!));
  const avgC = assessed.reduce((s, r) => s + r.current!, 0) / assessed.length;
  const avgT = assessed.reduce((s, r) => s + r.target!, 0) / assessed.length;
  return (
    <div>
      <p className="mb-3 text-[13px] text-muted num">Gemiddeld huidig {avgC.toFixed(1).replace(".", ",")} → gewenst {avgT.toFixed(1).replace(".", ",")} · {assessed.length} beoordeeld{missing ? `, ${missing} nog niet beoordeeld` : ""}</p>
      <div className="mb-1 grid grid-cols-[minmax(140px,280px)_1fr] gap-3 text-[11px] text-muted">
        <span />
        <div className="relative h-4">{[1, 2, 3, 4, 5].map((l) => <span key={l} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: pos(l) }}>{l} {MATURITY_LABELS[l]}</span>)}</div>
      </div>
      <ul className="space-y-1.5">
        {sorted.map((r) => (
          <li key={r.id} className="grid grid-cols-[minmax(140px,280px)_1fr] items-center gap-3 text-[13px]">
            <Link href={`/onderwerpen/detail?id=${r.id}&tab=volwassenheid`} className="truncate hover:text-primary hover:underline"><span className="num text-muted">{r.code}</span> {r.title}</Link>
            <div className="relative h-5" role="img" aria-label={`${r.code}: huidig ${r.current}, gewenst ${r.target}, gap ${r.target! - r.current!}`}>
              <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
              <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-[var(--chart-1)] opacity-30" style={{ left: pos(Math.min(r.current!, r.target!)), width: `${(Math.abs(r.target! - r.current!) / 4) * 100}%` }} />
              <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--chart-1)] bg-surface" style={{ left: pos(r.current!) }} title={`Huidig ${r.current}`} />
              <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--chart-1)] ring-2 ring-surface" style={{ left: pos(r.target!) }} title={`Gewenst ${r.target}`} />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-4 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-[var(--chart-1)]" />Huidig</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[var(--chart-1)]" />Gewenst</span>
      </div>
    </div>
  );
}
