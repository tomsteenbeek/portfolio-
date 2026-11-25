import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { getSession } from "@/server/queries/priority";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { TabLinks } from "@/components/ui/tabs";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { AssessPanel, ConsensusPanel, PresentLink, StatusControl } from "@/components/priority/session-client";
import { Results, medianScores } from "@/components/priority/results";
import { SessionForm } from "@/components/priority/session-form";
import { fmtDate } from "@/lib/format";

export default async function SessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { tab = "beoordelen" } = await searchParams;
  const d = await db(async (x, user) => {
    const data = await getSession(x, id);
    if (!data) return null;
    const topics = tab === "instellingen" ? await x.query<{ id: string; code: string; title: string; pillar_number: number; status: string }>(
      `select t.id, t.code, t.title, p.number as pillar_number, t.status from topics t join pillars p on p.id = t.pillar_id
        where t.archived_at is null and t.status not in ('Samengevoegd','Niet relevant','Gesplitst') order by p.number, string_to_array(t.code,'.')::int[]`) : [];
    const users = tab === "instellingen" ? await x.query<{ id: string; display_name: string }>(
      `select distinct u.id, u.display_name from users u join user_roles ur on ur.user_id = u.id join roles r on r.id = ur.role_id
        where u.is_active and r.code in ('medewerker','teamleider','projectleider') order by u.display_name`) : [];
    return { data, user, topics, users };
  });
  if (!d) notFound();
  const { data, user } = d;
  const s = data.session;
  const canManage = can(user.roles, "priority.sessions");
  const isMember = data.members.some((m) => m.user_id === user.id);
  const visible = !s.hide_individual || s.status === "Bespreking" || s.status === "Afgerond";
  return (
    <>
      <PageHeader title={s.name} description={s.description ?? undefined}
        crumbs={[{ label: "Portfolio" }, { label: "Prioritering", href: "/prioritering" }, { label: s.name }]}
        meta={<><StatusBadge status={s.status} /><Badge tone="neutral">Model v{s.version}</Badge>{(s.start_date || s.end_date) && <Badge tone="neutral">{fmtDate(s.start_date)} – {fmtDate(s.end_date)}</Badge>}
          <Badge tone="neutral">{data.members.length} deelnemers · {data.items.length} items</Badge>{s.hide_individual && <Badge tone="info">Blind beoordelen</Badge>}</>}
        actions={<><PresentLink id={id} tab={tab === "resultaten" ? "resultaten" : "beoordelen"} />{canManage && <StatusControl id={id} status={s.status} />}</>}
      />
      <TabLinks base={`/prioritering/${id}`} active={tab} tabs={[
        { key: "beoordelen", label: "Mijn beoordeling" }, { key: "resultaten", label: "Resultaten" },
        { key: "consensus", label: "Consensus en vaststelling" }, ...(canManage ? [{ key: "instellingen", label: "Instellingen" }] : []),
      ]} />
      <Card><CardBody>
        {tab === "beoordelen" && <AssessPanel data={data} userId={user.id} isMember={isMember} />}
        {tab === "resultaten" && <Results data={data} visible={visible} />}
        {tab === "consensus" && (visible ? <ConsensusPanel data={data} canConsensus={canManage} canFinalize={can(user.roles, "priority.finalize")} medians={medianScores(data)} />
          : <p className="text-sm text-muted">Consensus volgt na het sluiten van de individuele beoordelingsronde (status &apos;Bespreking&apos;).</p>)}
        {tab === "instellingen" && canManage && (
          <SessionForm topics={d.topics} users={d.users} session={s} memberIds={data.members.map((m) => m.user_id)}
            itemTopicIds={data.items.map((i) => i.topic_id).filter(Boolean) as string[]} items={data.items} />
        )}
      </CardBody></Card>
    </>
  );
}
