import Link from "next/link";
import type { PillarSummary } from "@/server/queries/overview";
import { QUARTERS } from "@/lib/domain";

/** Ambities 2027 per pijler × kwartaal. Lege cellen tonen "Nog in te vullen" (nooit verzonnen). */
export function QuarterMatrix({ pillars, year = 2027 }: { pillars: PillarSummary[]; year?: number }) {
  const filled = pillars.reduce((n, p) => n + QUARTERS.filter((q) => p[`ambition_${q}`]).length, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-[3px] text-[13px]">
        <caption className="sr-only">Ambities {year} per pijler en kwartaal ({filled} van {pillars.length * 4} ingevuld)</caption>
        <thead><tr>
          <th scope="col" className="w-[22%] px-2 py-1 text-left text-[12px] font-medium text-muted">Pijler</th>
          {QUARTERS.map((q, i) => (
            <th key={q} scope="col" className="rounded-md bg-surface-muted px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wide text-muted">Q{i + 1} {year}</th>
          ))}
        </tr></thead>
        <tbody>{pillars.map((p) => (
          <tr key={p.id}>
            <th scope="row" className="rounded-md px-2 py-2 text-left align-top font-medium" style={{ boxShadow: `inset 4px 0 0 var(--pillar-${p.number})` }}>
              <Link href={`/pijlers/detail?nr=${p.number}`} className="block pl-2 hover:text-primary hover:underline">
                <span className="num text-muted">{p.number}.</span> {p.short_title ?? p.title}
              </Link>
            </th>
            {QUARTERS.map((q, i) => {
              const v = p[`ambition_${q}`];
              return (
                <td key={q} className={`rounded-md px-3 py-2 align-top ${v ? "bg-primary-soft/70" : "border border-dashed border-line"}`}>
                  {v ? <span className="line-clamp-4 whitespace-pre-line" title={v}>{v}</span>
                    : <span className="text-[12px] text-subtle" aria-label={`Q${i + 1}: nog in te vullen`}>Nog in te vullen</span>}
                </td>
              );
            })}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
