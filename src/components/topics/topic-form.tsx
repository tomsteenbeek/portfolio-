"use client";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveTopic } from "@/server/actions/topics";
import { SOURCE_TYPES, TOPIC_STATUSES, WORK_TYPES } from "@/lib/domain";
import type { Lookups } from "@/server/queries/topics";

type T = Record<string, unknown> & { id?: string; classifications?: string[]; disciplines?: string[] };

export function TopicForm({ topic, lookups, defaultPillar }: { topic?: T; lookups: Lookups; defaultPillar?: string }) {
  const v = (k: string) => (topic?.[k] as string | number | null | undefined) ?? "";
  const ta = (state: Parameters<typeof fieldError>[0], name: string, label: string) => (
    <Field key={name} label={label} htmlFor={name} error={fieldError(state, name)}>
      <Textarea id={name} name={name} defaultValue={String(v(name))} />
    </Field>
  );
  return (
    <ActionForm action={saveTopic} success="Onderwerp opgeslagen" className="space-y-6">
      {(state) => (
        <>
          {topic?.id && <input type="hidden" name="id" value={topic.id} />}
          {topic?.version != null && <input type="hidden" name="version" value={String(topic.version)} />}
          <fieldset className="grid gap-4 md:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold">Basis</legend>
            <Field label="Titel" htmlFor="title" required error={fieldError(state, "title")} className="md:col-span-2">
              <Input id="title" name="title" required minLength={2} maxLength={300} defaultValue={String(v("title"))} aria-invalid={!!fieldError(state, "title")} />
            </Field>
            <Field label="Pijler" htmlFor="pillar_id" required>
              <Select id="pillar_id" name="pillar_id" required defaultValue={String(v("pillar_id") || defaultPillar || "")} placeholder="Kies een pijler"
                options={lookups.pillars.map((p) => ({ value: p.id, label: `${p.number}. ${p.title}` }))} />
            </Field>
            <Field label="Status" htmlFor="status" required>
              <Select id="status" name="status" defaultValue={String(v("status") || "Te valideren")} options={TOPIC_STATUSES} />
            </Field>
            <Field label="Subcategorie" htmlFor="subcategory"><Input id="subcategory" name="subcategory" defaultValue={String(v("subcategory"))} /></Field>
            <Field label="Programma" htmlFor="program_id">
              <Select id="program_id" name="program_id" defaultValue={String(v("program_id"))} placeholder="Geen programma"
                options={lookups.programs.map((p) => ({ value: p.id, label: p.name }))} />
            </Field>
            <Field label="Verantwoordelijke" htmlFor="owner_user_id" hint="Leeg laten tot eigenaarschap is afgesproken.">
              <Select id="owner_user_id" name="owner_user_id" defaultValue={String(v("owner_user_id"))} placeholder="Nog niet bepaald"
                options={lookups.users.map((u) => ({ value: u.id, label: u.display_name }))} />
            </Field>
            {!topic?.id && (
              <Field label="Bron" htmlFor="source_type">
                <Select id="source_type" name="source_type" defaultValue="Nog te valideren" options={SOURCE_TYPES} />
              </Field>
            )}
            <Field label="Omschrijving" htmlFor="description" className="md:col-span-2">
              <Textarea id="description" name="description" defaultValue={String(v("description"))} />
            </Field>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Type werkzaamheden <span className="font-normal text-muted">(meerdere mogelijk)</span></legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {WORK_TYPES.map((w) => <Checkbox key={w} name="classifications" value={w} label={w} defaultChecked={topic?.classifications?.includes(w)} />)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Betrokken disciplines</legend>
            <div className="grid gap-x-5 gap-y-2 sm:grid-cols-3">
              {lookups.disciplines.map((d) => <Checkbox key={d.id} name="disciplines" value={d.id} label={d.name} defaultChecked={topic?.disciplines?.includes(d.id)} />)}
            </div>
          </fieldset>

          <fieldset className="grid gap-4 md:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold">Inhoud</legend>
            {ta(state, "reason", "Aanleiding")}
            {ta(state, "problem_statement", "Probleemstelling")}
            {ta(state, "current_situation", "Huidige situatie")}
            {ta(state, "desired_situation", "Gewenste situatie")}
            {ta(state, "intended_result", "Beoogd resultaat")}
            {ta(state, "strategic_contribution", "Strategische bijdrage")}
            {ta(state, "risk_if_not_done", "Risico bij niet uitvoeren")}
            {ta(state, "service_impact", "Impact op dienstverlening")}
            {ta(state, "dependencies_text", "Afhankelijkheden")}
            {ta(state, "remarks", "Opmerkingen")}
          </fieldset>

          <fieldset className="grid gap-4 md:grid-cols-4">
            <legend className="mb-2 text-sm font-semibold">Verplichtingen en raming</legend>
            <Field label="Wettelijke grondslag" htmlFor="legal_basis" className="md:col-span-2"><Input id="legal_basis" name="legal_basis" defaultValue={String(v("legal_basis"))} /></Field>
            <Field label="Wettelijke deadline" htmlFor="legal_deadline" error={fieldError(state, "legal_deadline")}><Input id="legal_deadline" name="legal_deadline" type="date" defaultValue={String(v("legal_deadline"))} /></Field>
            <div />
            <Field label="Benodigde capaciteit (uren)" htmlFor="required_capacity_hours" hint="Leeg = nog niet geraamd" error={fieldError(state, "required_capacity_hours")}>
              <Input id="required_capacity_hours" name="required_capacity_hours" type="number" min={0} step="1" defaultValue={String(v("required_capacity_hours"))} />
            </Field>
            <Field label="Benodigd budget (€)" htmlFor="required_budget" hint="Leeg = nog niet geraamd" error={fieldError(state, "required_budget")}>
              <Input id="required_budget" name="required_budget" type="number" min={0} step="100" defaultValue={String(v("required_budget"))} />
            </Field>
          </fieldset>
          <div className="flex gap-2 border-t border-line pt-4">
            <SubmitButton>{topic?.id ? "Wijzigingen opslaan" : "Onderwerp toevoegen"}</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
