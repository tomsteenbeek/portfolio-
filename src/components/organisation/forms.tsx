"use client";
import { refreshData } from "@/lib/refresh";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { addScenarioPosition, archivePosition, copyBaselineIntoScenario, establishCapacity, removeScenarioPosition, saveAssumptions, savePosition, saveScenario } from "@/server/actions/organisation";
import type { CapacityAssumptions } from "@/lib/capacity";

type Opt = { id: string; name?: string; display_name?: string };

export function PositionForm({ p, disciplines, users }: { p?: Record<string, unknown>; disciplines: Opt[]; users: Opt[] }) {
  const v = (k: string) => (p?.[k] == null ? "" : String(p[k]));
  return (
    <ActionForm action={savePosition} success="Positie opgeslagen" className="grid gap-3 md:grid-cols-2">
      {(s) => (<>
        {p?.id ? <input type="hidden" name="id" value={String(p.id)} /> : null}
        <Field label="Functie / rol" htmlFor="sp-t" required error={fieldError(s, "title")}><Input id="sp-t" name="title" defaultValue={v("title")} required /></Field>
        <Field label="Discipline" htmlFor="sp-d" required><Select id="sp-d" name="discipline_id" defaultValue={v("discipline_id")} required placeholder="Kies…" options={disciplines.map((d) => ({ value: d.id, label: d.name! }))} /></Field>
        <Field label="Subteam (optioneel)" htmlFor="sp-s" hint="Pijlers zijn geen teams; subteams zijn een organisatiekeuze."><Input id="sp-s" name="subteam" defaultValue={v("subteam")} /></Field>
        <Field label="FTE" htmlFor="sp-f" required error={fieldError(s, "fte")}><Input id="sp-f" name="fte" type="number" step="0.01" min={0.01} max={1.5} defaultValue={v("fte")} required /></Field>
        <Field label="Soort" htmlFor="sp-k"><Select id="sp-k" name="kind" defaultValue={v("kind") || "Vastgestelde formatie"} options={["Vastgestelde formatie", "Tijdelijke inhuur", "Structurele inhuur"]} /></Field>
        <Field label="Bezetting" htmlFor="sp-o"><Select id="sp-o" name="occupancy" defaultValue={v("occupancy") || "Vacature"} options={["Bezet", "Vacature", "Deels bezet"]} /></Field>
        <Field label="Bezette FTE (bij deels bezet)" htmlFor="sp-of" error={fieldError(s, "occupied_fte")}><Input id="sp-of" name="occupied_fte" type="number" step="0.01" min={0} defaultValue={v("occupied_fte")} /></Field>
        <Field label="Medewerker (optioneel)" htmlFor="sp-u" hint="Alleen koppelen als dat noodzakelijk is (dataminimalisatie)."><Select id="sp-u" name="user_id" defaultValue={v("user_id")} placeholder="Niet gekoppeld" options={users.map((u) => ({ value: u.id, label: u.display_name! }))} /></Field>
        <Field label="Jaarkosten (€)" htmlFor="sp-c"><Input id="sp-c" name="annual_cost" type="number" min={0} defaultValue={v("annual_cost")} /></Field>
        <Field label="Contracturen per week" htmlFor="sp-h"><Input id="sp-h" name="contract_hours_per_week" type="number" min={0} max={40} defaultValue={v("contract_hours_per_week")} /></Field>
        <Field label="Toelichting" htmlFor="sp-n" className="md:col-span-2"><Textarea id="sp-n" name="notes" rows={2} defaultValue={v("notes")} /></Field>
        <div><SubmitButton>Opslaan</SubmitButton></div>
      </>)}
    </ActionForm>
  );
}

