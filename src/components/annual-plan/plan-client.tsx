"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea, inputClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { addPlanItem, createPlan, removePlanItem, saveSections, saveVersion, setPlanStatus } from "@/server/actions/annual-plan";
import { ANNUAL_PLAN_SECTIONS } from "@/lib/annual-plan";
import { ANNUAL_PLAN_STATUSES } from "@/lib/domain";

export function SectionsForm({ plan }: { plan: { id: string; title: string; theme: string | null; sections: Record<string, string> } }) {
  return (
    <ActionForm action={saveSections} success="Jaarplan opgeslagen" className="space-y-4">
      <input type="hidden" name="id" value={plan.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Titel" htmlFor="ap-title" required><Input id="ap-title" name="title" defaultValue={plan.title} required /></Field>
        <Field label="Centraal thema" htmlFor="ap-theme"><Input id="ap-theme" name="theme" defaultValue={plan.theme ?? ""} /></Field>
      </div>
      {ANNUAL_PLAN_SECTIONS.map((s) => (
        <Field key={s.key} label={s.label} htmlFor={`ap-${s.key}`}><Textarea id={`ap-${s.key}`} name={s.key} rows={s.key === "managementsamenvatting" ? 6 : 3} defaultValue={plan.sections[s.key] ?? ""} /></Field>
      ))}
      <SubmitButton>Teksten opslaan</SubmitButton>
    </ActionForm>
  );
}

export function StatusAndVersion({ id, status }: { id: string; status: string }) {
  const [s, setS] = useState(status);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const done = (r: { ok: boolean; message?: string; error?: string }) => { toast(r.ok ? "ok" : "error", (r.ok ? r.message : r.error) ?? ""); if (r.ok) { setNote(""); router.refresh(); } };
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col text-[12px] text-muted">Status
        <select className={`${inputClass} h-9`} value={s} onChange={(e) => setS(e.target.value)}>{ANNUAL_PLAN_STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
      </label>
      <label className="flex flex-col text-[12px] text-muted">Toelichting versie
        <input className={`${inputClass} h-9 w-56`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="optioneel" />
      </label>
      <Button variant="primary" disabled={pending || s === status} onClick={() => start(async () => done(await setPlanStatus(id, s, note)))}>Status wijzigen</Button>
      <Button disabled={pending} onClick={() => start(async () => done(await saveVersion(id, note)))}>Versie opslaan</Button>
    </div>
  );
}

export function AddItemForm({ planId, candidates }: { planId: string; candidates: { ref: string; label: string; priority: string | null }[] }) {
  return (
    <ActionForm action={addPlanItem} success="Toegevoegd" resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="plan_id" value={planId} />
      <Field label="Initiatief uit portfolio" htmlFor="ap-ref" hint="Gesorteerd op prioriteit">
        <Select id="ap-ref" name="ref" required placeholder="Kies…" options={candidates.map((c) => ({ value: c.ref, label: `${c.priority ? `[${c.priority}] ` : ""}${c.label}` }))} />
      </Field>
      <Field label="Toelichting" htmlFor="ap-note"><Input id="ap-note" name="note" /></Field>
      <SubmitButton variant="secondary">Toevoegen</SubmitButton>
    </ActionForm>
  );
}

export function RemoveItem({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return <button type="button" disabled={pending} aria-label="Verwijderen uit jaarplan" className="text-subtle hover:text-bad no-print"
    onClick={() => confirm("Verwijderen uit jaarplan?") && start(async () => { const r = await removePlanItem(id); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); router.refresh(); })}><Trash2 className="h-4 w-4" /></button>;
}

export function NewPlanForm({ defaultYear }: { defaultYear: number }) {
  return (
    <ActionForm action={createPlan} success="Jaarplan aangemaakt" className="grid gap-3 sm:grid-cols-[120px_1fr_auto] sm:items-end">
      <Field label="Jaar" htmlFor="np-y" required><Input id="np-y" name="year" type="number" min={2020} max={2100} defaultValue={defaultYear} required /></Field>
      <Field label="Titel" htmlFor="np-t"><Input id="np-t" name="title" placeholder={`Jaarplan Digitale Informatie ${defaultYear}`} /></Field>
      <SubmitButton>Aanmaken</SubmitButton>
    </ActionForm>
  );
}
