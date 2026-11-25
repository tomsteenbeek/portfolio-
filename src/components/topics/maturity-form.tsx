"use client";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Field, Textarea } from "@/components/ui/field";
import { MATURITY_LEVELS } from "@/lib/domain";
import { saveMaturity } from "@/server/actions/topics";
import { cn } from "@/components/ui/cn";

function LevelPicker({ name, value, legend }: { name: string; value: number | null; legend: string }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium">{legend}</legend>
      <div className="grid gap-1.5 sm:grid-cols-5">
        {MATURITY_LEVELS.map((l) => (
          <label key={l.level} className={cn("cursor-pointer rounded-md border border-line p-2 text-[12px] has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus-ring)]")}>
            <input type="radio" name={name} value={l.level} defaultChecked={value === l.level} className="sr-only" required />
            <span className="block text-[13px] font-semibold">{l.level}. {l.label}</span>
            <span className="text-muted">{l.description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function MaturityForm({ topicId, pillarId, current, target }: { topicId?: string; pillarId?: string; current: number | null; target: number | null }) {
  return (
    <ActionForm action={saveMaturity} success="Volwassenheid vastgelegd" className="space-y-4">
      {(state) => (
        <>
          {topicId && <input type="hidden" name="topic_id" value={topicId} />}
          {pillarId && <input type="hidden" name="pillar_id" value={pillarId} />}
          <LevelPicker name="current_level" value={current} legend="Huidige volwassenheid" />
          <Field label="Onderbouwing huidige volwassenheid" htmlFor={`cr-${topicId ?? pillarId}`} error={fieldError(state, "current_rationale")}>
            <Textarea id={`cr-${topicId ?? pillarId}`} name="current_rationale" rows={2} />
          </Field>
          <LevelPicker name="target_level" value={target} legend="Gewenste volwassenheid" />
          <Field label="Onderbouwing gewenste volwassenheid" htmlFor={`tr-${topicId ?? pillarId}`}>
            <Textarea id={`tr-${topicId ?? pillarId}`} name="target_rationale" rows={2} />
          </Field>
          <SubmitButton>Volwassenheid vastleggen</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
