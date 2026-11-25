import Link from "next/link";
import { ArrowUpRight, FolderKanban, Target, Table2 } from "lucide-react";
import type { PillarSummary } from "@/server/queries/overview";
import { OwnershipBar, ownershipOf } from "@/components/dashboard/ownership";

/** Ring met het aandeel onderwerpen dat een eigenaar uit het team heeft. */
function Ring({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total ? value / total : 0;
  const r = 22, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0" role="img" aria-label={`${Math.round(pct * 100)}% van de onderwerpen heeft een eigenaar`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${pct * c} ${c}`} transform="rotate(-90 28 28)" />
      <text x="28" y="31" textAnchor="middle" className="num" fontSize="13" fontWeight="600" fill="var(--text)">{Math.round(pct * 100)}%</text>
    </svg>
  );
}

export function PillarCard({ p }: { p: PillarSummary }) {
  const color = `var(--pillar-${p.number})`;
  const own = ownershipOf(p);
  return (
    <Link href={`/pijlers/detail?nr=${p.number}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface p-5 pt-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: color }} aria-hidden />
      <div className="flex items-start gap-3">
        <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[17px] font-bold text-white" style={{ background: color }} aria-hidden>{p.number}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Pijler {p.number}</div>
          <h3 className="text-[16px] font-semibold leading-snug group-hover:text-primary">{p.title}</h3>
        </div>
        <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0 text-subtle group-hover:text-primary" />
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">{p.objective}</p>
      <div className="mt-auto pt-4">
        <div className="flex items-center gap-3">
          <Ring value={own.person} total={p.topics} color={color} />
          <div className="min-w-0 text-[12px] leading-snug text-muted">
            <div className="font-medium text-ink">Eigenaarschap</div>
            <div className="num">{own.person} van {p.topics} toegewezen</div>
            {own.capacity + own.none > 0 && <div className="num">{own.capacity + own.none} zonder capaciteit/persoon</div>}
          </div>
        </div>
        <div className="mt-2.5"><OwnershipBar c={own} label={`Pijler ${p.number}`} /></div>
      </div>
      <dl className="mt-4 grid grid-cols-3 border-t border-line pt-3 text-center">
        <div><dt className="flex items-center justify-center gap-1 text-[11px] text-muted"><Table2 className="h-3.5 w-3.5" aria-hidden />Onderwerpen</dt><dd className="num text-xl font-semibold">{p.topics}</dd></div>
        <div title={`${p.projects_running} in uitvoering`}><dt className="flex items-center justify-center gap-1 text-[11px] text-muted"><FolderKanban className="h-3.5 w-3.5" aria-hidden />Projecten</dt><dd className="num text-xl font-semibold">{p.projects_total}</dd></div>
        <div><dt className="flex items-center justify-center gap-1 text-[11px] text-muted"><Target className="h-3.5 w-3.5" aria-hidden />KPI&apos;s</dt><dd className="num text-xl font-semibold">{p.kpis}</dd></div>
      </dl>
    </Link>
  );
}
