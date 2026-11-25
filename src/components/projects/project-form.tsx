"use client";
import { useMemo, useState } from "react";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea, inputClass } from "@/components/ui/field";
import { saveProject, SIMPLE_PROJECT_STATUSES } from "@/server/actions/projects";
import type { Lookups } from "@/server/queries/topics";
import type { ProjectRow } from "@/server/queries/projects";
import { OwnerSelect } from "@/components/team/owner-select";

/** Project/initiatief: het werk zelf staat in Planner; hier de koppeling aan pijlers en onderwerpen. */
export function ProjectForm({ p, lookups, defaultTopic }: { p?: ProjectRow | null; lookups: Lookups; defaultTopic?: string }) {
  const [filter, setFilter] = useState("");
  const [primary, setPrimary] = useState(p?.primary_pillar_id ?? lookups.topics.find((t) => t.id === defaultTopic)?.pillar_id ?? "");
  const chosen = useMemo(() => new Set([...(p?.topics.map((t) => t.id) ?? []), ...(defaultTopic ? [defaultTopic] : [])]), [p, defaultTopic]);
  const [sel, setSel] = useState<Set<string>>(chosen);
  const v = (k: keyof ProjectRow) => (p?.[k] ?? "") as string;
  const statuses = p && !(SIMPLE_PROJECT_STATUSES as readonly string[]).includes(p.status) ? [p.status, ...SIMPLE_PROJECT_STATUSES] : SIMPLE_PROJECT_STATUSES;
  const visibleTopics = lookups.topics.filter((t) => sel.has(t.id) || `${t.code} ${t.title}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <ActionForm action={saveProject} success="Opgeslagen" className="space-y-5">
      {(state) => (
        <>
          {p?.id && <input type="hidden" name="id" value={p.id} />}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Naam" htmlFor="pj-name" required error={fieldError(state, "name")} className="md:col-span-2"><Input id="pj-name" name="name" required defaultValue={v("name")} /></Field>
            <Field label="Korte omschrijving" htmlFor="pj-desc" className="md:col-span-2"><Textarea id="pj-desc" name="description" rows={2} defaultValue={v("description")} /></Field>
            <Field label="Link naar Planner" htmlFor="pj-url" hint="Kopieer de link van het Planner-bord of de taak" error={fieldError(state, "planner_url")} className="md:col-span-2">
              <Input id="pj-url" name="planner_url" type="url" placeholder="https://tasks.office.com/…" defaultValue={v("planner_url")} />
            </Field>
            <Field label="Trekker" htmlFor="pj-lead"><OwnerSelect id="pj-lead" name="lead_name" team={lookups.team} defaultValue={v("lead_name")} /></Field>
            <Field label="Status" htmlFor="pj-status" required><Select id="pj-status" name="status" defaultValue={v("status") || "Gepland"} options={statuses} /></Field>
            <Field label="Startdatum" htmlFor="pj-start" hint="Nodig om op de roadmap te verschijnen"><Input id="pj-start" name="start_date" type="date" defaultValue={v("start_date")} /></Field>
            <Field label="Einddatum" htmlFor="pj-end" error={fieldError(state, "end_date")}><Input id="pj-end" name="end_date" type="date" defaultValue={v("end_date")} /></Field>
            <Field label="Hoofdpijler" htmlFor="pj-pillar" required>
              <Select id="pj-pillar" name="primary_pillar_id" required value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder="Kies…"
                options={lookups.pillars.map((x) => ({ value: x.id, label: `${x.number}. ${x.short_title ?? x.title}` }))} />
            </Field>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Draagt ook bij aan pijler(s)</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {lookups.pillars.filter((x) => x.id !== primary).map((x) => <Checkbox key={x.id} name="secondary_pillars" value={x.id} label={`${x.number}. ${x.short_title ?? x.title}`} defaultChecked={p?.secondary_pillars.includes(x.number)} />)}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Gekoppelde onderwerpen <span className="font-normal text-muted">({sel.size} gekozen)</span></legend>
            <label htmlFor="pj-tfilter" className="sr-only">Onderwerpen filteren</label>
            <input id="pj-tfilter" className={`${inputClass} mb-2 h-8 max-w-xs text-[13px]`} placeholder="Filter op ID of titel" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <div className="max-h-64 overflow-y-auto rounded-md border border-line p-2">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                const list = visibleTopics.filter((t) => t.pillar_number === n);
                if (!list.length) return null;
                return (
                  <div key={n} className="mb-2">
                    <div className="text-[12px] font-semibold uppercase text-muted">Pijler {n}</div>
                    {list.map((t) => (
                      <label key={t.id} className="flex items-start gap-2 py-0.5 text-sm">
                        <input type="checkbox" name="topics" value={t.id} className="mt-1" checked={sel.has(t.id)}
                          onChange={(e) => { const s = new Set(sel); if (e.target.checked) s.add(t.id); else s.delete(t.id); setSel(s); }} />
                        <span><span className="num text-muted">{t.code}</span> {t.title}</span>
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          </fieldset>
          <SubmitButton>{p?.id ? "Opslaan" : "Toevoegen"}</SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
