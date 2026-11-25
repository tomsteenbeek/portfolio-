"use client";
import { refreshData } from "@/lib/refresh";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { addAttachment, addDependency, addExpense, addMember, addMilestone, addProjectUpdate, addTask, removeDependency, removeMember, setMilestoneStatus, setTaskStatus } from "@/server/actions/projects";
import type { ActionResult } from "@/components/ui/action-form";

function useAct() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return { pending, act: (fn: () => Promise<ActionResult>) => start(async () => { const r = await fn(); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); refreshData(); }) };
}

export function UpdateForm({ projectId }: { projectId: string }) {
  return (
    <ActionForm action={addProjectUpdate} success="Update geplaatst" resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
      {(s) => (<>
        <input type="hidden" name="project_id" value={projectId} />
        <Field label="Voortgangsupdate" htmlFor="u-body" error={fieldError(s, "body")}><Textarea id="u-body" name="body" rows={2} required /></Field>
        <Field label="Voortgang %" htmlFor="u-pct"><Input id="u-pct" name="progress_pct" type="number" min={0} max={100} /></Field>
        <SubmitButton variant="secondary">Plaatsen</SubmitButton>
      </>)}
    </ActionForm>
  );
}

export function MilestoneForm({ projectId }: { projectId: string }) {
  return (
    <ActionForm action={addMilestone} success="Mijlpaal toegevoegd" resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_160px_auto_auto] sm:items-end">
      {(s) => (<>
        <input type="hidden" name="project_id" value={projectId} />
        <Field label="Mijlpaal" htmlFor="m-title" error={fieldError(s, "title")}><Input id="m-title" name="title" required /></Field>
        <Field label="Datum" htmlFor="m-due" error={fieldError(s, "due_date")}><Input id="m-due" name="due_date" type="date" required /></Field>
        <Checkbox name="is_legal_deadline" label="Wettelijke deadline" className="pb-2" />
        <SubmitButton variant="secondary">Toevoegen</SubmitButton>
      </>)}
    </ActionForm>
  );
}

export function MilestoneStatus({ id, status, canEdit }: { id: string; status: string; canEdit: boolean }) {
  const { act, pending } = useAct();
  if (!canEdit) return <span>{status}</span>;
  return (
    <select aria-label="Status mijlpaal" className={`${inputClass} h-8 w-auto py-0 text-[13px]`} defaultValue={status} disabled={pending}
      onChange={(e) => act(() => setMilestoneStatus(id, e.target.value as "Open"))}>
      {["Open", "Behaald", "Gemist", "Verschoven"].map((s) => <option key={s}>{s}</option>)}
    </select>
  );
}

export function TaskForm({ projectId, users }: { projectId: string; users: { id: string; display_name: string }[] }) {
  return (
    <ActionForm action={addTask} success="Actie toegevoegd" resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_200px_160px_auto] sm:items-end">
      {(s) => (<>
        <input type="hidden" name="project_id" value={projectId} />
        <Field label="Actie" htmlFor="t-title" error={fieldError(s, "title")}><Input id="t-title" name="title" required /></Field>
        <Field label="Actiehouder" htmlFor="t-who"><Select id="t-who" name="assignee_id" placeholder="—" options={users.map((u) => ({ value: u.id, label: u.display_name }))} /></Field>
        <Field label="Deadline" htmlFor="t-due"><Input id="t-due" name="due_date" type="date" /></Field>
        <SubmitButton variant="secondary">Toevoegen</SubmitButton>
      </>)}
    </ActionForm>
  );
}

export function TaskStatus({ id, status, canEdit }: { id: string; status: string; canEdit: boolean }) {
  const { act, pending } = useAct();
  if (!canEdit) return <span>{status}</span>;
  return (
    <select aria-label="Status actie" className={`${inputClass} h-8 w-auto py-0 text-[13px]`} defaultValue={status} disabled={pending}
      onChange={(e) => act(() => setTaskStatus(id, e.target.value as "Open"))}>
      {["Open", "Bezig", "Gereed", "Vervallen"].map((s) => <option key={s}>{s}</option>)}
    </select>
  );
}

