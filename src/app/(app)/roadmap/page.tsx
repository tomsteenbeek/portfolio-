"use client";
import { AsyncPage } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { getSettings } from "@/server/queries/dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { Gantt, type Deadline, type GanttProject } from "@/components/roadmap/gantt";
import { PrintButton } from "@/components/common/print-button";

export default function RoadmapPage() {
  return <AsyncPage render={async () => {

  const d = await db(async (x) => {
    const s = await getSettings(x);
    const period = (s["roadmap.periode"] as { van: number; tot: number }) ?? { van: 2027, tot: 2030 };
    const projects = await x.query<GanttProject>(
      `select j.id, j.number, j.name, p.number as pillar_number, p.title as pillar_title, j.program_id, g.name as program_name, j.status, j.priority_category,
              j.project_leader_id as leader_id, u.display_name as leader_name, j.start_date::text, j.end_date::text, j.planning_status,
              app.can_edit_project(j.id) as can_edit,
              coalesce((select array_agg(distinct dd.name) from project_members m join users mu on mu.id = m.user_id join disciplines dd on dd.id = mu.discipline_id where m.project_id = j.id), '{}') as disciplines,
              coalesce((select json_agg(json_build_object('number', b.number, 'end_date', b.end_date, 'kind', dp.kind)) from project_dependencies dp join projects b on b.id = dp.depends_on_project_id where dp.project_id = j.id), '[]') as deps,
              coalesce((select json_agg(json_build_object('title', m.title, 'due_date', m.due_date, 'legal', m.is_legal_deadline)) from milestones m where m.project_id = j.id), '[]') as milestones
         from projects j join pillars p on p.id = j.primary_pillar_id left join programs g on g.id = j.program_id left join users u on u.id = j.project_leader_id
        where j.archived_at is null and j.status <> 'Geannuleerd' order by p.number, j.start_date nulls last`);
    const deadlines = await x.query<Deadline>(
      `select t.code || ' ' || t.title as label, t.legal_deadline::text as date, '/onderwerpen/detail?id=' || t.id as href from topics t where t.legal_deadline is not null and t.archived_at is null`);
    const pillars = await x.query<{ number: number; title: string }>(`select number, title from pillars order by number`);
    const disciplines = (await x.query<{ name: string }>(`select name from disciplines order by sort_order`)).map((r) => r.name);
    return { period, projects, deadlines, pillars, disciplines };
  });
  return (
    <>
      <PageHeader title={`Meerjarenroadmap ${d.period.van}–${d.period.tot}`} crumbs={[{ label: "Strategie" }, { label: "Meerjarenroadmap" }]}
        description="Sleep een balk om een project te verschuiven, of sleep de rechterrand om de einddatum aan te passen (per maand). Met toetsenbord: focus op een balk en gebruik de pijltjestoetsen. Een rode rand betekent dat het project start vóór het einde van een project waarvan het afhankelijk is."
        actions={<PrintButton />} />
      <Gantt projects={d.projects} deadlines={d.deadlines} from={d.period.van} to={d.period.tot} pillars={d.pillars} disciplines={d.disciplines} />
    </>
  );

  }} />;
}
