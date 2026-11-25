import "server-only";
import type { Db } from "@/lib/db";

export type TopicRow = {
  id: string; code: string; title: string; pillar_id: string; pillar_number: number; pillar_title: string;
  subcategory: string | null; program_id: string | null; program_name: string | null;
  description: string | null; reason: string | null; current_situation: string | null; desired_situation: string | null;
  problem_statement: string | null; intended_result: string | null;
  sources: string[]; classifications: string[]; owner_user_id: string | null; owner_name: string | null; disciplines: string[];
  strategic_contribution: string | null; legal_basis: string | null; legal_deadline: string | null; risk_if_not_done: string | null;
  service_impact: string | null; dependencies_text: string | null; maturity_current: number | null; maturity_target: number | null;
  priority_category: string | null; priority_score: number | null; priority_is_final: boolean;
  required_capacity_hours: number | null; required_budget: number | null; status: string; remarks: string | null; updated_at: string;
  archived_at: string | null; flags: string[]; assessment_status: string | null; comment_count: number;
};

export async function listTopics(db: Db, opts: { includeArchived?: boolean; pillarId?: string } = {}) {
  return db.query<TopicRow>(
    `select t.id, t.code, t.title, t.pillar_id, p.number as pillar_number, p.title as pillar_title, t.subcategory, t.program_id, g.name as program_name,
        t.description, t.reason, t.current_situation, t.desired_situation, t.problem_statement, t.intended_result,
        coalesce((select array_agg(distinct s.source_type) from topic_sources s where s.topic_id = t.id), '{}') as sources,
        coalesce((select array_agg(c.classification order by c.classification) from topic_classifications c where c.topic_id = t.id), '{}') as classifications,
        t.owner_user_id, u.display_name as owner_name,
        coalesce((select array_agg(d.name order by d.sort_order) from topic_disciplines td join disciplines d on d.id = td.discipline_id where td.topic_id = t.id), '{}') as disciplines,
        t.strategic_contribution, t.legal_basis, t.legal_deadline, t.risk_if_not_done, t.service_impact, t.dependencies_text,
        t.maturity_current, t.maturity_target, t.priority_category, t.priority_score, t.priority_is_final,
        t.required_capacity_hours, t.required_budget, t.status, t.remarks, t.updated_at, t.archived_at,
        array_remove(array[
          case when t.flag_legal then 'Wettelijk verplicht' end, case when t.flag_hard_deadline then 'Harde deadline' end,
          case when t.flag_acute_risk then 'Acuut continuïteitsrisico' end, case when t.flag_admin_decided then 'Bestuurlijk vastgesteld' end,
          case when t.flag_critical_dependency then 'Kritische afhankelijkheid' end], null) as flags,
        (select status from topic_assessments a where a.topic_id = t.id) as assessment_status,
        (select count(*) from comments c where c.entity_type = 'topic' and c.entity_id = t.id and c.archived_at is null) as comment_count
      from topics t join pillars p on p.id = t.pillar_id
      left join programs g on g.id = t.program_id left join users u on u.id = t.owner_user_id
     where ($1 or t.archived_at is null) and ($2::uuid is null or t.pillar_id = $2)
     order by p.number, string_to_array(t.code, '.')::int[]`,
    [opts.includeArchived ?? false, opts.pillarId ?? null],
  );
}

export async function lookups(db: Db) {
  const [pillars, programs, users, disciplines] = await Promise.all([
    db.query<{ id: string; number: number; title: string; short_title: string }>(`select id, number, title, short_title from pillars where archived_at is null order by number`),
    db.query<{ id: string; code: string; name: string; pillar_id: string }>(`select id, code, name, pillar_id from programs where archived_at is null order by code`),
    db.query<{ id: string; display_name: string }>(`select id, display_name from users where is_active order by display_name`),
    db.query<{ id: string; code: string; name: string }>(`select id, code, name from disciplines order by sort_order`),
  ]);
  return { pillars, programs, users, disciplines };
}
export type Lookups = Awaited<ReturnType<typeof lookups>>;

