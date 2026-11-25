"use client";
import { AsyncPage, notFound, spObject } from "@/components/async-page";
import Link from "next/link";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { auditFor } from "@/server/queries/topics";
import { getSettings } from "@/server/queries/dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TabLinks } from "@/components/ui/tabs";
import { Badge, Maturity, PriorityBadge, StatusBadge, MATURITY_LABELS } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { DescriptionList, Text } from "@/components/ui/dl";
import { PillarForm } from "@/components/pillar-form";
import { MaturityForm } from "@/components/topics/maturity-form";
import { MaturityGap } from "@/components/maturity-gap";
import { PriorityDistribution } from "@/components/pillar-card";
import { History } from "@/components/common/history";
import { Comments } from "@/components/common/comments";
import { LinkButton } from "@/components/ui/button";
import { fmtDate, fmtEuro, fmtHours, fmtPct } from "@/lib/format";

type Row = Record<string, unknown> & { id: string };

export default function PillarPage() {
  return <AsyncPage render={async (__sp) => {
    const searchParams = Promise.resolve(spObject(__sp));
    const params = Promise.resolve({ id: __sp.get("id") ?? "", nummer: __sp.get("nr") ?? "" });

  const { nummer } = await params;
  const { tab = "overzicht" } = await searchParams;
  const n = Number(nummer);
  if (!Number.isInteger(n)) notFound();
  const d = await db(async (x, user) => {
    const p = await x.one<Row & { number: number; title: string; objective: string; description: string | null; responsible: string | null; maturity_current: number | null;
      maturity_target: number | null; maturity_rationale: string | null; ambition_year: string | null; ambition_multi_year: string | null; progress_pct: number | null; updated_at: string }>(
      `select p.*, u.display_name as responsible from pillars p left join users u on u.id = p.responsible_user_id where p.number = $1`, [n]);
    if (!p) return null;
    const settings = await getSettings(x);
    const year = Number(settings["jaarplan.actief_jaar"] ?? 2027);
    const q = <T,>(sql: string, args: unknown[] = [p.id]) => x.query<T>(sql, args);
    const [results, topics, programs, projects, risks, kpis, recurring, decisions, deps, budget, comments] = await Promise.all([
      q<{ text: string }>(`select text from pillar_objectives where pillar_id = $1 and kind = 'gewenst_resultaat' order by sort_order`),
      q<{ id: string; code: string; title: string; status: string; priority_category: string | null; priority_is_final: boolean; maturity_current: number | null; maturity_target: number | null;
        required_capacity_hours: number | null; program_name: string | null; flags: boolean }>(
        `select t.id, t.code, t.title, t.status, t.priority_category, t.priority_is_final, t.maturity_current, t.maturity_target, t.required_capacity_hours, g.name as program_name,
                (t.flag_legal or t.flag_hard_deadline or t.flag_acute_risk or t.flag_admin_decided) as flags
           from topics t left join programs g on g.id = t.program_id where t.pillar_id = $1 and t.archived_at is null and t.status <> 'Samengevoegd'
          order by string_to_array(t.code,'.')::int[]`),
      q<{ id: string; code: string; name: string; status: string; topics: number }>(
        `select g.id, g.code, g.name, g.status, (select count(*) from topics t where t.program_id = g.id and t.archived_at is null)::int as topics from programs g where g.pillar_id = $1 and g.archived_at is null order by code`),
      q<{ id: string; number: string; name: string; status: string; progress_pct: number | null; primary: boolean; hours_required: number | null; start_date: string | null; end_date: string | null }>(
        `select j.id, j.number, j.name, j.status, j.progress_pct, j.primary_pillar_id = $1 as primary, j.hours_required, j.start_date, j.end_date from projects j
          where j.archived_at is null and (j.primary_pillar_id = $1 or exists (select 1 from project_pillars pp where pp.project_id = j.id and pp.pillar_id = $1)) order by j.number`),
      q<{ id: string; number: string; title: string; stage: string; gross_score: number | null; residual_score: number | null }>(
        `select id, number, title, stage, gross_score, residual_score from risks where pillar_id = $1 and archived_at is null order by coalesce(residual_score, gross_score) desc nulls last`),
      q<{ id: string; name: string; unit: string | null; target_value: number | null; latest: number | null }>(
        `select k.id, k.name, k.unit, k.target_value, (select value from kpi_measurements m where m.kpi_id = k.id order by measured_on desc limit 1) as latest
           from kpis k where k.pillar_id = $1 and k.archived_at is null order by name`),
      q<{ id: string; name: string; hours: number | null; criticality: string | null }>(
        `select id, name, coalesce(hours_per_year, hours_per_occurrence * occurrences_per_year) as hours, criticality from recurring_activities where pillar_id = $1 and archived_at is null order by name`),
      q<{ id: string; number: string; subject: string; outcome: string; decision_date: string | null }>(
        `select id, number, subject, outcome, decision_date from decisions where archived_at is null and (pillar_id = $1 or project_id in (select id from projects where primary_pillar_id = $1)) order by created_at desc`),
      q<{ a: string; b: string; a_id: string; b_id: string; kind: string }>(
        `select ja.number || ' ' || ja.name as a, jb.number || ' ' || jb.name as b, ja.id as a_id, jb.id as b_id, d.kind
           from project_dependencies d join projects ja on ja.id = d.project_id join projects jb on jb.id = d.depends_on_project_id
          where ja.primary_pillar_id = $1 or jb.primary_pillar_id = $1`),
      can(user.roles, "finance.view") ? q<{ kind: string; total: number }>(`select kind, sum(amount) as total from budgets where pillar_id = $1 and year = $2 group by kind`, [p.id, year]) : Promise.resolve(null),
      x.query<{ id: string; body: string; created_at: string; by_name: string | null }>(
        `select c.id, c.body, c.created_at, u.display_name as by_name from comments c left join users u on u.id = c.created_by
          where c.entity_type = 'pillar' and c.entity_id = $1 and c.archived_at is null order by c.created_at desc`, [p.id]),
    ]);
    const users = await x.query<{ id: string; display_name: string }>(`select id, display_name from users where is_active order by display_name`);
    const history = can(user.roles, "audit.view") ? await auditFor(x, "pillars", [p.id], 30) : [];
    return { p, results, topics, programs, projects, risks, kpis, recurring, decisions, deps, budget, comments, users, history, user, year, settings };
  });
  if (!d) notFound();
  const { p, user } = d;
  const canEdit = can(user.roles, "pillars.edit");
  const reqTopics = d.topics.reduce((s, t) => (t.required_capacity_hours === null ? s : s + t.required_capacity_hours), 0);
  const reqRecurring = d.recurring.reduce((s, r) => (r.hours === null ? s : s + r.hours), 0);
  const anyReq = d.topics.some((t) => t.required_capacity_hours !== null) || d.recurring.some((r) => r.hours !== null);
  const progress = p.progress_pct ?? (d.projects.filter((x) => x.progress_pct !== null && x.primary).length
    ? d.projects.filter((x) => x.progress_pct !== null && x.primary).reduce((s, x) => s + x.progress_pct!, 0) / d.projects.filter((x) => x.progress_pct !== null && x.primary).length : null);
  const pc = (c: string) => d.topics.filter((t) => t.priority_category === c).length;
  const budgetReq = d.budget?.find((b) => b.kind === "Benodigd")?.total ?? null;
  const budgetAvail = d.budget?.find((b) => b.kind === "Beschikbaar")?.total ?? null;

  return (
    <>
      <PageHeader title={<><span className="font-normal text-muted">Pijler {p.number} · </span>{p.title}</>} description={p.objective}
        crumbs={[{ label: "Strategie" }, { label: "Strategische pijlers", href: "/pijlers" }, { label: `Pijler ${p.number}` }]}
        actions={<><LinkButton href={`/deepdive/pijler?nr=${p.number}`} variant="primary">Deepdive starten</LinkButton><LinkButton href={`/inventarisatie?pillar=${p.number}`}>In inventarisatie</LinkButton></>} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="Onderwerpen" value={d.topics.length} />
        <Stat label="Programma's" value={d.programs.length} />
        <Stat label="Projecten" value={d.projects.length} sub={`${d.projects.filter((x) => x.status === "In uitvoering").length} in uitvoering`} />
        <Stat label="Voortgang" value={fmtPct(progress)} unknown={progress === null} />
        <Stat label="Open risico's" value={d.risks.filter((r) => r.stage === "Signaal" || r.stage === "Gevalideerd").length} />
        <Stat label="Benodigde capaciteit" value={anyReq ? fmtHours(reqTopics + reqRecurring) : "Nog niet geraamd"} unknown={!anyReq} sub="onderwerpen + regulier" />
        <Stat label="Budget benodigd" value={d.budget ? fmtEuro(budgetReq, "Nog niet geraamd") : "Afgeschermd"} unknown={!d.budget || budgetReq === null} />
        <Stat label="Budget beschikbaar" value={d.budget ? fmtEuro(budgetAvail, "Onbekend") : "Afgeschermd"} unknown={!d.budget || budgetAvail === null} />
      </div>
      <TabLinks base={`/pijlers/detail?nr=${p.number}`} active={tab} tabs={[
        { key: "overzicht", label: "Overzicht" }, { key: "onderwerpen", label: "Onderwerpen", count: d.topics.length },
        { key: "portfolio", label: "Programma's en projecten", count: d.programs.length + d.projects.length }, { key: "volwassenheid", label: "Volwassenheid" },
        { key: "governance", label: "KPI's, risico's en besluiten" }, { key: "regulier", label: "Reguliere werkzaamheden", count: d.recurring.length },
        ...(canEdit ? [{ key: "bewerken", label: "Bewerken" }] : []), { key: "historie", label: "Historie en opmerkingen" },
      ]} />

      {tab === "overzicht" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardHeader title="Strategie" /><CardBody>
            <DescriptionList items={[
              { label: "Strategische doelstelling", value: p.objective }, { label: "Omschrijving", value: <Text value={p.description} /> },
              { label: "Ambitie voor 2027", value: <Text value={p.ambition_year} /> }, { label: "Meerjarenambitie", value: <Text value={p.ambition_multi_year} /> },
            ]} />
            <h3 className="mt-5 text-[12px] font-medium uppercase tracking-wide text-muted">Gewenste resultaten</h3>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{d.results.map((r, i) => <li key={i}>{r.text}</li>)}</ul>
          </CardBody></Card>
          <Card><CardHeader title="Kenmerken" /><CardBody>
            <DescriptionList cols={1} items={[
              { label: "Verantwoordelijke", value: <Text value={p.responsible} empty="Nog niet bepaald" /> },
              { label: "Huidige volwassenheid", value: <Maturity level={p.maturity_current} /> },
              { label: "Gewenste volwassenheid", value: p.maturity_target ? `${p.maturity_target} · ${MATURITY_LABELS[p.maturity_target]}` : <Text value={null} empty="Nog niet bepaald" /> },
              { label: "Prioriteitsverdeling onderwerpen", value: <PriorityDistribution p1={pc("P1")} p2={pc("P2")} p3={pc("P3")} p4={pc("P4")} unprioritized={d.topics.filter((t) => !t.priority_category && t.status !== "Niet relevant").length} /> },
              { label: "Afhankelijkheden", value: d.deps.length ? <ul className="space-y-0.5">{d.deps.map((x, i) => <li key={i}>{x.a} <span className="text-muted">hangt af van</span> {x.b}</li>)}</ul> : <Text value={null} empty="Geen projectafhankelijkheden" /> },
              { label: "Laatste update", value: fmtDate(p.updated_at) },
            ]} />
          </CardBody></Card>
        </div>
      )}

      {tab === "onderwerpen" && (
        <Card>
          <table className="w-full text-[13px]"><caption className="sr-only">Onderwerpen</caption>
            <thead className="bg-surface-muted text-left text-[12px] text-muted"><tr>{["ID", "Titel", "Programma", "Volwassenheid", "Prioriteit", "Status"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{d.topics.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="num px-3 py-2 text-muted">{t.code}</td>
                <td className="px-3 py-2"><Link className="font-medium hover:text-primary hover:underline" href={`/onderwerpen/detail?id=${t.id}`}>{t.title}</Link>{t.flags && <Badge tone="accent" className="ml-1">Verplicht/urgent</Badge>}</td>
                <td className="px-3 py-2">{t.program_name ?? <span className="text-subtle">—</span>}</td>
                <td className="px-3 py-2"><Maturity level={t.maturity_current} /></td>
                <td className="px-3 py-2"><PriorityBadge category={t.priority_category} final={t.priority_category ? t.priority_is_final : undefined} /></td>
                <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
              </tr>))}</tbody>
          </table>
        </Card>
      )}

      {tab === "portfolio" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader title="Programma's" /><ul className="divide-y divide-line text-sm">
            {d.programs.map((g) => <li key={g.id} className="flex justify-between px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/programmas/detail?id=${g.id}`}>{g.name}</Link><span className="text-muted">{g.topics} onderwerpen · <StatusBadge status={g.status} /></span></li>)}
            {!d.programs.length && <li className="px-5 py-4 text-muted">Nog geen programma&apos;s.</li>}</ul></Card>
          <Card><CardHeader title="Projecten" description="Primaire pijler of bijdragend (secundair)" /><ul className="divide-y divide-line text-sm">
            {d.projects.map((j) => <li key={j.id} className="flex justify-between gap-2 px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/projecten/detail?id=${j.id}`}>{j.number} {j.name}</Link><span className="flex items-center gap-1">{!j.primary && <Badge>Secundair</Badge>}<StatusBadge status={j.status} /></span></li>)}
            {!d.projects.length && <li className="px-5 py-4 text-muted">Nog geen projecten.</li>}</ul></Card>
        </div>
      )}

      {tab === "volwassenheid" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <Card><CardHeader title="Maturity gap per onderwerp" /><CardBody><MaturityGap rows={d.topics.map((t) => ({ id: t.id, code: t.code, title: t.title, current: t.maturity_current, target: t.maturity_target }))} /></CardBody></Card>
          <Card><CardHeader title="Volwassenheid van de pijler" description={p.maturity_rationale ?? undefined} /><CardBody>
            {canEdit ? <MaturityForm pillarId={p.id} current={p.maturity_current} target={p.maturity_target} /> : <Maturity level={p.maturity_current} />}
          </CardBody></Card>
        </div>
      )}

      {tab === "governance" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card><CardHeader title="KPI's" actions={<Link className="text-[13px] text-primary hover:underline" href="/kpis">Alle KPI&apos;s</Link>} /><ul className="divide-y divide-line text-sm">
            {d.kpis.map((k) => <li key={k.id} className="px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/kpis/detail?id=${k.id}`}>{k.name}</Link><div className="text-[12px] text-muted">Actueel: {k.latest ?? "onbekend"}{k.unit ? ` ${k.unit}` : ""} · streef: {k.target_value ?? "nog niet vastgesteld"}</div></li>)}
            {!d.kpis.length && <li className="px-5 py-4 text-muted">Geen KPI&apos;s gekoppeld.</li>}</ul></Card>
          <Card><CardHeader title="Risico's" /><ul className="divide-y divide-line text-sm">
            {d.risks.map((r) => <li key={r.id} className="flex justify-between px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/risicos/detail?id=${r.id}`}>{r.number} {r.title}</Link><StatusBadge status={r.stage} /></li>)}
            {!d.risks.length && <li className="px-5 py-4 text-muted">Geen risico&apos;s geregistreerd.</li>}</ul></Card>
          <Card><CardHeader title="Besluiten" /><ul className="divide-y divide-line text-sm">
            {d.decisions.map((x) => <li key={x.id} className="flex justify-between px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/besluiten/detail?id=${x.id}`}>{x.number} {x.subject}</Link><StatusBadge status={x.outcome} /></li>)}
            {!d.decisions.length && <li className="px-5 py-4 text-muted">Geen besluiten gekoppeld.</li>}</ul></Card>
        </div>
      )}

      {tab === "regulier" && (
        <Card><ul className="divide-y divide-line text-sm">
          {d.recurring.map((r) => <li key={r.id} className="flex justify-between px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/reguliere-werkzaamheden/detail?id=${r.id}`}>{r.name}</Link><span className="num text-muted">{fmtHours(r.hours, "uren onbekend")}{r.criticality ? ` · ${r.criticality}` : ""}</span></li>)}
          {!d.recurring.length && <li className="px-5 py-4 text-muted">Geen reguliere werkzaamheden gekoppeld.</li>}</ul></Card>
      )}

      {tab === "bewerken" && canEdit && <Card><CardBody><PillarForm p={p} results={d.results.map((r) => r.text)} users={d.users} /></CardBody></Card>}
      {tab === "historie" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader title="Wijzigingshistorie" /><CardBody><History entries={d.history} allowed={can(user.roles, "audit.view")} /></CardBody></Card>
          <Card><CardHeader title="Opmerkingen" /><CardBody><Comments entityType="pillar" entityId={p.id} comments={d.comments} canAdd={can(user.roles, "comments.add")} /></CardBody></Card>
        </div>
      )}
    </>
  );

  }} />;
}
