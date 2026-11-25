"use client";
import { useState } from "react";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveSetting, saveUser } from "@/server/actions/admin";
import { saveModelVersion } from "@/server/actions/priority";
import { ROLE_LABELS, type RoleCode } from "@/lib/auth/permissions";
import type { Criterion } from "@/server/queries/priority";
import { validateWeights } from "@/lib/priority";

export function UserForm({ u, disciplines }: { u?: { id: string; email: string; display_name: string; discipline_id: string | null; job_title: string | null; is_active: boolean; roles: string[] }; disciplines: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveUser} success="Gebruiker opgeslagen" className="grid gap-3 md:grid-cols-2">
      {(s) => (<>
        {u && <input type="hidden" name="id" value={u.id} />}
        <Field label="Naam" htmlFor="us-n" required error={fieldError(s, "display_name")}><Input id="us-n" name="display_name" defaultValue={u?.display_name} required /></Field>
        <Field label="E-mail (gemeentelijk account)" htmlFor="us-e" required error={fieldError(s, "email")}><Input id="us-e" name="email" type="email" defaultValue={u?.email} required /></Field>
        <Field label="Discipline" htmlFor="us-d"><Select id="us-d" name="discipline_id" defaultValue={u?.discipline_id ?? ""} placeholder="—" options={disciplines.map((d) => ({ value: d.id, label: d.name }))} /></Field>
        <Field label="Functie" htmlFor="us-j"><Input id="us-j" name="job_title" defaultValue={u?.job_title ?? ""} /></Field>
        <fieldset className="md:col-span-2"><legend className="mb-1 text-[13px] font-medium">Rollen</legend>
          <div className="flex flex-wrap gap-4">{(Object.keys(ROLE_LABELS) as RoleCode[]).map((r) => <Checkbox key={r} name="roles" value={r} label={ROLE_LABELS[r]} defaultChecked={u?.roles.includes(r)} />)}</div></fieldset>
        <Checkbox name="is_active" label="Actief" defaultChecked={u?.is_active ?? true} />
        <div className="md:col-span-2"><SubmitButton>Opslaan</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}

export function SettingForm({ k, value, description }: { k: string; value: unknown; description: string | null }) {
  const json = JSON.stringify(value, null, typeof value === "object" ? 2 : 0);
  return (
    <ActionForm action={saveSetting} success="Instelling opgeslagen" className="space-y-2">
      <input type="hidden" name="key" value={k} />
      <Field label={k} htmlFor={`st-${k}`} hint={description ?? undefined}>
        {typeof value === "object" ? <Textarea id={`st-${k}`} name="value" defaultValue={json} rows={Math.min(10, json.split("\n").length + 1)} className="font-mono text-[13px]" />
          : <Input id={`st-${k}`} name="value" defaultValue={json} className="font-mono" />}
      </Field>
      <SubmitButton size="sm" variant="secondary">Opslaan</SubmitButton>
    </ActionForm>
  );
}

export function ModelForm({ criteria }: { criteria: Criterion[] }) {
  const [weights, setWeights] = useState<Record<string, number>>(Object.fromEntries(criteria.map((c) => [c.code, c.weight])));
  const v = validateWeights(Object.values(weights));
  return (
    <ActionForm action={saveModelVersion} success="Nieuwe modelversie actief" className="space-y-4">
      {criteria.map((c) => (
        <fieldset key={c.code} className="rounded-md border border-line p-3">
          <legend className="px-1 text-sm font-semibold">{c.code}</legend>
          <input type="hidden" name="code" value={c.code} />
          <div className="grid gap-3 md:grid-cols-[1fr_140px]">
            <Field label="Naam" htmlFor={`m-n-${c.code}`}><Input id={`m-n-${c.code}`} name={`name_${c.code}`} defaultValue={c.name} required /></Field>
            <Field label="Gewicht (%)" htmlFor={`m-w-${c.code}`}><Input id={`m-w-${c.code}`} name={`weight_${c.code}`} type="number" min={0} max={100} step="1" value={weights[c.code]} onChange={(e) => setWeights({ ...weights, [c.code]: Number(e.target.value) })} required /></Field>
            <Field label="Omschrijving" htmlFor={`m-d-${c.code}`} className="md:col-span-2"><Input id={`m-d-${c.code}`} name={`description_${c.code}`} defaultValue={c.description ?? ""} /></Field>
          </div>
          <details className="mt-2"><summary className="cursor-pointer text-[13px] text-primary">Uitleg per score (0–5)</summary>
            <div className="mt-2 grid gap-2">{c.rubric.map((r, i) => <Field key={i} label={`Score ${i}`} htmlFor={`m-r-${c.code}-${i}`}><Input id={`m-r-${c.code}-${i}`} name={`rubric_${c.code}_${i}`} defaultValue={r} required /></Field>)}</div>
          </details>
        </fieldset>
      ))}
      <Field label="Toelichting op deze versie" htmlFor="m-note"><Input id="m-note" name="note" /></Field>
      <p role="status" className={`text-sm ${v.ok ? "text-ok" : "text-bad"}`}>Som van de gewichten: {v.sum}% {v.ok ? "✓" : "– moet exact 100% zijn"}</p>
      <SubmitButton>Opslaan als nieuwe versie</SubmitButton>
    </ActionForm>
  );
}
