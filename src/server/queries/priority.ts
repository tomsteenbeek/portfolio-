import type { Db } from "@/lib/db";

export type Criterion = { id: string; code: string; name: string; weight: number; description: string | null; rubric: string[] };

export async function activeModel(db: Db) {
  const m = await db.one<{ id: string; version: number; name: string; description: string | null; created_at: string }>(
    `select id, version, name, description, created_at from priority_models where is_active`);
  if (!m) return null;
  const criteria = await db.query<Criterion>(
    `select id, code, name, weight, description, rubric from priority_criteria where model_id = $1 order by sort_order`, [m.id]);
  return { ...m, criteria };
}

export async function modelVersions(db: Db) {
  return db.query<{ id: string; version: number; is_active: boolean; created_at: string; description: string | null; weights: string; sessions: number }>(
    `select m.id, m.version, m.is_active, m.created_at, m.description,
            string_agg(c.code || ' ' || c.weight::int || '%', ' · ' order by c.sort_order) as weights,
            (select count(*) from priority_sessions s where s.model_id = m.id) as sessions
       from priority_models m join priority_criteria c on c.model_id = m.id group by m.id order by m.version desc`);
}

export async function listSessions(db: Db) {
  return db.query<{ id: string; name: string; status: string; start_date: string | null; end_date: string | null; version: number;
    items: number; members: number; assessments: number; is_member: boolean }>(
    `select s.id, s.name, s.status, s.start_date, s.end_date, m.version,
            (select count(*) from priority_session_items i where i.session_id = s.id) as items,
            (select count(*) from priority_session_members sm where sm.session_id = s.id) as members,
            (select coalesce(sum(p.submitted),0) from app.session_progress(s.id) p) as assessments,
            exists (select 1 from priority_session_members sm where sm.session_id = s.id and sm.user_id = app.uid()) as is_member
       from priority_sessions s join priority_models m on m.id = s.model_id order by s.created_at desc`);
}

export type SessionItem = {
  id: string; topic_id: string | null; project_id: string | null; label: string; code: string; pillar_number: number | null;
  flags: string[]; consensus_score: number | null; consensus_category: string | null; consensus_note: string | null;
  submitted: number; final_category: string | null; final_rationale: string | null; description: string | null;
};

export async function getSession(db: Db, id: string) {
  const s = await db.one<{ id: string; name: string; description: string | null; status: string; start_date: string | null; end_date: string | null;
    hide_individual: boolean; model_id: string; version: number; created_at: string }>(
    `select s.*, m.version from priority_sessions s join priority_models m on m.id = s.model_id where s.id = $1`, [id]);
  if (!s) return null;
  const [criteria, items, members, assessments, scores] = await Promise.all([
    db.query<Criterion>(`select id, code, name, weight, description, rubric from priority_criteria where model_id = $1 order by sort_order`, [s.model_id]),
    db.query<SessionItem>(
      `select i.id, i.topic_id, i.project_id, coalesce(t.title, j.name) as label, coalesce(t.code, j.number) as code,
              coalesce(tp.number, jp.number) as pillar_number, coalesce(t.description, j.objective) as description,
              case when t.id is null then '{}'::text[] else array_remove(array[
                case when t.flag_legal then 'Wettelijk verplicht' end, case when t.flag_hard_deadline then 'Harde deadline' end,
                case when t.flag_acute_risk then 'Acuut continuïteitsrisico' end, case when t.flag_admin_decided then 'Bestuurlijk vastgesteld' end,
                case when t.flag_critical_dependency then 'Kritische afhankelijkheid' end], null) end as flags,
              i.consensus_score, i.consensus_category, i.consensus_note,
              (select p.submitted from app.session_progress($1) p where p.session_item_id = i.id) as submitted,
              (select d.final_category from priority_decisions d where d.session_item_id = i.id order by decided_at desc limit 1) as final_category,
              (select d.deviation_rationale from priority_decisions d where d.session_item_id = i.id order by decided_at desc limit 1) as final_rationale
         from priority_session_items i
         left join topics t on t.id = i.topic_id left join pillars tp on tp.id = t.pillar_id
         left join projects j on j.id = i.project_id left join pillars jp on jp.id = j.primary_pillar_id
        where i.session_id = $1 order by i.sort_order, code`, [id]),
    db.query<{ user_id: string; display_name: string; discipline: string | null }>(
      `select u.id as user_id, u.display_name, d.name as discipline from priority_session_members m join users u on u.id = m.user_id
         left join disciplines d on d.id = u.discipline_id where m.session_id = $1 order by u.display_name`, [id]),
    // RLS: tijdens blind stemmen zijn alleen eigen beoordelingen zichtbaar
    db.query<{ id: string; session_item_id: string; user_id: string; is_consensus: boolean; rationale: string | null; total_score: number; category: string;
      revision: number; submitted_at: string; display_name: string; discipline: string | null }>(
      `select a.id, a.session_item_id, a.user_id, a.is_consensus, a.rationale, a.total_score, a.category, a.revision, a.submitted_at,
              u.display_name, d.name as discipline
         from priority_assessments a join priority_session_items i on i.id = a.session_item_id
         join users u on u.id = a.user_id left join disciplines d on d.id = u.discipline_id
        where i.session_id = $1`, [id]),
    db.query<{ assessment_id: string; criterion_id: string; score: number }>(
      `select ps.assessment_id, ps.criterion_id, ps.score from priority_scores ps
         join priority_assessments a on a.id = ps.assessment_id join priority_session_items i on i.id = a.session_item_id
        where i.session_id = $1`, [id]),
  ]);
  const scoreMap = new Map<string, Record<string, number>>();
  for (const sc of scores) {
    const m = scoreMap.get(sc.assessment_id) ?? {};
    m[sc.criterion_id] = sc.score;
    scoreMap.set(sc.assessment_id, m);
  }
  return { session: s, criteria, items, members, assessments: assessments.map((a) => ({ ...a, scores: scoreMap.get(a.id) ?? {} })) };
}
export type SessionData = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export async function matrixData(db: Db) {
  return db.query<{ id: string; kind: "topic" | "project"; code: string; title: string; pillar_number: number; priority_score: number | null;
    priority_category: string | null; feasibility: number | null; protected: boolean; blocking: string[] }>(
    `select t.id, 'topic' as kind, t.code, t.title, p.number as pillar_number, t.priority_score, t.priority_category,
            f.total_score as feasibility,
            (t.flag_legal or t.flag_hard_deadline or t.flag_acute_risk or t.flag_admin_decided) as protected,
            array_remove(array[case when f.blocking_capacity then 'Capaciteit' end, case when f.blocking_expertise then 'Expertise' end,
                               case when f.blocking_budget then 'Budget' end], null) as blocking
       from topics t join pillars p on p.id = t.pillar_id
       left join lateral (select * from feasibility_assessments fa where fa.topic_id = t.id order by assessed_at desc limit 1) f on true
      where t.archived_at is null and t.status not in ('Samengevoegd','Niet relevant','Gesplitst')
        and (t.priority_score is not null or f.total_score is not null or t.flag_legal or t.flag_hard_deadline or t.flag_acute_risk or t.flag_admin_decided)
     union all
     select j.id, 'project', j.number, j.name, p.number, j.priority_score, j.priority_category, j.feasibility_score, false, '{}'
       from projects j join pillars p on p.id = j.primary_pillar_id
      where j.archived_at is null and j.status not in ('Afgerond','Geannuleerd') and (j.priority_score is not null or j.feasibility_score is not null)`);
}
