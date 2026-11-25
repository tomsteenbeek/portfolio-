"use client";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveProject } from "@/server/actions/projects";
import { PROJECT_STATUSES, RAG, RAG_DIMENSIONS } from "@/lib/domain";
import type { Lookups } from "@/server/queries/topics";

export function ProjectForm({ p, lookups, secondary, compact }: { p?: Record<string, unknown> | null; lookups: Lookups; secondary?: string[]; compact?: boolean }) {
  const v = (k: string) => (p?.[k] === null || p?.[k] === undefined ? "" : String(p[k]));
  const ta = (n: string, l: string) => <Field key={n} label={l} htmlFor={`pj-${n}`} className="md:col-span-2"><Textarea id={`pj-${n}`} name={n} defaultValue={v(n)} rows={2} /></Field>;
  return (
    <ActionForm action={saveProject} success="Project opgeslagen" className="space-y-6">
      {(state) => (<>
        {p?.id ? <input type="hidden" name="id" value={String(p.id)} /> : null}
        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold">Basis</legend>
          <Field label="Projectnaam" htmlFor="pj-name" required error={fieldError(state, "name")} className="md:col-span-2"><Input id="pj-name" name="name" required defaultValue={v("name")} /></Field>
          <Field label="Primaire pijler" htmlFor="pj-pillar" required hint="Eén primaire pijler voorkomt dubbeltellingen"><Select id="pj-pillar" name="primary_pillar_id" required defaultValue={v("primary_pillar_id")} placeholder="Kies…" options={lookups.pillars.map((x) => ({ value: x.id, label: `${x.number}. ${x.title}` }))} /></Field>
          <Field label="Programma" htmlFor="pj-prog"><Select id="pj-prog" name="program_id" defaultValue={v("program_id")} placeholder="Geen" options={lookups.programs.map((x) => ({ value: x.id, label: x.name }))} /></Field>
          <Field label="Status" htmlFor="pj-status" required><Select id="pj-status" name="status" defaultValue={v("status") || "Idee"} options={PROJECT_STATUSES} /></Field>
          <Field label="Projectleider" htmlFor="pj-leader"><Select id="pj-leader" name="project_leader_id" defaultValue={v("project_leader_id")} placeholder="Nog niet bepaald" options={lookups.users.map((u) => ({ value: u.id, label: u.display_name }))} /></Field>
          <Field label="Opdrachtgever" htmlFor="pj-sponsor"><Input id="pj-sponsor" name="sponsor" defaultValue={v("sponsor")} /></Field>
          <Field label="Voortgang (%)" htmlFor="pj-prog-pct" error={fieldError(state, "progress_pct")}><Input id="pj-prog-pct" name="progress_pct" type="number" min={0} max={100} defaultValue={v("progress_pct")} /></Field>
        </fieldset>
        {!compact && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Secundaire pijlers <span className="font-normal text-muted">(draagt ook bij aan)</span></legend>
            <input type="hidden" name="secondary_pillars_present" value="1" />
            <div className="grid gap-1.5 sm:grid-cols-2">{lookups.pillars.map((x) => <Checkbox key={x.id} name="secondary_pillars" value={x.id} label={`${x.number}. ${x.title}`} defaultChecked={secondary?.includes(x.id)} />)}</div>
          </fieldset>
        )}
        <fieldset className="grid gap-4 md:grid-cols-4">
          <legend className="mb-1 text-sm font-semibold">Planning en middelen</legend>
          <Field label="Startdatum" htmlFor="pj-start"><Input id="pj-start" type="date" name="start_date" defaultValue={v("start_date")} /></Field>
          <Field label="Einddatum" htmlFor="pj-end" error={fieldError(state, "end_date")}><Input id="pj-end" type="date" name="end_date" defaultValue={v("end_date")} /></Field>
          <Field label="Planningsstatus" htmlFor="pj-ps"><Select id="pj-ps" name="planning_status" defaultValue={v("planning_status") || "Gepland"} options={["Gepland", "Vastgesteld"]} /></Field>
          <div />
          <Field label="Budget (€)" htmlFor="pj-budget" error={fieldError(state, "budget")}><Input id="pj-budget" type="number" min={0} name="budget" defaultValue={v("budget")} /></Field>
          <Field label="Gerealiseerde kosten (€)" htmlFor="pj-cost"><Input id="pj-cost" type="number" min={0} name="actual_cost" defaultValue={v("actual_cost")} /></Field>
          <Field label="Benodigde uren" htmlFor="pj-hreq"><Input id="pj-hreq" type="number" min={0} name="hours_required" defaultValue={v("hours_required")} /></Field>
          <Field label="Gerealiseerde uren" htmlFor="pj-hact"><Input id="pj-hact" type="number" min={0} name="hours_actual" defaultValue={v("hours_actual")} /></Field>
        </fieldset>
        {!compact && (<>
          <fieldset className="grid gap-4 md:grid-cols-6">
            <legend className="mb-1 text-sm font-semibold">Stoplichten</legend>
            {RAG_DIMENSIONS.map((r) => <Field key={r.key} label={r.label} htmlFor={`pj-${r.key}`}><Select id={`pj-${r.key}`} name={r.key} defaultValue={v(r.key)} placeholder="Onbekend" options={RAG.map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }))} /></Field>)}
          </fieldset>
          <fieldset className="grid gap-4 md:grid-cols-2">
            <legend className="mb-1 text-sm font-semibold">Projectdefinitie</legend>
            {ta("reason", "Aanleiding")}{ta("problem_statement", "Probleemstelling")}{ta("objective", "Doelstelling")}{ta("scope", "Scope")}
            {ta("out_of_scope", "Buiten scope")}{ta("business_case", "Businesscase")}{ta("stakeholders", "Stakeholders")}{ta("steering_group", "Stuurgroep")}
          </fieldset>
        </>)}
        <SubmitButton>{p?.id ? "Project opslaan" : "Project aanmaken"}</SubmitButton>
      </>)}
    </ActionForm>
  );
}
