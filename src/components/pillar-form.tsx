"use client";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Field, Input, Textarea } from "@/components/ui/field";
import { savePillar } from "@/server/actions/pillars";

export function PillarForm({ p, results }: { p: Record<string, unknown> & { id: string }; results: string[] }) {
  const v = (k: string) => (p[k] === null || p[k] === undefined ? "" : String(p[k]));
  return (
    <ActionForm action={savePillar} success="Pijler opgeslagen" className="grid gap-4 md:grid-cols-2">
      {(state) => (<>
        <input type="hidden" name="id" value={p.id} />
        <Field label="Titel" htmlFor="pl-title" required error={fieldError(state, "title")}><Input id="pl-title" name="title" defaultValue={v("title")} required /></Field>
        <Field label="Korte titel" htmlFor="pl-short"><Input id="pl-short" name="short_title" defaultValue={v("short_title")} /></Field>
        <Field label="Strategische doelstelling" htmlFor="pl-obj" required error={fieldError(state, "objective")} className="md:col-span-2"><Textarea id="pl-obj" name="objective" defaultValue={v("objective")} /></Field>
        <Field label="Omschrijving" htmlFor="pl-desc" className="md:col-span-2"><Textarea id="pl-desc" name="description" defaultValue={v("description")} /></Field>
        <Field label="Ambitie voor 2027" htmlFor="pl-amb" className="md:col-span-2"><Textarea id="pl-amb" name="ambition_year" defaultValue={v("ambition_year")} /></Field>
        <Field label="Meerjarenambitie" htmlFor="pl-ambm" className="md:col-span-2"><Textarea id="pl-ambm" name="ambition_multi_year" defaultValue={v("ambition_multi_year")} /></Field>
        <Field label="Gewenste resultaten (één per regel)" htmlFor="pl-res" className="md:col-span-2"><Textarea id="pl-res" name="results" rows={6} defaultValue={results.join("\n")} /></Field>
        <div><SubmitButton>Opslaan</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}
