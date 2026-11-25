import type { Db } from "@/lib/db";

export type ProjectRow = {
  id: string; number: string; name: string; description: string | null; status: string; lead_name: string | null; planner_url: string | null;
  primary_pillar_id: string; pillar_number: number; pillar_title: string; secondary_pillars: number[]; topics: { id: string; code: string; title: string }[];
  start_date: string | null; end_date: string | null; updated_at: string;
};

export async function listProjects(db: Db) {
  return db.query<ProjectRow>(
    `select j.id, j.number, j.name, j.description, j.status, j.lead_name, j.planner_url, j.primary_pillar_id, p.number as pillar_number, p.title as pillar_title,
            coalesce((select array_agg(pp2.number order by pp2.number) from project_pillars pp join pillars pp2 on pp2.id = pp.pillar_id where pp.project_id = j.id), '{}') as secondary_pillars,
            coalesce((select json_agg(json_build_object('id', t.id, 'code', t.code, 'title', t.title) order by t.code) from project_topics pt join topics t on t.id = pt.topic_id where pt.project_id = j.id), '[]') as topics,
            j.start_date, j.end_date, j.updated_at
       from projects j join pillars p on p.id = j.primary_pillar_id
      where j.archived_at is null order by (j.status in ('Afgerond','Geannuleerd')), p.number, j.end_date nulls last, j.name`);
}

export async function getProject(db: Db, id: string) {
  const rows = await db.query<ProjectRow & { archived_at: string | null }>(
    `select j.*, p.number as pillar_number, p.title as pillar_title,
            coalesce((select array_agg(pp2.number order by pp2.number) from project_pillars pp join pillars pp2 on pp2.id = pp.pillar_id where pp.project_id = j.id), '{}') as secondary_pillars,
            coalesce((select json_agg(json_build_object('id', t.id, 'code', t.code, 'title', t.title) order by t.code) from project_topics pt join topics t on t.id = pt.topic_id where pt.project_id = j.id), '[]') as topics
       from projects j join pillars p on p.id = j.primary_pillar_id where j.id = $1`, [id]);
  return rows[0] ?? null;
}
