"use client";
import { useMemo, useState } from "react";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { createSession, updateSession } from "@/server/actions/priority";

type TopicOpt = { id: string; code: string; title: string; pillar_number: number; status: string };
type UserOpt = { id: string; display_name: string };

export function SessionForm({ topics, users, projects, session, memberIds, itemTopicIds, items }: {
  topics: TopicOpt[]; users: UserOpt[]; projects?: { id: string; number: string; name: string }[];
  session?: { id: string; name: string; description: string | null; start_date: string | null; end_date: string | null; hide_individual: boolean };
  memberIds?: string[]; itemTopicIds?: string[]; items?: { id: string; code: string; label: string; submitted: number }[];
}) {
  const [filter, setFilter] = useState("");
  const [onlyValidated, setOnlyValidated] = useState(false);
  const shown = useMemo(() => topics.filter((t) => !(itemTopicIds ?? []).includes(t.id))
    .filter((t) => (!onlyValidated || t.status === "Gevalideerd") && `${t.code} ${t.title}`.toLowerCase().includes(filter.toLowerCase())), [topics, filter, onlyValidated, itemTopicIds]);
  const action = session ? updateSession : createSession;
  const topicField = session ? "add_topics" : "topics";
  return (
    <ActionForm action={action} success={session ? "Sessie bijgewerkt" : "Sessie aangemaakt"} className="space-y-5">
      {(state) => (
        <>
          {session && <input type="hidden" name="id" value={session.id} />}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Naam" htmlFor="s-name" required error={fieldError(state, "name")} className="md:col-span-2">
              <Input id="s-name" name="name" required minLength={3} defaultValue={session?.name} />
            </Field>
            <Field label="Omschrijving" htmlFor="s-desc" className="md:col-span-2"><Textarea id="s-desc" name="description" rows={2} defaultValue={session?.description ?? ""} /></Field>
            <Field label="Startdatum" htmlFor="s-start"><Input id="s-start" type="date" name="start_date" defaultValue={session?.start_date ?? ""} /></Field>
            <Field label="Einddatum" htmlFor="s-end"><Input id="s-end" type="date" name="end_date" defaultValue={session?.end_date ?? ""} /></Field>
          </div>
          {session ? <Checkbox name="hide_individual" label="Individuele beoordelingen verbergen tot de bespreking (aanbevolen)" defaultChecked={session.hide_individual} />
            : <><input type="hidden" name="hide_individual" value="on" /><p className="text-[13px] text-muted">Individuele beoordelingen zijn standaard verborgen tot de bespreking. Het actieve prioriteringsmodel wordt aan de sessie gekoppeld.</p></>}
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Deelnemers</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => <Checkbox key={u.id} name="members" value={u.id} label={u.display_name} defaultChecked={memberIds?.includes(u.id)} />)}
            </div>
          </fieldset>
          {items && items.length > 0 && (
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">Huidige items <span className="font-normal text-muted">(vink aan om te verwijderen; alleen zonder beoordelingen)</span></legend>
              <div className="grid gap-1.5">
                {items.map((i) => <Checkbox key={i.id} name="remove_items" value={i.id} disabled={i.submitted > 0} label={<><span className="num text-muted">{i.code}</span> {i.label}{i.submitted > 0 ? ` (${i.submitted} beoordelingen)` : ""}</>} />)}
              </div>
            </fieldset>
          )}
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">{session ? "Onderwerpen toevoegen" : "Onderwerpen"}</legend>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor="t-filter">Filter onderwerpen</label>
              <Input id="t-filter" placeholder="Filter op ID of titel" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
              <Checkbox label="Alleen gevalideerde onderwerpen" checked={onlyValidated} onChange={(e) => setOnlyValidated(e.currentTarget.checked)} />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-md border border-line p-2">
              {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                const list = shown.filter((t) => t.pillar_number === p);
                if (!list.length) return null;
                return (
                  <div key={p} className="mb-2">
                    <div className="text-[12px] font-semibold uppercase text-muted">Pijler {p}</div>
                    {list.map((t) => <Checkbox key={t.id} className="flex py-0.5" name={topicField} value={t.id} label={<><span className="num text-muted">{t.code}</span> {t.title} <span className="text-[12px] text-subtle">({t.status})</span></>} />)}
                  </div>
                );
              })}
            </div>
          </fieldset>
          {!session && projects && projects.length > 0 && (
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">Projecten</legend>
              <div className="grid gap-1.5">{projects.map((p) => <Checkbox key={p.id} name="projects" value={p.id} label={`${p.number} ${p.name}`} />)}</div>
            </fieldset>
          )}
          <SubmitButton>{session ? "Opslaan" : "Sessie aanmaken"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
