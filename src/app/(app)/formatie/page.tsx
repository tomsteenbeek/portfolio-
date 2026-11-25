import Link from "next/link";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TabLinks } from "@/components/ui/tabs";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ArchivePositionButton, CopyBaselineButton, PositionForm, RemoveScenarioPosition, ScenarioForm, ScenarioPositionForm } from "@/components/organisation/forms";
import { capacityFor, type CapacityAssumptions } from "@/lib/capacity";
import { fmtEuro, fmtFte, fmtHours } from "@/lib/format";
import { PrintButton } from "@/components/common/print-button";

export const metadata = { title: "Formatie en bezetting" };

type Pos = { id: string; title: string; discipline_id: string; discipline: string; subteam: string | null; fte: number; kind: string; occupancy: string; occupied_fte: number | null; user_name: string | null; annual_cost: number | null; contract_hours_per_week: number | null; notes: string | null; user_id: string | null };

export default async function StaffingPage({ searchParams }: { searchParams: Promise<{ tab?: string; scenario?: string }> }) {
  const { tab = "overzicht", scenario } = await searchParams;
  const d = await db(async (x, user) => {
    if (!can(user.roles, "staffing.view")) return null;
    const a = (await x.one<{ value: CapacityAssumptions }>(`select value from settings where key = 'capaciteit.aannames'`))!.value;
    return {
      user, a,
      disciplines: await x.query<{ id: string; name: string }>(`select id, name from disciplines order by sort_order`),
      users: await x.query<{ id: string; display_name: string }>(`select id, display_name from users where is_active order by display_name`),
      positions: await x.query<Pos>(`select s.*, d.name as discipline, u.display_name as user_name from staffing_positions s join disciplines d on d.id = s.discipline_id left join users u on u.id = s.user_id where s.archived_at is null order by d.sort_order, s.title`),
      scenarios: await x.query<{ id: string; name: string; description: string | null; structure_notes: string | null; is_baseline: boolean; fte: number | null; cost: number | null; hire_cost: number | null; n: number }>(
        `select s.id, s.name, s.description, s.structure_notes, s.is_baseline, sum(p.fte) as fte, sum(p.annual_cost) filter (where p.kind = 'Intern') as cost,
                sum(p.annual_cost) filter (where p.kind = 'Inhuur') as hire_cost, count(p.id)::int as n
           from staffing_scenarios s left join staffing_scenario_positions p on p.scenario_id = s.id group by s.id order by s.is_baseline desc, s.created_at`),
      scenarioPositions: scenario ? await x.query<{ id: string; discipline: string; discipline_id: string; subteam: string | null; title: string; fte: number; kind: string; annual_cost: number | null }>(
        `select p.id, d.name as discipline, p.discipline_id, p.subteam, p.title, p.fte, p.kind, p.annual_cost from staffing_scenario_positions p join disciplines d on d.id = p.discipline_id where p.scenario_id = $1 order by d.sort_order, p.subteam nulls first, p.title`, [scenario]) : [],
      required: await x.query<{ discipline_id: string; hours: number | null }>(
        `select discipline_id, sum(coalesce(hours_per_year, hours_per_occurrence*occurrences_per_year)) as hours from recurring_activities where archived_at is null and discipline_id is not null group by discipline_id`),
      skills: await x.query<{ discipline_id: string | null; critical: number; uncovered: number }>(
        `select s.discipline_id, count(*) filter (where s.is_critical)::int as critical,
                count(*) filter (where s.is_critical and not exists (select 1 from position_skills ps where ps.skill_id = s.id and ps.level >= coalesce(ps.required_level, 3)))::int as uncovered
           from skills s group by s.discipline_id`),
    };
  });
  if (!d) return (<><PageHeader title="Formatie en bezetting" crumbs={[{ label: "Organisatie" }, { label: "Formatie en bezetting" }]} /><Card><EmptyState title="Afgeschermde informatie" description="Individuele formatie- en kostengegevens zijn alleen zichtbaar voor de teamleider, beheerders en het management." /></Card></>);
  const edit = can(d.user.roles, "staffing.edit");
  const net = capacityFor(1, d.a).netto;
  const P = d.positions;
  const sum = (f: (p: Pos) => number) => P.reduce((s, p) => s + f(p), 0);
  const occ = (p: Pos) => (p.occupancy === "Bezet" ? p.fte : p.occupancy === "Deels bezet" ? p.occupied_fte ?? 0 : 0);
  const formal = sum((p) => (p.kind === "Vastgestelde formatie" ? p.fte : 0));
  const occupied = sum((p) => (p.kind === "Vastgestelde formatie" ? occ(p) : 0));
  const temp = sum((p) => (p.kind === "Tijdelijke inhuur" ? occ(p) : 0));
  const struct = sum((p) => (p.kind === "Structurele inhuur" ? occ(p) : 0));
  const sc = d.scenarios.find((s) => s.id === scenario);
  const baseline = d.scenarios.find((s) => s.is_baseline);

  return (
    <>
      <PageHeader title="Formatie en bezetting" crumbs={[{ label: "Organisatie" }, { label: "Formatie en bezetting" }]}
        description="Vastgestelde formatie, feitelijke bezetting, vacatures, inhuur en organisatiescenario's. Strategische pijlers zijn geen organisatorische teams."
        actions={<><PrintButton /><form method="post" action="/api/export/report"><input type="hidden" name="report" value="formatie" /><button name="format" value="xlsx" className="h-9 rounded-md border border-line-strong bg-surface px-3.5 text-sm hover:bg-surface-muted">Excel</button></form>
          {edit && <Dialog trigger="Nieuwe positie" triggerVariant="primary" title="Positie toevoegen" wide><PositionForm disciplines={d.disciplines} users={d.users} /></Dialog>}</>} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Stat label="Vastgestelde formatie" value={fmtFte(formal)} />
        <Stat label="Feitelijke bezetting" value={fmtFte(occupied)} />
        <Stat label="Vacatureruimte" value={fmtFte(formal - occupied)} tone={formal - occupied > 0 ? "warn" : undefined} />
        <Stat label="Tijdelijke inhuur" value={fmtFte(temp)} />
        <Stat label="Structurele inhuur" value={fmtFte(struct)} />
        <Stat label="Netto inzetbaar / jaar" value={fmtHours((occupied + temp + struct) * net)} sub={`${fmtHours(net)} per FTE`} />
        <Stat label="Personeelskosten" value={fmtEuro(sum((p) => (p.kind === "Vastgestelde formatie" ? p.annual_cost ?? 0 : 0)) || null, "Onbekend")} unknown={!P.some((p) => p.annual_cost)} />
      </div>
      <TabLinks base="/formatie" active={tab} tabs={[{ key: "overzicht", label: "Per discipline" }, { key: "posities", label: "Posities", count: P.length }, { key: "scenarios", label: "Scenario's", count: d.scenarios.length }, { key: "organogram", label: "Organogram" }]} />
      {tab === "overzicht" && (
        <Card><div className="overflow-x-auto"><table className="w-full text-[13px]"><caption className="sr-only">Formatie per discipline</caption>
          <thead className="bg-surface-muted text-left text-[12px] text-muted"><tr>{["Discipline", "Formatie", "Bezet", "Vacature", "Inhuur", "Netto inzetbaar", "Benodigd regulier", "Kritische expertise zonder borging"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{d.disciplines.map((dis) => {
            const ps = P.filter((p) => p.discipline_id === dis.id);
            const f = ps.filter((p) => p.kind === "Vastgestelde formatie").reduce((s, p) => s + p.fte, 0);
            const o = ps.filter((p) => p.kind === "Vastgestelde formatie").reduce((s, p) => s + occ(p), 0);
            const h = ps.filter((p) => p.kind !== "Vastgestelde formatie").reduce((s, p) => s + occ(p), 0);
            const req = d.required.find((r) => r.discipline_id === dis.id)?.hours ?? null;
            const sk = d.skills.find((s) => s.discipline_id === dis.id);
            const available = (o + h) * net;
            return (
              <tr key={dis.id} className="border-t border-line">
                <td className="px-3 py-2 font-medium">{dis.name}</td><td className="num px-3">{fmtFte(f)}</td><td className="num px-3">{fmtFte(o)}</td>
                <td className="num px-3">{f - o > 0 ? <Badge tone="warn">{fmtFte(f - o)}</Badge> : fmtFte(0)}</td><td className="num px-3">{fmtFte(h)}</td>
                <td className="num px-3">{fmtHours(available)}</td>
                <td className="num px-3">{req === null ? <span className="text-subtle">Nog niet geraamd</span> : <span className={req > available ? "text-bad font-medium" : ""}>{fmtHours(req)}</span>}</td>
                <td className="px-3">{sk?.uncovered ? <Badge tone="bad">{sk.uncovered} van {sk.critical}</Badge> : sk?.critical ? <Badge tone="ok">Geborgd</Badge> : <span className="text-subtle">—</span>}</td>
              </tr>);
          })}</tbody></table></div></Card>
      )}
      {tab === "posities" && (
        <Card>{P.length === 0 ? <EmptyState title="Nog geen posities vastgelegd" description="Leg de vastgestelde formatie en bezetting vast (zonder onnodige persoonsgegevens)." /> : (
          <table className="w-full text-[13px]"><caption className="sr-only">Posities</caption>
            <thead className="bg-surface-muted text-left text-[12px] text-muted"><tr>{["Functie", "Discipline", "Subteam", "FTE", "Soort", "Bezetting", "Kosten", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{P.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-3 py-2">{edit ? <Dialog trigger={p.title} triggerVariant="ghost" triggerSize="sm" title="Positie bewerken" wide><PositionForm p={p} disciplines={d.disciplines} users={d.users} /></Dialog> : p.title}{p.user_name && <div className="text-[12px] text-muted">{p.user_name}</div>}</td>
                <td className="px-3">{p.discipline}</td><td className="px-3">{p.subteam ?? "—"}</td><td className="num px-3">{fmtFte(p.fte)}</td><td className="px-3">{p.kind}</td>
                <td className="px-3"><Badge tone={p.occupancy === "Bezet" ? "ok" : p.occupancy === "Vacature" ? "warn" : "info"}>{p.occupancy}{p.occupancy === "Deels bezet" ? ` ${fmtFte(p.occupied_fte)}` : ""}</Badge></td>
                <td className="num px-3">{fmtEuro(p.annual_cost, "—")}</td><td className="px-3 text-right">{edit && <ArchivePositionButton id={p.id} />}</td>
              </tr>))}</tbody></table>)}
        </Card>
      )}
      {tab === "scenarios" && (
        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            {d.scenarios.map((s) => (
              <Link key={s.id} href={`/formatie?tab=scenarios&scenario=${s.id}`} className={`block rounded-lg border bg-surface p-3 ${s.id === scenario ? "border-primary" : "border-line hover:border-line-strong"}`}>
                <div className="flex items-center justify-between font-medium">{s.name}{s.is_baseline && <Badge>Referentie</Badge>}</div>
                <div className="num mt-1 text-[12px] text-muted">{s.n} posities · {fmtFte(s.fte, "0 fte")} · personeel {fmtEuro(s.cost, "onbekend")} · inhuur {fmtEuro(s.hire_cost, "onbekend")}</div>
              </Link>
            ))}
            {edit && <Dialog trigger="Nieuw scenario" title="Nieuw organisatiescenario"><ScenarioForm /></Dialog>}
          </div>
          {sc ? (
            <Card><CardHeader title={sc.name} description={sc.description ?? undefined} actions={edit ? <><CopyBaselineButton scenarioId={sc.id} /><Dialog trigger="Bewerken" triggerSize="sm" title="Scenario bewerken"><ScenarioForm s={sc} /></Dialog></> : undefined} />
              <CardBody className="space-y-4">
                {sc.structure_notes && <p className="whitespace-pre-wrap text-sm">{sc.structure_notes}</p>}
                {(() => {
                  const fte = d.scenarioPositions.reduce((s, p) => s + p.fte, 0);
                  const reqTotal = d.required.reduce((s, r) => s + (r.hours ?? 0), 0);
                  const curFte = occupied + temp + struct;
                  const missing = d.disciplines.filter((x) => (d.required.find((r) => r.discipline_id === x.id)?.hours ?? 0) > 0 && !d.scenarioPositions.some((p) => p.discipline_id === x.id));
                  const single = d.disciplines.filter((x) => { const v = d.scenarioPositions.filter((p) => p.discipline_id === x.id && p.kind === "Intern").reduce((s, p) => s + p.fte, 0); return v > 0 && v < 1.5; });
                  return (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <Stat label="FTE" value={fmtFte(fte)} sub={`${fte - curFte >= 0 ? "+" : ""}${fmtFte(fte - curFte)} t.o.v. huidig`} />
                      <Stat label="Beschikbaar (netto)" value={fmtHours(fte * net)} />
                      <Stat label="Benodigd regulier" value={reqTotal ? fmtHours(reqTotal) : "Nog niet geraamd"} unknown={!reqTotal} sub="excl. projecten" />
                      <Stat label="Personeel / inhuur" value={<span className="text-[15px]">{fmtEuro(sc.cost, "?")} / {fmtEuro(sc.hire_cost, "?")}</span>} />
                      <div className="col-span-2 md:col-span-4 text-[13px]">
                        <strong>Ontbrekende expertise:</strong> {missing.length ? missing.map((m) => m.name).join(", ") : "geen (op basis van geraamde reguliere werkzaamheden)"}<br />
                        <strong>Kwetsbaarheden (interne bezetting &lt; 1,5 fte):</strong> {single.length ? single.map((m) => m.name).join(", ") : "geen"}
                      </div>
                    </div>
                  );
                })()}
                <table className="w-full text-[13px]"><caption className="sr-only">Posities in scenario</caption>
                  <thead className="text-left text-[12px] text-muted"><tr><th className="py-1">Discipline</th><th>Subteam</th><th>Functie</th><th>FTE</th><th>Soort</th><th>Kosten</th><th /></tr></thead>
                  <tbody>{d.scenarioPositions.map((p) => <tr key={p.id} className="border-t border-line"><td className="py-1.5">{p.discipline}</td><td>{p.subteam ?? "—"}</td><td>{p.title}</td><td className="num">{fmtFte(p.fte)}</td><td>{p.kind}</td><td className="num">{fmtEuro(p.annual_cost, "—")}</td><td className="text-right">{edit && <RemoveScenarioPosition id={p.id} />}</td></tr>)}
                    {!d.scenarioPositions.length && <tr><td className="py-2 text-muted" colSpan={7}>Nog geen posities in dit scenario.</td></tr>}</tbody></table>
                {edit && <ScenarioPositionForm scenarioId={sc.id} disciplines={d.disciplines} />}
                {baseline && baseline.id !== sc.id && <p className="text-[12px] text-muted">Vergelijk met referentiescenario &apos;{baseline.name}&apos;: {fmtFte(baseline.fte, "0 fte")}.</p>}
              </CardBody></Card>
          ) : <Card><EmptyState title="Kies een scenario" description="Vergelijk FTE, kosten, beschikbare en benodigde capaciteit, ontbrekende expertise en kwetsbaarheden." /></Card>}
        </div>
      )}
      {tab === "organogram" && (
        <Card><CardHeader title="Organogram (huidige formatie)" description="Gegroepeerd per subteam en discipline" /><CardBody>
          {P.length === 0 ? <p className="text-sm text-muted">Nog geen posities vastgelegd.</p> : (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-md border-2 border-primary bg-primary-soft px-4 py-2 font-semibold text-primary">Team Digitale Informatie</div>
              <div className="flex flex-wrap justify-center gap-4">
                {[...new Set(P.map((p) => p.subteam ?? "Zonder subteam"))].map((st) => (
                  <div key={st} className="min-w-56 rounded-lg border border-line bg-surface">
                    <div className="border-b border-line bg-surface-muted px-3 py-1.5 text-[13px] font-semibold">{st}</div>
                    <ul className="p-2 text-[13px]">{P.filter((p) => (p.subteam ?? "Zonder subteam") === st).map((p) => (
                      <li key={p.id} className="flex justify-between gap-3 py-0.5"><span>{p.title} <span className="text-muted">· {p.discipline}</span></span><span className="num">{fmtFte(p.fte)}{p.occupancy !== "Bezet" ? " *" : ""}</span></li>))}</ul>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-muted">* niet (volledig) bezet</p>
            </div>
          )}
        </CardBody></Card>
      )}
    </>
  );
}
