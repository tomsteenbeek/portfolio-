"use client";
import { Merge, Split, FolderPlus, Network } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { bundleToProgram, convertToProject, mergeTopics, splitTopic } from "@/server/actions/topics";

type Opt = { id: string; code: string; title: string };

export function TopicActions({ topic, related, programs }: { topic: { id: string; code: string; title: string }; related: Opt[]; programs: { id: string; name: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Dialog trigger={<><Merge className="h-4 w-4" aria-hidden />Samenvoegen</>} title={`Onderwerpen samenvoegen in ${topic.code}`}
        description="Geselecteerde onderwerpen krijgen status 'Samengevoegd' en verwijzen naar dit onderwerp. Bronnen en oorspronkelijke input blijven behouden." wide>
        {(close) => (
          <ActionForm action={mergeTopics} success="Samengevoegd" onSuccess={close} className="space-y-3">
            <input type="hidden" name="target" value={topic.id} />
            <fieldset className="max-h-80 overflow-y-auto rounded-md border border-line p-2">
              <legend className="sr-only">Samen te voegen onderwerpen</legend>
              {related.map((r) => (
                <label key={r.id} className="flex items-start gap-2 rounded px-1.5 py-1 text-sm hover:bg-surface-muted">
                  <input type="checkbox" name="sources" value={r.id} className="mt-1" /> <span><span className="num text-muted">{r.code}</span> {r.title}</span>
                </label>
              ))}
            </fieldset>
            <SubmitButton>Samenvoegen</SubmitButton>
          </ActionForm>
        )}
      </Dialog>
      <Dialog trigger={<><Split className="h-4 w-4" aria-hidden />Splitsen</>} title={`${topic.code} splitsen`}
        description="Er worden nieuwe onderwerpen aangemaakt met dezelfde bronnen. Het oorspronkelijke onderwerp krijgt status 'Gesplitst'.">
        {(close) => (
          <ActionForm action={splitTopic} success="Gesplitst" onSuccess={close} className="space-y-3">
            <input type="hidden" name="id" value={topic.id} />
            <Field label="Nieuwe titels (één per regel, minimaal twee)" htmlFor="split-titles">
              <Textarea id="split-titles" name="titles" rows={5} required />
            </Field>
            <SubmitButton>Splitsen</SubmitButton>
          </ActionForm>
        )}
      </Dialog>
      <Dialog trigger={<><Network className="h-4 w-4" aria-hidden />Bundelen in programma</>} title="Bundelen in programma">
        {(close) => (
          <ActionForm action={bundleToProgram} success="Gebundeld" onSuccess={close} className="space-y-3">
            <input type="hidden" name="topic_ids" value={topic.id} />
            <Field label="Bestaand programma" htmlFor="b-prog"><Select id="b-prog" name="program_id" placeholder="— Nieuw programma —" options={programs.map((p) => ({ value: p.id, label: p.name }))} /></Field>
            <Field label="Of naam nieuw programma" htmlFor="b-new"><Input id="b-new" name="new_name" /></Field>
            <SubmitButton>Bundelen</SubmitButton>
          </ActionForm>
        )}
      </Dialog>
      <Dialog trigger={<><FolderPlus className="h-4 w-4" aria-hidden />Omzetten naar project</>} title="Omzetten naar concreet project"
        description="Er wordt een project (status Idee) aangemaakt. Het onderwerp blijft gekoppeld en herleidbaar.">
        {(close) => (
          <ActionForm action={convertToProject} success="Project aangemaakt" onSuccess={close} className="space-y-3">
            <input type="hidden" name="topic_ids" value={topic.id} />
            <Field label="Projectnaam" htmlFor="p-name" required><Input id="p-name" name="name" defaultValue={topic.title} required /></Field>
            <SubmitButton>Project aanmaken</SubmitButton>
          </ActionForm>
        )}
      </Dialog>
    </div>
  );
}