export async function getTopic(db: Db, id: string) {
  const [row] = await db.query<TopicRow & { version: number; flag_legal: boolean; flag_hard_deadline: boolean; flag_acute_risk: boolean;
    flag_admin_decided: boolean; flag_critical_dependency: boolean; flag_rationale: string | null; merged_into_id: string | null;
    split_from_id: string | null; is_relevant: boolean | null; created_at: string }>(
    `select t.*, p.number as pillar_number, p.title as pillar_title, g.name as program_name, u.display_name as owner_name,
        coalesce((select array_agg(c.classification) from topic_classifications c where c.topic_id = t.id), '{}') as classifications,
        coalesce((select array_agg(td.discipline_id::text) from topic_disciplines td where td.topic_id = t.id), '{}') as disciplines
       from topics t join pillars p on p.id = t.pillar_id left join programs g on g.id = t.program_id left join users u on u.id = t.owner_user_id
      where t.id = $1`,
    [id],
  );
  if (!row) return null;
  const [sources, assessment, maturity, comments, merged, splits, projects, feasibility, decisions, related] = await Promise.all([
    db.query<{ id: string; source_type: string; reference: string | null; note: string | null; created_at: string; raw: Record<string, unknown> | null; batch_file: string | null; row_number: number | null }>(
      `select s.id, s.source_type, s.reference, s.note, s.created_at, i.raw, b.file_name as batch_file, i.row_number
         from topic_sources s left join source_inputs i on i.id = s.source_input_id left join import_batches b on b.id = i.batch_id
        where s.topic_id = $1 order by s.created_at`, [id]),
    db.one<{ answers: Record<string, string>; status: string; approved_at: string | null; approved_by_name: string | null; updated_at: string }>(
      `select a.answers, a.status, a.approved_at, u.display_name as approved_by_name, a.updated_at
         from topic_assessments a left join users u on u.id = a.approved_by where a.topic_id = $1`, [id]),
    db.query<{ id: string; current_level: number; target_level: number; current_rationale: string | null; target_rationale: string | null; assessed_at: string; by_name: string | null }>(
      `select m.id, m.current_level, m.target_level, m.current_rationale, m.target_rationale, m.assessed_at, u.display_name as by_name
         from maturity_assessments m left join users u on u.id = m.created_by where m.topic_id = $1 order by m.assessed_at desc`, [id]),
    db.query<{ id: string; body: string; created_at: string; by_name: string | null }>(
      `select c.id, c.body, c.created_at, u.display_name as by_name from comments c left join users u on u.id = c.created_by
        where c.entity_type = 'topic' and c.entity_id = $1 and c.archived_at is null order by c.created_at desc`, [id]),
    db.query<{ id: string; code: string; title: string }>(`select id, code, title from topics where merged_into_id = $1`, [id]),
    db.query<{ id: string; code: string; title: string }>(`select id, code, title from topics where split_from_id = $1`, [id]),
    db.query<{ id: string; number: string; name: string; status: string }>(
      `select j.id, j.number, j.name, j.status from project_topics pt join projects j on j.id = pt.project_id where pt.topic_id = $1`, [id]),
    db.one<Record<string, number | null | boolean | string>>(
      `select * from feasibility_assessments where topic_id = $1 order by assessed_at desc limit 1`, [id]),
    db.query<{ id: string; final_category: string; consensus_category: string | null; deviation_rationale: string | null; decided_at: string; by_name: string | null }>(
      `select d.id, d.final_category, d.consensus_category, d.deviation_rationale, d.decided_at, u.display_name as by_name
         from priority_decisions d left join users u on u.id = d.decided_by where d.topic_id = $1 order by d.decided_at desc`, [id]),
    db.query<{ id: string; code: string; title: string }>(
      `select id, code, title from topics where pillar_id = $1 and id <> $2 and archived_at is null and status not in ('Samengevoegd') order by code`,
      [row.pillar_id, id]),
  ]);
  return { topic: row, sources, assessment, maturity, comments, merged, splits, projects, feasibility, decisions, related };
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
