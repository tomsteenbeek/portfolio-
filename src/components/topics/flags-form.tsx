"use client";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { setFlags } from "@/server/actions/topics";
import { FLAG_LABELS } from "@/lib/priority";

export function FlagsForm({ topic, canEdit }: { topic: Record<string, unknown> & { id: string }; canEdit: boolean }) {
  return (
    <ActionForm action={setFlags} success="Markeringen opgeslagen" className="space-y-3">
      {(state) => (
        <>
          <input type="hidden" name="id" value={topic.id} />
          <p className="text-[13px] text-muted">Verplichte en urgente initiatieven kunnen niet uitsluitend op basis van een lage score worden uitgesloten. Onderbouwing is altijd verplicht.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(FLAG_LABELS).map(([k, l]) => <Checkbox key={k} name={k} label={l} defaultChecked={Boolean(topic[k])} disabled={!canEdit} />)}
          </div>
          <Field label="Onderbouwing" htmlFor="flag_rationale" error={fieldError(state, "flag_rationale")}>
            <Textarea id="flag_rationale" name="flag_rationale" rows={2} defaultValue={String(topic.flag_rationale ?? "")} disabled={!canEdit} />
          </Field>
          <Field label="Deadline" htmlFor="flag_deadline" hint="Verplicht bij een harde deadline" error={fieldError(state, "legal_deadline")}>
            <Input id="flag_deadline" name="legal_deadline" type="date" defaultValue={String(topic.legal_deadline ?? "")} disabled={!canEdit} className="max-w-48" />
          </Field>
          {canEdit && <SubmitButton variant="secondary">Markeringen opslaan</SubmitButton>}
        </>
      )}
    </ActionForm>
  );
}
