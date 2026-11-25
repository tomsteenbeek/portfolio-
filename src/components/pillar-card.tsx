import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PillarSummary } from "@/server/queries/overview";

function Meter({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[12px] text-muted"><span>{label}</span><span className="num">{value}/{total}</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line" role="img" aria-label={`${label}: ${value} van ${total}`}>
        <span className="block h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PillarCard({ p }: { p: PillarSummary }) {
  return (
    <Link href={`/pijlers/detail?nr=${p.number}`} className="group flex flex-col rounded-lg border border-line bg-surface p-5 shadow-card transition-colors hover:border-primary">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-primary">Pijler {p.number}</div>
        <ArrowUpRight aria-hidden className="h-4 w-4 text-subtle group-hover:text-primary" />
      </div>
      <h3 className="mt-1 text-[17px] font-semibold leading-snug">{p.title}</h3>
      <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-muted">{p.objective}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
        <div><dt className="text-[11px] text-muted">Onderwerpen</dt><dd className="num text-xl font-semibold">{p.topics}</dd></div>
        <div><dt className="text-[11px] text-muted">KPI&apos;s</dt><dd className="num text-xl font-semibold">{p.kpis}</dd></div>
        <div><dt className="text-[11px] text-muted">Projecten</dt><dd className="num text-xl font-semibold">{p.projects_total}</dd></div>
      </dl>
      <div className="mt-4 space-y-2.5">
        <Meter label="Onderwerpen met eigenaar" value={p.topics_with_owner} total={p.topics} />
        <Meter label="Onderwerpen beschreven" value={p.topics_described} total={p.topics} />
      </div>
      {p.projects_running > 0 && <p className="mt-3 text-[12px] text-muted">{p.projects_running} project(en) in uitvoering</p>}
    </Link>
  );
}
