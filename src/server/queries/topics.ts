import { teamOptions } from "@/server/queries/team";
import type { Db } from "@/lib/db";

export type TopicRow = {
  id: string; code: string; title: string; pillar_id: string; pillar_number: number; pillar_title: string;
  description: string | null; scope: string | null; intended_result: string | null; remarks: string | null;
  owner_name: string | null; kpi_count: number; project_count: number; priority_category: string | null;
  updated_at: string; archived_at: string | null;
};

export async function listTopics(db: Db, opts: { includeArchived?: boolean; pillarId?: string } = {}) {
  return db.query<TopicRow>(
    `select t.id, t.code, t.title, t.pillar_id, p.number as pillar_number, p.title as pillar_title,
        t.description, t.scope, t.intended_result, t.remarks, t.owner_name, t.priority_category, t.updated_at, t.archived_at,
        (select count(*) from kpis k where k.topic_id = t.id and k.archived_at is null)::int as kpi_count,
        (select count(*) from project_topics pt join projects j on j.id = pt.project_id where pt.topic_id = t.id and j.archived_at is null)::int as project_count
      from topics t join pillars p on p.id = t.pillar_id
     where ($1 or t.archived_at is null) and ($2::uuid is null or t.pillar_id = $2::uuid) and t.status not in ('Samengevoegd','Gesplitst')
     order by p.number, string_to_array(t.code, '.')::int[]`,
    [opts.includeArchived ?? false, opts.pillarId ?? null],
  );
}

export async function lookups(db: Db) {
  const [pillars, topics, team] = await Promise.all([
    db.query<{ id: string; number: number; title: string; short_title: string }>(`select id, number, title, short_title from pillars where archived_at is null order by number`),
    db.query<{ id: string; code: string; title: string; pillar_id: string; pillar_number: number }>(
      `select t.id, t.code, t.title, t.pillar_id, p.number as pillar_number from topics t join pillars p on p.id = t.pillar_id
        where t.archived_at is null and t.status not in ('Samengevoegd','Gesplitst') order by p.number, string_to_array(t.code,'.')::int[]`),
    teamOptions(db),
  ]);
  return { pillars, topics, team };
}
export type Lookups = Awaited<ReturnType<typeof lookups>>;

export async function getTopic(db: Db, id: string) {
  const topic = await db.one<TopicRow & { version: number; created_at: string }>(
    `select t.*, p.number as pillar_number, p.title as pillar_title from topics t join pillars p on p.id = t.pillar_id where t.id = $1`, [id]);
  if (!topic) return null;
  const [kpis, projects, comments] = await Promise.all([
    db.query<{ id: string; name: string; unit: string | null; target_value: number | null; latest: number | null; owner_name: string | null }>(
      `select k.id, k.name, k.unit, k.target_value, k.owner_name,
              (select value from kpi_measurements m where m.kpi_id = k.id order by measured_on desc limit 1) as latest
         from kpis k where k.topic_id = $1 and k.archived_at is null order by k.name`, [id]),
    db.query<{ id: string; number: string; name: string; status: string; lead_name: string | null; end_date: string | null; planner_url: string | null }>(
      `select j.id, j.number, j.name, j.status, j.lead_name, j.end_date, j.planner_url from project_topics pt join projects j on j.id = pt.project_id
        where pt.topic_id = $1 and j.archived_at is null order by j.number`, [id]),
    db.query<{ id: string; body: string; created_at: string; by_name: string | null }>(
      `select c.id, c.body, c.created_at, u.display_name as by_name from comments c left join users u on u.id = c.created_by
        where c.entity_type = 'topic' and c.entity_id = $1 and c.archived_at is null order by c.created_at desc`, [id]),
  ]);
  return { topic, kpis, projects, comments };
}

export async function auditFor(db: Db, table: string, ids: string[], limit = 50) {
  return db.query<{ id: number; table_name: string; action: string; changed_fields: string[] | null; changed_at: string; by_name: string | null;
    old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null }>(
    `select a.id, a.table_name, a.action, a.changed_fields, a.changed_at, u.display_name as by_name, a.old_data, a.new_data
       from audit_logs a left join users u on u.id = a.changed_by
      where a.table_name = $1 and a.record_id = any($2) order by a.changed_at desc limit $3`,
    [table, ids, limit],
  );
}
