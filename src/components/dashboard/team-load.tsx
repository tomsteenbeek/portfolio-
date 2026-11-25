import Link from "next/link";
import type { TeamMember } from "@/server/queries/team";

/** Per teamlid: aantal onderwerpen als eigenaar en aantal open projecten als trekker (zelfde schaal: aantallen). */
export function TeamLoad({ team }: { team: TeamMember[] }) {
  const rows = team.filter((m) => m.is_active && m.topics + m.projects > 0).sort((a, b) => b.topics + b.projects - (a.topics + a.projects));
  const max = Math.max(1, ...rows.map((m) => m.topics + m.projects));
  if (!rows.length) return <p className="px-5 py-6 text-sm text-muted">Nog geen eigenaren of trekkers toegewezen. Wijs ze toe bij onderwerpen en projecten.</p>;
  return (
    <div className="px-5 pb-4">
      <ul className="mb-3 flex gap-4 text-[12px] text-muted">
        <li className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--chart-1)]" aria-hidden />Onderwerpen (eigenaar)</li>
        <li className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--chart-2)]" aria-hidden />Projecten (trekker)</li>
      </ul>
      <ul className="space-y-1.5">{rows.map((m) => (
        <li key={m.id} className="grid grid-cols-[minmax(0,11rem)_1fr_3.5rem] items-center gap-3 text-[13px]">
          <span className="truncate" title={m.function_title ?? undefined}>{m.name}</span>
          <span className="flex h-3 gap-[2px]" role="img" aria-label={`${m.name}: ${m.topics} onderwerpen, ${m.projects} projecten`}>
            {m.topics > 0 && <span title={`${m.topics} onderwerpen`} className="h-full rounded-l-[4px] bg-[var(--chart-1)] last:rounded-r-[4px]" style={{ width: `${(m.topics / max) * 100}%` }} />}
            {m.projects > 0 && <span title={`${m.projects} projecten`} className="h-full rounded-r-[4px] bg-[var(--chart-2)] first:rounded-l-[4px]" style={{ width: `${(m.projects / max) * 100}%` }} />}
          </span>
          <span className="num text-right text-muted">{m.topics} · {m.projects}</span>
        </li>
      ))}</ul>
      <Link href="/team" className="mt-3 inline-block text-[13px] text-primary hover:underline">Naar het team</Link>
    </div>
  );
}
