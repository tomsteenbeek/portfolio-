"use client";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Field, Input, Select } from "@/components/ui/field";
import { saveMember, setMemberActive } from "@/server/actions/team";
import { TEAM_KINDS } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { refreshData } from "@/lib/refresh";
import type { TeamMember } from "@/server/queries/team";

export function MemberForm({ m }: { m?: TeamMember }) {
  const k = m?.id ?? "new";
  return (
    <ActionForm action={saveMember} success="Opgeslagen" className="grid gap-4 md:grid-cols-2">
      {(state) => (<>
        {m && <input type="hidden" name="id" value={m.id} />}
        <Field label="Naam" htmlFor={`tm-name-${k}`} required error={fieldError(state, "name")}><Input id={`tm-name-${k}`} name="name" required maxLength={120} defaultValue={m?.name ?? ""} /></Field>
        <Field label="Soort" htmlFor={`tm-kind-${k}`} required><Select id={`tm-kind-${k}`} name="kind" defaultValue={m?.kind ?? "Vast"} options={TEAM_KINDS} /></Field>
        <Field label="Functie / rol" htmlFor={`tm-fn-${k}`} className="md:col-span-2"><Input id={`tm-fn-${k}`} name="function_title" maxLength={160} defaultValue={m?.function_title ?? ""} /></Field>
        {m && <p className="text-[12px] text-muted md:col-span-2">Wijzig je de naam, dan gaan eigenaarschappen en trekkerschappen automatisch mee.</p>}
        <div><SubmitButton>{m ? "Opslaan" : "Toevoegen"}</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}

export function ToggleActive({ m }: { m: TeamMember }) {
  const toast = useToast();
  return (
    <Button size="sm" variant="ghost" onClick={async () => {
      if (m.is_active && !confirm(`${m.name} op inactief zetten? Bestaande eigenaarschappen blijven staan.`)) return;
      const r = await setMemberActive(m.id, !m.is_active);
      toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); if (r.ok) refreshData();
    }}>{m.is_active ? "Inactief maken" : "Activeren"}</Button>
  );
}