function useAct() {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return { pending, act: (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => start(async () => { const r = await fn(); toast(r.ok ? "ok" : "error", (r.ok ? r.message : r.error) ?? ""); refreshData(); }) };
}

export function ArchivePositionButton({ id }: { id: string }) {
  const { act, pending } = useAct();
  return <button type="button" disabled={pending} aria-label="Positie archiveren" className="text-subtle hover:text-bad" onClick={() => confirm("Positie archiveren?") && act(() => archivePosition(id))}><Trash2 className="h-4 w-4" /></button>;
}

export function ScenarioForm({ s }: { s?: { id: string; name: string; description: string | null; structure_notes: string | null } }) {
  return (
    <ActionForm action={saveScenario} success="Scenario opgeslagen" className="space-y-3">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Naam" htmlFor="sc-n" required><Input id="sc-n" name="name" defaultValue={s?.name} required /></Field>
      <Field label="Omschrijving" htmlFor="sc-d"><Textarea id="sc-d" name="description" rows={2} defaultValue={s?.description ?? ""} /></Field>
      <Field label="Organisatiestructuur / subteams" htmlFor="sc-s" hint="Beschrijf de voorgestelde inrichting (bijv. subteams, aansturing)."><Textarea id="sc-s" name="structure_notes" rows={3} defaultValue={s?.structure_notes ?? ""} /></Field>
      <SubmitButton>Opslaan</SubmitButton>
    </ActionForm>
  );
}

export function ScenarioPositionForm({ scenarioId, disciplines }: { scenarioId: string; disciplines: Opt[] }) {
  return (
    <ActionForm action={addScenarioPosition} success="Toegevoegd" resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_90px_110px_120px_auto] sm:items-end">
      <input type="hidden" name="scenario_id" value={scenarioId} />
      <Field label="Discipline" htmlFor="ssp-d"><Select id="ssp-d" name="discipline_id" required placeholder="Kies…" options={disciplines.map((d) => ({ value: d.id, label: d.name! }))} /></Field>
      <Field label="Functie" htmlFor="ssp-t"><Input id="ssp-t" name="title" required /></Field>
      <Field label="Subteam" htmlFor="ssp-s"><Input id="ssp-s" name="subteam" /></Field>
      <Field label="FTE" htmlFor="ssp-f"><Input id="ssp-f" name="fte" type="number" step="0.1" min={0.1} required /></Field>
      <Field label="Soort" htmlFor="ssp-k"><Select id="ssp-k" name="kind" options={["Intern", "Inhuur"]} /></Field>
      <Field label="Jaarkosten (€)" htmlFor="ssp-c"><Input id="ssp-c" name="annual_cost" type="number" min={0} /></Field>
      <SubmitButton variant="secondary">Toevoegen</SubmitButton>
    </ActionForm>
  );
}

export function RemoveScenarioPosition({ id }: { id: string }) {
  const { act, pending } = useAct();
  return <button type="button" disabled={pending} aria-label="Verwijderen" className="text-subtle hover:text-bad" onClick={() => act(() => removeScenarioPosition(id))}><Trash2 className="h-4 w-4" /></button>;
}

export function CopyBaselineButton({ scenarioId }: { scenarioId: string }) {
  const { act, pending } = useAct();
  return <Button size="sm" disabled={pending} onClick={() => confirm("Alle posities uit de huidige formatie aan dit scenario toevoegen?") && act(() => copyBaselineIntoScenario(scenarioId))}>Vullen vanuit huidige formatie</Button>;
}

export function EstablishCapacityButton({ year }: { year: number }) {
  const { act, pending } = useAct();
  return <Button variant="primary" disabled={pending} onClick={() => confirm(`Capaciteitsplanning ${year} (opnieuw) vaststellen op basis van bezetting, reguliere werkzaamheden en projecten? Eerder gegenereerde regels voor ${year} worden vervangen; handmatige regels blijven staan.`) && act(() => establishCapacity(year))}>Planning {year} vaststellen</Button>;
}

export function AssumptionsForm({ a }: { a: CapacityAssumptions }) {
  const f: [keyof CapacityAssumptions, string, string][] = [
    ["uren_per_fte_per_jaar", "Contracturen per FTE per jaar", "uur"], ["vakantie_en_verlof_pct", "Vakantie en verlof", "%"],
    ["feestdagen_uren_per_fte", "Feestdagen per FTE", "uur"], ["verwachte_afwezigheid_pct", "Verwachte afwezigheid (ziekte)", "%"],
    ["overleg_pct", "Overleg", "%"], ["opleiding_pct", "Opleiding", "%"], ["incidenten_onvoorzien_pct", "Incidenten en onvoorzien", "%"], ["managementtaken_pct", "Managementtaken", "%"],
  ];
  return (
    <ActionForm action={saveAssumptions} success="Aannames opgeslagen" className="grid gap-3 sm:grid-cols-2">
      {f.map(([k, l, u]) => <Field key={k} label={`${l} (${u})`} htmlFor={`as-${k}`}><Input id={`as-${k}`} name={k} type="number" step="0.1" min={0} defaultValue={a[k]} required /></Field>)}
      <div className="sm:col-span-2"><SubmitButton variant="secondary">Aannames opslaan</SubmitButton></div>
    </ActionForm>
  );
}