export function MemberForm({ projectId, users }: { projectId: string; users: { id: string; display_name: string }[] }) {
  return (
    <ActionForm action={addMember} success="Teamlid opgeslagen" resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end">
      <input type="hidden" name="project_id" value={projectId} />
      <Field label="Medewerker" htmlFor="mb-u"><Select id="mb-u" name="user_id" required placeholder="Kies…" options={users.map((u) => ({ value: u.id, label: u.display_name }))} /></Field>
      <Field label="Rol in project" htmlFor="mb-r"><Input id="mb-r" name="role" defaultValue="Projectlid" required /></Field>
      <Field label="Uren gepland" htmlFor="mb-h"><Input id="mb-h" name="hours_planned" type="number" min={0} /></Field>
      <SubmitButton variant="secondary">Toevoegen</SubmitButton>
    </ActionForm>
  );
}

export function RemoveMember({ projectId, userId }: { projectId: string; userId: string }) {
  const { act, pending } = useAct();
  return <button type="button" disabled={pending} className="text-subtle hover:text-bad" aria-label="Teamlid verwijderen" onClick={() => confirm("Teamlid verwijderen?") && act(() => removeMember(projectId, userId))}><Trash2 className="h-4 w-4" /></button>;
}

export function DependencyForm({ projectId, projects }: { projectId: string; projects: { id: string; number: string; name: string }[] }) {
  return (
    <ActionForm action={addDependency} success="Afhankelijkheid toegevoegd" resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_160px_1fr_auto] sm:items-end">
      <input type="hidden" name="project_id" value={projectId} />
      <Field label="Afhankelijk van project" htmlFor="dp-p"><Select id="dp-p" name="depends_on_project_id" required placeholder="Kies…" options={projects.filter((p) => p.id !== projectId).map((p) => ({ value: p.id, label: `${p.number} ${p.name}` }))} /></Field>
      <Field label="Type" htmlFor="dp-k"><Select id="dp-k" name="kind" options={["Einde-start", "Start-start", "Inhoudelijk"]} /></Field>
      <Field label="Toelichting" htmlFor="dp-n"><Input id="dp-n" name="note" /></Field>
      <SubmitButton variant="secondary">Toevoegen</SubmitButton>
    </ActionForm>
  );
}

export function RemoveDependency({ id }: { id: string }) {
  const { act, pending } = useAct();
  return <button type="button" disabled={pending} className="text-subtle hover:text-bad" aria-label="Afhankelijkheid verwijderen" onClick={() => confirm("Afhankelijkheid verwijderen?") && act(() => removeDependency(id))}><Trash2 className="h-4 w-4" /></button>;
}

export function ExpenseForm({ projectId }: { projectId: string }) {
  return (
    <ActionForm action={addExpense} success="Kosten geregistreerd" resetOnSuccess className="grid gap-3 sm:grid-cols-[160px_140px_1fr_auto] sm:items-end">
      {(s) => (<>
        <input type="hidden" name="project_id" value={projectId} />
        <Field label="Datum" htmlFor="ex-d" error={fieldError(s, "spent_on")}><Input id="ex-d" name="spent_on" type="date" required /></Field>
        <Field label="Bedrag (€)" htmlFor="ex-a" error={fieldError(s, "amount")}><Input id="ex-a" name="amount" type="number" step="0.01" required /></Field>
        <Field label="Omschrijving" htmlFor="ex-o" error={fieldError(s, "description")}><Input id="ex-o" name="description" required /></Field>
        <SubmitButton variant="secondary">Registreren</SubmitButton>
      </>)}
    </ActionForm>
  );
}

export function AttachmentForm({ entityType, entityId }: { entityType: "project" | "topic" | "decision"; entityId: string }) {
  return (
    <ActionForm action={addAttachment} success="Bijlage gekoppeld" resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {(s) => (<>
        <input type="hidden" name="entity_type" value={entityType} />
        <input type="hidden" name="entity_id" value={entityId} />
        <Field label="Titel" htmlFor="at-t" error={fieldError(s, "title")}><Input id="at-t" name="title" required /></Field>
        <Field label="Link naar document" htmlFor="at-u" hint="Bijv. SharePoint/Teams. Bestanden worden niet in deze applicatie opgeslagen." error={fieldError(s, "url")}><Input id="at-u" name="url" type="url" required /></Field>
        <SubmitButton variant="secondary">Koppelen</SubmitButton>
      </>)}
    </ActionForm>
  );
}
