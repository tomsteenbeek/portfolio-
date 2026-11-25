"use client";
import type { Criterion } from "@/server/queries/priority";
import { categorize, priorityScore } from "@/lib/priority";
import { PriorityBadge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";

/** Scoreraster 0–5 per criterium met specifieke rubric-uitleg. */
export function ScoreInput({ criteria, value, onChange, idPrefix, disabled, large }: {
  criteria: Criterion[]; value: Record<string, number | null>; onChange: (v: Record<string, number | null>) => void; idPrefix: string; disabled?: boolean; large?: boolean;
}) {
  const total = priorityScore(criteria, value);
  return (
    <div className="space-y-3">
      {criteria.map((c) => {
        const sel = value[c.id];
        return (
          <fieldset key={c.id} className="rounded-md border border-line p-3">
            <legend className="px-1">
              <span className={cn("font-medium", large ? "text-[16px]" : "text-[14px]")}>{c.name}</span>
              <span className="ml-2 num text-[12px] text-muted">gewicht {c.weight}%</span>
            </legend>
            <div className="mt-1 grid grid-cols-6 gap-1" role="radiogroup" aria-label={c.name}>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <label key={n} title={c.rubric[n]}
                  className={cn("grid cursor-pointer place-items-center rounded border border-line py-1.5 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus-ring)]",
                    sel === n ? "border-primary bg-primary text-white" : "hover:bg-surface-muted", disabled && "cursor-not-allowed opacity-60")}>
                  <input type="radio" className="sr-only" name={`${idPrefix}-${c.id}`} value={n} checked={sel === n} disabled={disabled}
                    onChange={() => onChange({ ...value, [c.id]: n })} aria-describedby={`${idPrefix}-${c.id}-help`} />
                  {n}
                </label>
              ))}
            </div>
            <p id={`${idPrefix}-${c.id}-help`} className="mt-1.5 min-h-[1.25rem] text-[12px] text-muted">
              {sel === null || sel === undefined ? (c.description ?? "Kies een score; beweeg over een score voor de uitleg.") : <><strong className="text-ink">{sel}:</strong> {c.rubric[sel]}</>}
            </p>
          </fieldset>
        );
      })}
      <div className="flex items-center justify-between rounded-md bg-surface-muted px-3 py-2 text-sm" aria-live="polite">
        <span>Berekende score</span>
        {total === null ? <span className="text-muted">Nog niet alle criteria gescoord</span> : (
          <span className="flex items-center gap-2"><span className="num font-semibold">{total.toFixed(1).replace(".", ",")}</span><PriorityBadge category={categorize(total)} /></span>
        )}
      </div>
    </div>
  );
}

export function RubricTable({ criteria }: { criteria: Criterion[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-[13px]">
        <caption className="sr-only">Uitleg scores per criterium</caption>
        <thead className="bg-surface-muted text-left text-muted">
          <tr><th className="p-2">Criterium</th><th className="p-2">Gewicht</th>{[0, 1, 2, 3, 4, 5].map((n) => <th key={n} className="p-2">Score {n}</th>)}</tr>
        </thead>
        <tbody>
          {criteria.map((c) => (
            <tr key={c.id} className="border-t border-line align-top">
              <th scope="row" className="p-2 text-left font-medium">{c.name}<p className="font-normal text-muted">{c.description}</p></th>
              <td className="num p-2">{c.weight}%</td>
              {c.rubric.map((r, i) => <td key={i} className="p-2">{r}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
