import type { Db } from "@/lib/db";

export type ProjectRow = {
  id: string; number: string; name: string; status: string; program_id: string | null; program_name: string | null;
  primary_pillar_id: string; pillar_number: number; project_leader_id: string | null; leader_name: string | null;
  priority_category: string | null; priority_score: number | null; feasibility_score: number | null;
  start_date: string | null; end_date: string | null; planning_status: string; progress_pct: number | null;
  rag_time: string | null; rag_money: string | null; rag_scope: string | null; rag_quality: string | null; rag_capacity: string | null; rag_risk: string | null;
  hours_required: number | null; updated_at: string; blocked_by: string[];
};

export async function listProjects(db: Db) {
  return db.query<ProjectRow>(
    `select j.id, j.number, j.name, j.status, j.program_id, g.name as program_name, j.primary_pillar_id, p.number as pillar_number,
            j.project_leader_id, u.display_name as leader_name, j.priority_category, j.priority_score, j.feasibility_score,
            j.start_date, j.end_date, j.planning_status, j.progress_pct, j.rag_time, j.rag_money, j.rag_scope, j.rag_quality, j.rag_capacity, j.rag_risk,
            j.hours_required, j.updated_at,
            coalesce((select array_agg(b.number) from project_dependencies d join projects b on b.id = d.depends_on_project_id
                       where d.project_id = j.id and d.kind = 'Einde-start' and b.status not in ('Afgerond','Geannuleerd')), '{}') as blocked_by
       from projects j join pillars p on p.id = j.primary_pillar_id left join programs g on g.id = j.program_id left join users u on u.id = j.project_leader_id
      where j.archived_at is null order by j.number`);
}

export async function getProject(db: Db, id: string) {
  const p = await db.one<Record<string, unknown> & { id: string; number: string; name: string; status: string; primary_pillar_id: string; pillar_number: number; pillar_title: string;
    program_name: string | null; leader_name: string | null; project_leader_id: string | null; budget: number | null; actual_cost: number | null;
    hours_required: number | null; hours_actual: number | null; progress_pct: number | null; start_date: string | null; end_date: string | null; planning_status: string;
    priority_category: string | null; feasibility_score: number | null; updated_at: string }>(
    `select j.*, p.number as pillar_number, p.title as pillar_title, g.name as program_name, u.display_name as leader_name
       from projects j join pillars p on p.id = j.primary_pillar_id left join programs g on g.id = j.program_id left join users u on u.id = j.project_leader_id where j.id = $1`, [id]);
  if (!p) return null;
  const q = <T,>(sql: string) => db.query<T>(sql, [id]);
  const [secondary, topics, members, updates, milestones, tasks, deps, dependents, risks, decisions, expenses, attachments, feasibility, comments] = await Promise.all([
    q<{ pillar_id: string; number: number; title: string }>(`select pp.pillar_id, p.number, p.title from project_pillars pp join pillars p on p.id = pp.pillar_id where pp.project_id = $1 order by p.number`),
    q<{ id: string; code: string; title: string; status: string }>(`select t.id, t.code, t.title, t.status from project_topics pt join topics t on t.id = pt.topic_id where pt.project_id = $1 order by t.code`),
    q<{ user_id: string; display_name: string; role: string; hours_planned: number | null; discipline: string | null }>(
      `select m.user_id, u.display_name, m.role, m.hours_planned, d.name as discipline from project_members m join users u on u.id = m.user_id left join disciplines d on d.id = u.discipline_id where m.project_id = $1 order by u.display_name`),
    q<{ id: string; body: string; progress_pct: number | null; created_at: string; by_name: string | null }>(
      `select pu.id, pu.body, pu.progress_pct, pu.created_at, u.display_name as by_name from project_updates pu left join users u on u.id = pu.created_by where pu.project_id = $1 order by pu.created_at desc`),
    q<{ id: string; title: string; due_date: string; status: string; is_legal_deadline: boolean }>(`select id, title, due_date, status, is_legal_deadline from milestones where project_id = $1 order by due_date`),
    q<{ id: string; title: string; due_date: string | null; status: string; assignee: string | null }>(
      `select t.id, t.title, t.due_date, t.status, u.display_name as assignee from tasks t left join users u on u.id = t.assignee_id where t.project_id = $1 order by t.status = 'Gereed', t.due_date nulls last`),
    q<{ id: string; other_id: string; number: string; name: string; kind: string; note: string | null; end_date: string | null; status: string }>(
      `select d.id, b.id as other_id, b.number, b.name, d.kind, d.note, b.end_date, b.status from project_dependencies d join projects b on b.id = d.depends_on_project_id where d.project_id = $1`),
    q<{ id: string; other_id: string; number: string; name: string; kind: string }>(
      `select d.id, a.id as other_id, a.number, a.name, d.kind from project_dependencies d join projects a on a.id = d.project_id where d.depends_on_project_id = $1`),
    q<{ id: string; number: string; title: string; stage: string; gross_score: number | null; residual_score: number | null }>(
      `select id, number, title, stage, gross_score, residual_score from risks where project_id = $1 and archived_at is null order by coalesce(residual_score, gross_score) desc nulls last`),
    q<{ id: string; number: string; subject: string; outcome: string; decision_date: string | null }>(`select id, number, subject, outcome, decision_date from decisions where project_id = $1 and archived_at is null order by created_at desc`),
    q<{ id: string; spent_on: string; amount: number; description: string }>(`select id, spent_on, amount, description from expenses where project_id = $1 order by spent_on desc`),
    q<{ id: string; title: string; url: string; created_at: string }>(`select id, title, url, created_at from attachments where entity_type = 'project' and entity_id = $1 order by created_at desc`),
    db.one<Record<string, unknown>>(`select * from feasibility_assessments where project_id = $1 order by assessed_at desc limit 1`, [id]),
    q<{ id: string; body: string; created_at: string; by_name: string | null }>(
      `select c.id, c.body, c.created_at, u.display_name as by_name from comments c left join users u on u.id = c.created_by where c.entity_type = 'project' and c.entity_id = $1 and c.archived_at is null order by c.created_at desc`),
  ]);
  const canEdit = await db.one<{ ok: boolean }>(`select app.can_edit_project($1) as ok`, [id]);
  return { p, secondary, topics, members, updates, milestones, tasks, deps, dependents, risks, decisions, expenses, attachments, feasibility, comments, canEdit: Boolean(canEdit?.ok) };
}
