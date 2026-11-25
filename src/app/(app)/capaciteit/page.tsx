"use client";
import { AsyncPage, spObject } from "@/components/async-page";
import Link from "next/link";
import { GetForm } from "@/components/common/get-form";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { getSettings } from "@/server/queries/dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AssumptionsForm, EstablishCapacityButton } from "@/components/organisation/forms";
import { capacityFor, extraFteNeeded, loadStatus, type CapacityAssumptions } from "@/lib/capacity";
import { fmtFte, fmtHours } from "@/lib/format";
import { PrintButton } from "@/components/common/print-button";

const TONE: Record<string, string> = { Overbelast: "bg-bad-bg text-bad", Krap: "bg-warn-bg text-warn", "In balans": "bg-ok-bg text-ok", Onderbenut: "bg-info-bg text-info", Onbekend: "bg-surface-muted text-subtle" };

export default function CapacityPage() {
  return <AsyncPage render={async (__sp) => {
    const searchParams = Promise.resolve(spObject(__sp));

  const sp = await searchParams;
  const d = await db(async (x, user) => {
    const s = await getSettings(x);
    const year = Number(sp.jaar ?? s["jaarplan.actief_jaar"] ?? 2027);
    const a = s["capaciteit.aannames"] as CapacityAssumptions;
    const alloc = await x.query<{ quarter: number; discipline_id: string; kind: string; hours: number }>(
      `select p.quarter, a.discipline_id, a.kind, sum(a.hours) as hours from capacity_allocations a join capacity_periods p on p.id = a.period_id
        where p.year = $1 and a.scenario_id is null group by 1,2,3`, [year]);
    const disciplines = await x.query<{ id: string; name: string }>(`select id, name from disciplines order by sort_order`);
    const demand = await x.query<{ id: string; kind: string; label: string; priority: string | null; score: number | null; hours: number; protected: boolean }>(
      `select * from (
         select j.id, 'project' as kind, j.number || ' ' || j.name as label, j.priority_category as priority, j.priority_score as score, j.hours_required as hours, false as protected
           from projects j where j.archived_at is null and j.status not in ('Afgerond','Geannuleerd','Idee') and j.hours_required is not null
            and (j.start_date is null or extract(year from j.start_date) <= $1) and (j.end_date is null or extract(year from j.end_date) >= $1)
         union all
         select t.id, 'topic', t.code || ' ' || t.title, t.priority_category, t.priority_score, t.required_capacity_hours,
                (t.flag_legal or t.flag_hard_deadline or t.flag_acute_risk or t.flag_admin_decided)
           from topics t where t.archived_at is null and t.status in ('Gevalideerd','In beoordeling') and t.required_capacity_hours is not null
            and not exists (select 1 from project_topics pt where pt.topic_id = t.id)
       ) x order by protected desc, priority nulls last, score desc nulls last`, [year]);
    const scenarios = can(user.roles, "staffing.view") ? await x.query<{ id: string; name: string }>(`select id, name from staffing_scenarios order by is_baseline desc, created_at`) : [];
    const scenarioFte = sp.scenario && can(user.roles, "staffing.view") ? await x.query<{ discipline_id: string; fte: number }>(
      `select discipline_id, sum(fte) as fte from staffing_scenario_positions where scenario_id = $1 group by discipline_id`, [sp.scenario]) : null;
    const skillsGap = await x.query<{ name: string; discipline: string | null }>(
      `select s.name, d.name as discipline from skills s left join disciplines d on d.id = s.discipline_id where s.is_critical order by d.sort_order, s.name`);
    return { year, a, alloc, disciplines, demand, scenarios, scenarioFte, skillsGap, user };
  });
  const sumK = (kind: string[], disc?: string, q?: number) => d.alloc.filter((r) => kind.includes(r.kind) && (!disc || r.discipline_id === disc) && (!q || r.quarter === q)).reduce((s, r) => s + r.hours, 0);
  const established = d.alloc.length > 0;
  const avail = sumK(["Beschikbaar"]);
  const regular = sumK(["Regulier"]);
  const reserved = sumK(["Reservering"]);
  const project = sumK(["Project"]);
  const changeCap = avail - regular - reserved;
  const shortage = established ? regular + reserved + project - avail : null;
  const per = capacityFor(1, d.a);
  // Wat past binnen de verandercapaciteit? (beschermde initiatieven eerst, daarna op prioriteit)
  let left = established ? changeCap : 0;
  const fit = d.demand.map((x) => { const ok = established && left >= x.hours; if (ok) left -= x.hours; return { ...x, ok }; });
  const canEdit = can(d.user.roles, "capacity.edit");
  const netQ = capacityFor(1, d.a, 0, 0.25).netto;

  return (
    <>
      <PageHeader title={`Capaciteitsplanning ${d.year}`} crumbs={[{ label: "Organisatie" }, { label: "Capaciteitsplanning" }]}
        description="Netto inzetbaar = contracturen − niet-inzetbare uren. Verandercapaciteit = netto − reguliere werkzaamheden − overige reserveringen. Tekort = benodigd − beschikbaar."
        actions={<><nav className="flex gap-1">{[d.year - 1, d.year, d.year + 1].map((y) => <Link key={y} href={`/capaciteit?jaar=${y}`} className={`rounded-md border px-3 py-1.5 text-sm ${y === d.year ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface"}`}>{y}</Link>)}</nav>
          <PrintButton />{canEdit && <EstablishCapacityButton year={d.year} />}</>} />
      {!established && <p className="mb-4 rounded-md bg-info-bg px-3 py-2 text-sm text-info">Voor {d.year} is nog geen capaciteitsplanning vastgesteld. {canEdit ? "Leg formatie, reguliere werkzaamheden (uren) en projecturen vast en kies 'Planning vaststellen'." : "De teamleider stelt de planning vast."} Tot die tijd zijn de cijfers onbekend.</p>}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Stat label="Netto beschikbaar" value={established ? fmtHours(avail) : "Onbekend"} unknown={!established} />
        <Stat label="Reguliere werkzaamheden" value={established ? fmtHours(regular) : "Onbekend"} unknown={!established} />
        <Stat label="Reserveringen" value={established ? fmtHours(reserved) : "Onbekend"} unknown={!established} sub="incidenten, management" />
        <Stat label="Verandercapaciteit" value={established ? fmtHours(changeCap) : "Onbekend"} unknown={!established} tone={established && changeCap < 0 ? "bad" : undefined} sub="beschikbare projecturen" />
        <Stat label="Projecturen gepland" value={established ? fmtHours(project) : "Onbekend"} unknown={!established} />
        <Stat label="Capaciteitstekort" value={shortage === null ? "Onbekend" : fmtHours(Math.max(0, shortage))} unknown={shortage === null} tone={shortage !== null && shortage > 0 ? "bad" : shortage !== null ? "ok" : undefined} sub={shortage !== null && shortage < 0 ? `overschot ${fmtHours(-shortage)}` : undefined} />
        <Stat label="Extra FTE nodig" value={shortage === null ? "Onbekend" : fmtFte(extraFteNeeded(shortage, d.a))} unknown={shortage === null} sub="of externe inhuur" />
      </div>
      <Card className="mb-4"><CardHeader title="Capaciteitsheatmap per kwartaal en discipline" description="Belasting = (regulier + project + reserveringen) / netto beschikbaar" /><CardBody>
        {!established ? <EmptyState title="Nog geen vastgestelde planning" /> : (
          <div className="overflow-x-auto"><table className="w-full text-[13px]"><caption className="sr-only">Heatmap capaciteit</caption>
            <thead className="text-left text-[12px] text-muted"><tr><th className="py-1">Discipline</th>{[1, 2, 3, 4].map((q) => <th key={q} className="px-1">Q{q}</th>)}<th className="px-1">Jaar</th></tr></thead>
            <tbody>{d.disciplines.map((dis) => {
              const cells = [1, 2, 3, 4].map((q) => ({ av: sumK(["Beschikbaar"], dis.id, q), req: sumK(["Regulier", "Project", "Reservering"], dis.id, q) }));
              if (cells.every((c) => !c.av && !c.req)) return null;
              const yr = { av: sumK(["Beschikbaar"], dis.id), req: sumK(["Regulier", "Project", "Reservering"], dis.id) };
              return (
                <tr key={dis.id}>
                  <th scope="row" className="py-1 pr-3 text-left font-medium">{dis.name}</th>
                  {[...cells, yr].map((c, i) => { const st = loadStatus(c.req, c.av); return (
                    <td key={i} className="p-0.5"><div className={`rounded px-2 py-1.5 ${TONE[st]}`} title={`${st}: ${fmtHours(c.req)} gevraagd / ${fmtHours(c.av)} beschikbaar`}>
                      <div className="text-[12px] font-semibold">{st}{c.av > 0 ? ` · ${Math.round((c.req / c.av) * 100)}%` : ""}</div>
                      <div className="num text-[11px] opacity-90">{Math.round(c.req)} / {Math.round(c.av)} u</div>
                    </div></td>); })}
                </tr>);
            })}</tbody></table></div>
        )}
      </CardBody></Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Uitvoerbaarheid initiatieven" description="Verplichte/urgente initiatieven eerst, daarna op prioriteit, tegen de verandercapaciteit" /><CardBody>
          {fit.length === 0 ? <p className="text-sm text-muted">Nog geen initiatieven met een urenraming.</p> : (
            <ul className="space-y-1 text-[13px]">{fit.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-2 border-b border-line py-1 last:border-0">
                <Link href={x.kind === "project" ? `/projecten/detail?id=${x.id}` : `/onderwerpen/detail?id=${x.id}`} className="min-w-0 truncate hover:underline">{x.label}</Link>
                <span className="flex shrink-0 items-center gap-1.5"><PriorityBadge category={x.priority} />{x.protected && <Badge tone="accent">Verplicht</Badge>}<span className="num text-muted">{fmtHours(x.hours)}</span>
                  {!established ? <Badge>Onbekend</Badge> : x.ok ? <Badge tone="ok">Past</Badge> : <Badge tone="bad">Onvoldoende capaciteit</Badge>}</span>
              </li>))}</ul>)}
        </CardBody></Card>
        <div className="space-y-4">
          {d.scenarios.length > 0 && (
            <Card><CardHeader title="Scenario doorrekenen" description="Rekent beschikbaarheid door zonder de vastgestelde planning te wijzigen" /><CardBody className="space-y-3">
              <GetForm path="/capaciteit" className="flex gap-2"><input type="hidden" name="jaar" value={d.year} />
                <label htmlFor="cap-sc" className="sr-only">Scenario</label>
                <select id="cap-sc" name="scenario" defaultValue={sp.scenario ?? ""} className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm"><option value="">Kies scenario…</option>{d.scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                <button className="h-9 rounded-md border border-line-strong bg-surface px-3 text-sm">Doorrekenen</button></GetForm>
              {d.scenarioFte && (
                <table className="w-full text-[13px]"><caption className="sr-only">Scenario-uitkomst</caption>
                  <thead className="text-left text-[12px] text-muted"><tr><th className="py-1">Discipline</th><th>Scenario beschikbaar</th><th>Gevraagd ({d.year})</th><th>Status</th></tr></thead>
                  <tbody>{d.disciplines.map((dis) => { const fte = d.scenarioFte!.find((s) => s.discipline_id === dis.id)?.fte ?? 0; const av = fte * netQ * 4; const req = sumK(["Regulier", "Project", "Reservering"], dis.id);
                    if (!av && !req) return null; const st = loadStatus(req, av);
                    return <tr key={dis.id} className="border-t border-line"><td className="py-1">{dis.name}</td><td className="num">{fmtHours(av)}</td><td className="num">{established ? fmtHours(req) : "Onbekend"}</td><td><span className={`rounded px-1.5 py-0.5 text-[12px] ${TONE[established ? st : "Onbekend"]}`}>{established ? st : "Onbekend"}</span></td></tr>; })}</tbody></table>
              )}
            </CardBody></Card>
          )}
          <Card><CardHeader title="Rekenaannames per FTE per jaar" /><CardBody className="space-y-3">
            <table className="w-full text-[13px]"><caption className="sr-only">Opbouw netto inzetbare uren</caption><tbody>
              {[["Contracturen", per.contracturen], ["− Vakantie en verlof", per.verlof], ["− Feestdagen", per.feestdagen], ["− Verwachte afwezigheid", per.afwezigheid], ["− Overleg", per.overleg], ["− Opleiding", per.opleiding], ["= Netto inzetbaar", per.netto], ["− Incidenten/onvoorzien", per.incidenten], ["− Managementtaken", per.management], ["= Verandercapaciteit (vóór regulier)", per.netto - per.incidenten - per.management]].map(([l, v]) => (
                <tr key={String(l)} className={String(l).startsWith("=") ? "border-t border-line font-semibold" : ""}><td className="py-0.5">{l}</td><td className="num text-right">{fmtHours(Number(v))}</td></tr>))}
            </tbody></table>
            {canEdit && <details><summary className="cursor-pointer text-[13px] text-primary">Aannames wijzigen</summary><div className="mt-3"><AssumptionsForm a={d.a} /></div></details>}
          </CardBody></Card>
          <Card><CardHeader title="Kritische expertise" actions={<Link href="/expertise" className="text-[13px] text-primary hover:underline">Beheren</Link>} /><CardBody>
            {d.skillsGap.length ? <ul className="text-[13px]">{d.skillsGap.map((s) => <li key={s.name}>{s.name}{s.discipline ? <span className="text-muted"> · {s.discipline}</span> : null}</li>)}</ul> : <p className="text-sm text-muted">Nog geen kritische expertise vastgelegd.</p>}
          </CardBody></Card>
        </div>
      </div>
    </>
  );

  }} />;
}
