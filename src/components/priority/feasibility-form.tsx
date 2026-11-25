"use client";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { FEASIBILITY_DIMENSIONS } from "@/lib/feasibility";
import { saveFeasibility } from "@/server/actions/priority";
import { fmtDateTime } from "@/lib/format";

export function FeasibilityForm({ topicId, projectId, latest, canEdit }: {
  topicId?: string; projectId?: string; latest: Record<string, unknown> | null; canEdit: boolean;
}) {
  return (
    <ActionForm action={saveFeasibility} success="Haalbaarheid vastgelegd" className="space-y-4">
      {topicId && <input type="hidden" name="topic_id" value={topicId} />}
      {projectId && <input type="hidden" name="project_id" value={projectId} />}
      <p className="text-[13px] text-muted">
        Score 0–5 per dimensie, waarbij 5 = gunstig. Totaal = gemiddelde × 20. Haalbaarheid bepaalt nooit of een verplicht initiatief of acuut risico uit het portfolio verdwijnt.
        {latest?.assessed_at ? ` Laatste beoordeling: ${fmtDateTime(String(latest.assessed_at))}, totaal ${latest.total_score === null ? "onvolledig" : Math.round(Number(latest.total_score))}.` : " Nog niet beoordeeld."}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {FEASIBILITY_DIMENSIONS.map((d) => (
          <fieldset key={d.key} className="rounded-md border border-line p-2.5">
            <legend className="px-1 text-[13px] font-medium">{d.label}</legend>
            <div className="flex items-center gap-1" role="radiogroup" aria-label={d.label}>
              <span className="w-24 text-[11px] text-muted">{d.low}</span>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="grid h-8 w-8 cursor-pointer place-items-center rounded border border-line text-[13px] has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus-ring)]">
                  <input type="radio" name={d.key} value={n} className="sr-only" defaultChecked={latest?.[d.key] === n} disabled={!canEdit} aria-label={`${d.label}: ${n}`} />
                  {n}
                </label>
              ))}
              <span className="w-24 pl-1 text-[11px] text-muted">{d.high}</span>
            </div>
          </fieldset>
        ))}
      </div>
      <fieldset>
        <legend className="mb-1 text-[13px] font-medium">Blokkerend tekort (initiatief is noodzakelijk maar niet uitvoerbaar door ontbrekende…)</legend>
        <div className="flex flex-wrap gap-4">
          <Checkbox name="blocking_capacity" label="Mensen / capaciteit" defaultChecked={Boolean(latest?.blocking_capacity)} disabled={!canEdit} />
          <Checkbox name="blocking_expertise" label="Expertise" defaultChecked={Boolean(latest?.blocking_expertise)} disabled={!canEdit} />
          <Checkbox name="blocking_budget" label="Budget" defaultChecked={Boolean(latest?.blocking_budget)} disabled={!canEdit} />
        </div>
      </fieldset>
      <Field label="Onderbouwing" htmlFor={`f-r-${topicId ?? projectId}`}><Textarea id={`f-r-${topicId ?? projectId}`} name="rationale" rows={2} defaultValue={String(latest?.rationale ?? "")} disabled={!canEdit} /></Field>
      {canEdit && <SubmitButton variant="secondary">Haalbaarheid vastleggen</SubmitButton>}
    </ActionForm>
  );
}
