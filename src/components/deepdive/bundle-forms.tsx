"use client";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input, Select } from "@/components/ui/field";
import { bundleToProgram, convertToProject, mergeTopics } from "@/server/actions/topics";

type T = { id: string; code: string; title: string };

export function BundleForms({ topics, programs }: { topics: T[]; programs: { id: string; name: string }[] }) {
  const hidden = topics.map((t) => <input key={t.id} type="hidden" name="topic_ids" value={t.id} />);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="font-semibold">Bundelen tot programma</h2>
        <p className="mb-3 text-[13px] text-muted">Onderwerpen blijven bestaan en worden aan het programma gekoppeld.</p>
        <ActionForm action={bundleToProgram} success="Gebundeld" className="space-y-3">
          {hidden}
          <Field label="Bestaand programma" htmlFor="bp"><Select id="bp" name="program_id" placeholder="— Nieuw programma —" options={programs.map((p) => ({ value: p.id, label: p.name }))} /></Field>
          <Field label="Of naam nieuw programma" htmlFor="bn"><Input id="bn" name="new_name" /></Field>
          <SubmitButton>Bundelen</SubmitButton>
        </ActionForm>
      </section>
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="font-semibold">Omzetten naar project</h2>
        <p className="mb-3 text-[13px] text-muted">Eén project voor alle geselecteerde onderwerpen; de koppeling blijft herleidbaar.</p>
        <ActionForm action={convertToProject} success="Project aangemaakt" className="space-y-3">
          {hidden}
          <Field label="Projectnaam" htmlFor="pn" required><Input id="pn" name="name" required /></Field>
          <SubmitButton>Project aanmaken</SubmitButton>
        </ActionForm>
      </section>
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="font-semibold">Samenvoegen</h2>
        <p className="mb-3 text-[13px] text-muted">Kies het onderwerp dat blijft. De andere krijgen status &apos;Samengevoegd&apos;; alle bronnen en input blijven bewaard.</p>
        <ActionForm action={mergeTopics} success="Samengevoegd" className="space-y-3">
          {topics.map((t) => <input key={t.id} type="hidden" name="sources" value={t.id} />)}
          <Field label="Samenvoegen in" htmlFor="mt"><Select id="mt" name="target" options={topics.map((t) => ({ value: t.id, label: `${t.code} ${t.title}` }))} /></Field>
          {topics.length < 2 ? <p className="text-[13px] text-muted">Selecteer minimaal twee onderwerpen.</p> : <SubmitButton>Samenvoegen</SubmitButton>}
        </ActionForm>
      </section>
    </div>
  );
}
