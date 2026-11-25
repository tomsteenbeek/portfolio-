import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { getProject } from "@/server/queries/projects";
import { lookups, auditFor } from "@/server/queries/topics";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TabLinks } from "@/components/ui/tabs";
import { Badge, PriorityBadge, Rag, StatusBadge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { DescriptionList, Text } from "@/components/ui/dl";
import { ProjectForm } from "@/components/projects/project-form";
import { AttachmentForm, DependencyForm, ExpenseForm, MemberForm, MilestoneForm, MilestoneStatus, RemoveDependency, RemoveMember, TaskForm, TaskStatus, UpdateForm } from "@/components/projects/project-subforms";
import { FeasibilityForm } from "@/components/priority/feasibility-form";
import { Comments } from "@/components/common/comments";
import { History } from "@/components/common/history";
import { RAG_DIMENSIONS } from "@/lib/domain";
import { fmtDate, fmtDateTime, fmtEuro, fmtHours, fmtNumber, fmtPct } from "@/lib/format";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab = "overzicht" } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const d = await db(async (x, user) => {
    const data = await getProject(x, id);
    if (!data) return null;
    return { ...data, lk: await lookups(x), user, all: await x.query<{ id: string; number: string; name: string }>(`select id, number, name from projects where archived_at is null order by number`),
      history: can(user.roles, "audit.view") ? await auditFor(x, "projects", [id], 40) : [] };
  });
  if (!d) notFound();
  const { p, user, canEdit } = d;
  const fin = can(user.roles, "finance.view") || canEdit;
  const blocked = d.deps.filter((x) => x.kind === "Einde-start" && x.end_date && p.start_date && x.end_date >= p.start_date);
  const base = `/projecten/${id}`;
  return (
    <>
      <PageHeader title={<><span className="num font-normal text-muted">{p.number}</span> {p.name}</>}
        crumbs={[{ label: "Portfolio" }, { label: "Projecten", href: "/projecten" }, { label: p.number }]}
        meta={<><StatusBadge status={p.status} /><PriorityBadge category={p.priority_category} /><Badge tone="primary">Pijler {p.pillar_number}</Badge>
          {d.secondary.map((s) => <Badge key={s.pillar_id}>+ Pijler {s.number}</Badge>)}{p.program_name && <Badge>{p.program_name}</Badge>}
          <Badge tone={p.planning_status === "Vastgesteld" ? "ok" : "neutral"}>Planning {p.planning_status.toLowerCase()}</Badge>{!canEdit && <Badge>Alleen-lezen</Badge>}</>} />
      {blocked.length > 0 && <p className="mb-4 rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">Kan niet eerder starten: afhankelijk van {blocked.map((b) => `${b.number} (eindigt ${fmtDate(b.end_date)})`).join(", ")}.</p>}
      <TabLinks base={base} active={tab} tabs={[
        { key: "overzicht", label: "Overzicht" }, { key: "planning", label: "Planning", count: d.milestones.length }, { key: "team", label: "Team", count: d.members.length },
        { key: "financien", label: "Financiën" }, { key: "risicos", label: "Risico's", count: d.risks.length }, { key: "acties", label: "Acties", count: d.tasks.filter((t) => t.status !== "Gereed").length },
        { key: "besluiten", label: "Besluiten", count: d.decisions.length }, { key: "voortgang", label: "Voortgang", count: d.updates.length },
        ...(canEdit ? [{ key: "bewerken", label: "Bewerken" }] : []), { key: "historie", label: "Historie" },
      ]} />

      {tab === "overzicht" && (<>
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
          <Stat label="Voortgang" value={fmtPct(p.progress_pct)} unknown={p.progress_pct === null} />
          <Stat label="Periode" value={<span className="text-[15px]">{fmtDate(p.start_date)} – {fmtDate(p.end_date)}</span>} />
          <Stat label="Uren" value={<span className="text-[15px]">{fmtHours(p.hours_actual, "0 uur")} / {fmtHours(p.hours_required, "?")}</span>} />
          <Stat label="Kosten / budget" value={fin ? <span className="text-[15px]">{fmtEuro(p.actual_cost, "€ 0")} / {fmtEuro(p.budget, "?")}</span> : "Afgeschermd"} />
          <Stat label="Haalbaarheid" value={p.feasibility_score === null ? "Nog niet beoordeeld" : `${fmtNumber(p.feasibility_score)}/100`} unknown={p.feasibility_score === null} />
          <Stat label="Laatste update" value={<span className="text-[15px]">{fmtDate(d.updates[0]?.created_at ?? null, "Geen")}</span>} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardHeader title="Projectdefinitie" /><CardBody>
            <DescriptionList items={[
              { label: "Aanleiding", value: <Text value={p.reason as string} /> }, { label: "Probleemstelling", value: <Text value={p.problem_statement as string} /> },
              { label: "Doelstelling", value: <Text value={p.objective as string} /> }, { label: "Businesscase", value: <Text value={p.business_case as string} /> },
              { label: "Scope", value: <Text value={p.scope as string} /> }, { label: "Buiten scope", value: <Text value={p.out_of_scope as string} /> },
              { label: "Opdrachtgever", value: <Text value={p.sponsor as string} /> }, { label: "Projectleider", value: <Text value={p.leader_name} empty="Nog niet bepaald" /> },
              { label: "Stakeholders", value: <Text value={p.stakeholders as string} /> }, { label: "Stuurgroep", value: <Text value={p.steering_group as string} /> },
            ]} />
          </CardBody></Card>
          <div className="space-y-4">
            <Card><CardHeader title="Stoplichten" /><CardBody className="grid grid-cols-2 gap-2">{RAG_DIMENSIONS.map((g) => <Rag key={g.key} label={g.label} value={p[g.key] as string | null} />)}</CardBody></Card>
            <Card><CardHeader title="Herkomst (onderwerpen)" /><ul className="divide-y divide-line text-sm">
              {d.topics.map((t) => <li key={t.id} className="px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/onderwerpen/${t.id}`}><span className="num text-muted">{t.code}</span> {t.title}</Link></li>)}
              {!d.topics.length && <li className="px-5 py-3 text-muted">Niet gekoppeld aan onderwerpen.</li>}</ul></Card>
            <Card><CardHeader title="Bijlagen" /><CardBody className="space-y-3">
              <ul className="space-y-1 text-sm">{d.attachments.map((a) => <li key={a.id}><a className="text-primary hover:underline" href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a> <span className="text-[12px] text-muted">{fmtDate(a.created_at)}</span></li>)}
                {!d.attachments.length && <li className="text-muted">Geen bijlagen.</li>}</ul>
              {canEdit && <AttachmentForm entityType="project" entityId={id} />}
            </CardBody></Card>
          </div>
        </div>
      </>)}

      {tab === "planning" && (
        <div className="space-y-4">
          <Card><CardHeader title="Mijlpalen" /><CardBody className="space-y-4">
            <table className="w-full text-[13px]"><caption className="sr-only">Mijlpalen</caption><tbody>
              {d.milestones.map((m) => <tr key={m.id} className="border-t border-line"><td className="py-2">{m.title}{m.is_legal_deadline && <Badge tone="accent" className="ml-1">Wettelijk</Badge>}</td><td className="num">{fmtDate(m.due_date)}</td><td className="text-right"><MilestoneStatus id={m.id} status={m.status} canEdit={canEdit} /></td></tr>)}
              {!d.milestones.length && <tr><td className="py-2 text-muted">Nog geen mijlpalen.</td></tr>}</tbody></table>
            {canEdit && <MilestoneForm projectId={id} />}
          </CardBody></Card>
          <Card><CardHeader title="Afhankelijkheden" description="Einde-start: dit project kan pas starten als het andere project is afgerond." /><CardBody className="space-y-4">
            <ul className="space-y-1.5 text-sm">
              {d.deps.map((x) => <li key={x.id} className="flex items-center gap-2">Afhankelijk van <Link className="text-primary hover:underline" href={`/projecten/${x.other_id}`}>{x.number} {x.name}</Link> <Badge>{x.kind}</Badge><span className="text-muted">eindigt {fmtDate(x.end_date)}</span>{canEdit && <RemoveDependency id={x.id} />}</li>)}
              {d.dependents.map((x) => <li key={x.id}><Link className="text-primary hover:underline" href={`/projecten/${x.other_id}`}>{x.number} {x.name}</Link> is afhankelijk van dit project <Badge>{x.kind}</Badge></li>)}
              {!d.deps.length && !d.dependents.length && <li className="text-muted">Geen afhankelijkheden.</li>}
            </ul>
            {canEdit && <DependencyForm projectId={id} projects={d.all} />}
          </CardBody></Card>
          <Card><CardHeader title="Haalbaarheid" /><CardBody><FeasibilityForm projectId={id} latest={d.feasibility} canEdit={can(user.roles, "feasibility.edit")} /></CardBody></Card>
        </div>
      )}

      {tab === "team" && (
        <Card><CardHeader title="Projectteam" /><CardBody className="space-y-4">
          <table className="w-full text-[13px]"><caption className="sr-only">Projectteam</caption>
            <thead className="text-left text-muted"><tr><th className="py-1">Naam</th><th>Rol</th><th>Discipline</th><th>Uren gepland</th><th /></tr></thead>
            <tbody>{d.members.map((m) => <tr key={m.user_id} className="border-t border-line"><td className="py-2">{m.display_name}</td><td>{m.role}</td><td>{m.discipline ?? "—"}</td><td className="num">{fmtHours(m.hours_planned, "—")}</td><td className="text-right">{canEdit && <RemoveMember projectId={id} userId={m.user_id} />}</td></tr>)}
              {!d.members.length && <tr><td className="py-2 text-muted" colSpan={5}>Nog geen teamleden.</td></tr>}</tbody></table>
          {canEdit && <MemberForm projectId={id} users={d.lk.users} />}
        </CardBody></Card>
      )}

      {tab === "financien" && (fin ? (
        <Card><CardHeader title="Financiën" description={`Budget ${fmtEuro(p.budget, "onbekend")} · gerealiseerd ${fmtEuro(p.actual_cost, "€ 0")}${p.budget ? ` · resterend ${fmtEuro(p.budget - (p.actual_cost ?? 0))}` : ""}`} /><CardBody className="space-y-4">
          <table className="w-full text-[13px]"><caption className="sr-only">Kosten</caption><tbody>
            {d.expenses.map((e) => <tr key={e.id} className="border-t border-line"><td className="py-2">{fmtDate(e.spent_on)}</td><td>{e.description}</td><td className="num text-right">{fmtEuro(e.amount)}</td></tr>)}
            {!d.expenses.length && <tr><td className="py-2 text-muted">Nog geen kosten geregistreerd.</td></tr>}</tbody></table>
          {canEdit && <ExpenseForm projectId={id} />}
        </CardBody></Card>
      ) : <Card><CardBody><p className="text-sm text-muted">Financiële informatie is afgeschermd.</p></CardBody></Card>)}

      {tab === "risicos" && (
        <Card><CardHeader title="Projectrisico's" actions={<Link className="text-[13px] text-primary hover:underline" href="/risicos">Nieuw risico via risicoregister</Link>} />
          <ul className="divide-y divide-line text-sm">{d.risks.map((r) => <li key={r.id} className="flex justify-between px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/risicos/${r.id}`}>{r.number} {r.title}</Link><span className="flex gap-1"><StatusBadge status={r.stage} />{(r.residual_score ?? r.gross_score) !== null && <Badge tone={(r.residual_score ?? r.gross_score)! >= 15 ? "bad" : "warn"}>Score {r.residual_score ?? r.gross_score}</Badge>}</span></li>)}
            {!d.risks.length && <li className="px-5 py-4 text-muted">Geen risico&apos;s gekoppeld. Koppel een risico aan dit project in het risicoregister.</li>}</ul></Card>
      )}

      {tab === "acties" && (
        <Card><CardHeader title="Acties" /><CardBody className="space-y-4">
          <table className="w-full text-[13px]"><caption className="sr-only">Acties</caption><tbody>
            {d.tasks.map((t) => <tr key={t.id} className="border-t border-line"><td className={`py-2 ${t.status === "Gereed" ? "text-muted line-through" : ""}`}>{t.title}</td><td>{t.assignee ?? "—"}</td><td className="num">{fmtDate(t.due_date)}</td><td className="text-right"><TaskStatus id={t.id} status={t.status} canEdit={canEdit} /></td></tr>)}
            {!d.tasks.length && <tr><td className="py-2 text-muted">Nog geen acties.</td></tr>}</tbody></table>
          {canEdit && <TaskForm projectId={id} users={d.lk.users} />}
        </CardBody></Card>
      )}

      {tab === "besluiten" && (
        <Card><CardHeader title="Besluiten" actions={<Link className="text-[13px] text-primary hover:underline" href="/besluiten">Besluitenregister</Link>} />
          <ul className="divide-y divide-line text-sm">{d.decisions.map((x) => <li key={x.id} className="flex justify-between px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/besluiten/${x.id}`}>{x.number} {x.subject}</Link><span className="flex items-center gap-2 text-muted">{fmtDate(x.decision_date)}<StatusBadge status={x.outcome} /></span></li>)}
            {!d.decisions.length && <li className="px-5 py-4 text-muted">Geen besluiten gekoppeld.</li>}</ul></Card>
      )}

      {tab === "voortgang" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader title="Voortgangsupdates" /><CardBody className="space-y-4">
            {canEdit && <UpdateForm projectId={id} />}
            <ol className="space-y-3">{d.updates.map((u) => <li key={u.id} className="rounded-md border border-line p-3 text-sm"><div className="text-[12px] text-muted">{fmtDateTime(u.created_at)} · {u.by_name}{u.progress_pct !== null ? ` · ${fmtPct(u.progress_pct)}` : ""}</div><p className="mt-1 whitespace-pre-wrap">{u.body}</p></li>)}
              {!d.updates.length && <li className="text-sm text-muted">Nog geen updates.</li>}</ol>
          </CardBody></Card>
          <Card><CardHeader title="Opmerkingen" /><CardBody><Comments entityType="project" entityId={id} comments={d.comments} canAdd={can(user.roles, "comments.add")} /></CardBody></Card>
        </div>
      )}

      {tab === "bewerken" && canEdit && <Card><CardBody><ProjectForm p={p} lookups={d.lk} secondary={d.secondary.map((s) => s.pillar_id)} /></CardBody></Card>}
      {tab === "historie" && <Card><CardHeader title="Wijzigingshistorie" /><CardBody><History entries={d.history} allowed={can(user.roles, "audit.view")} /></CardBody></Card>}
    </>
  );
}
