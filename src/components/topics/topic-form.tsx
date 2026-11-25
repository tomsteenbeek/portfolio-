"use client";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveTopic } from "@/server/actions/topics";
import type { Lookups } from "@/server/queries/topics";

type T = { id?: string; title?: string; pillar_id?: string; owner_name?: string | null; description?: string | null; scope?: string | null; intended_result?: string | null; remarks?: string | null };

/** Onderwerp als werk in uitvoering: alles behalve titel en pijler mag (nog) leeg zijn. */
export function TopicForm({ topic, lookups, defaultPillar }: { topic?: T; lookups: Lookups; defaultPillar?: string }) {
  const v = (k: keyof T) => (topic?.[k] ?? "") as string;
  return (
    <ActionForm action={saveTopic} success="Onderwerp opgeslagen" className="space-y-4">
      {(state) => (
        <>
          {topic?.id && <input type="hidden" name="id" value={topic.id} />}
          <div className="grid gap-4 md:grid-cols-[1fr_280px_240px]">
            <Field label="Titel" htmlFor="title" required error={fieldError(state, "title")}>
              <Input id="title" name="title" required minLength={2} maxLength={300} defaultValue={v("title")} />
            </Field>
            <Field label="Pijler" htmlFor="pillar_id" required>
              <Select id="pillar_id" name="pillar_id" required defaultValue={v("pillar_id") || defaultPillar || ""} placeholder="Kies een pijler"
                options={lookups.pillars.map((p) => ({ value: p.id, label: `${p.number}. ${p.short_title ?? p.title}` }))} />
            </Field>
            <Field label="Eigenaar" htmlFor="owner_name" hint="Naam, functie of team" error={fieldError(state, "owner_name")}>
              <Input id="owner_name" name="owner_name" maxLength={120} defaultValue={v("owner_name")} />
            </Field>
          </div>
          <Field label="Omschrijving" htmlFor="description" hint="Waar gaat dit onderwerp over?">
            <Textarea id="description" name="description" rows={3} defaultValue={v("description")} />
          </Field>
          <Field label="Wat valt eronder" htmlFor="scope" hint="Bijvoorbeeld systemen, processen, werkzaamheden of deelonderwerpen.">
            <Textarea id="scope" name="scope" rows={4} defaultValue={v("scope")} />
          </Field>
          <Field label="Doel / beoogd resultaat" htmlFor="intended_result">
            <Textarea id="intended_result" name="intended_result" rows={3} defaultValue={v("intended_result")} />
          </Field>
          <Field label="Aandachtspunten en open vragen" htmlFor="remarks" hint="Wat moet nog worden uitgezocht, aangescherpt of afgestemd?">
            <Textarea id="remarks" name="remarks" rows={3} defaultValue={v("remarks")} />
          </Field>
          <SubmitButton>{topic?.id ? "Opslaan" : "Onderwerp toevoegen"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
