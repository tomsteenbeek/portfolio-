import type { Db } from "@/lib/db";

export async function getPlan(db: Db, year: number, fin: boolean) {
  const plan = await db.one<{ id: string; year: number; title: string; theme: string | null; status: string; sections: Record<string, string>; updated_at: string }>(
    `select id, year, title, theme, status, sections, updated_at from annual_plans where year = $1`, [year]);
  const years = await db.query<{ year: number; status: string }>(`select year, status from annual_plans order by year`);
  if (!plan) return { plan: null, years };
  const [items, pillars, versions, recurring, risks, decisions, candidates, budgets, capacity] = await Promise.all([
    db.query<{ id: string; kind: string; ref_id: string; label: string; priority: string | null; status: string | null; pillar: number | null; hours: number | null; budget: number | null; note: string | null; flags: boolean }>(
      `select ap.id, ap.note,
              case when j.id is not null then 'Project' when t.id is not null then 'Onderwerp' else 'Programma' end as kind,
              coalesce(j.id, t.id, g.id) as ref_id,
              coalesce(j.number || ' ' || j.name, t.code || ' ' || t.title, g.name) as label,
              coalesce(j.priority_category, t.priority_category) as priority, coalesce(j.status, t.status, g.status) as status,
              coalesce(pj.number, pt.number, pg.number) as pillar,
              coalesce(j.hours_required, t.required_capacity_hours) as hours, ${fin ? "coalesce(j.budget, t.required_budget)" : "null::numeric"} as budget,
              coalesce(t.flag_legal or t.flag_hard_deadline or t.flag_acute_risk or t.flag_admin_decided, false) as flags
         from annual_plan_projects ap left join projects j on j.id = ap.project_id left join topics t on t.id = ap.topic_id left join programs g on g.id = ap.program_id
         left join pillars pj on pj.id = j.primary_pillar_id left join pillars pt on pt.id = t.pillar_id left join pillars pg on pg.id = g.pillar_id
        where ap.plan_id = $1 order by pillar, priority nulls last, label`, [plan.id]),
    db.query<{ id: string; number: number; title: string; objective: string; ambition_year: string | null; results: string[] }>(
      `select p.id, p.number, p.title, p.objective, p.ambition_year,
              coalesce((select array_agg(text order by sort_order) from pillar_objectives o where o.pillar_id = p.id and kind = 'gewenst_resultaat'), '{}') as results
         from pillars p where archived_at is null order by number`),
    db.query<{ id: string; version: number; status: string; note: string | null; created_at: string; by_name: string | null }>(
      `select v.id, v.version, v.status, v.note, v.created_at, u.display_name as by_name from annual_plan_versions v left join users u on u.id = v.created_by where plan_id = $1 order by version desc`, [plan.id]),
    db.one<{ n: number; hours: number | null; known: number }>(
      `select count(*)::int as n, sum(coalesce(hours_per_year, hours_per_occurrence*occurrences_per_year)) as hours,
              count(coalesce(hours_per_year, hours_per_occurrence*occurrences_per_year))::int as known from recurring_activities where archived_at is null`),
    db.query<{ id: string; number: string; title: string; score: number | null; category: string }>(
      `select id, number, title, coalesce(residual_score, gross_score) as score, category from risks where archived_at is null and stage in ('Signaal','Gevalideerd') order by score desc nulls last limit 8`),
    db.query<{ id: string; number: string; subject: string; decision_body: string | null }>(
      `select id, number, subject, decision_body from decisions where archived_at is null and outcome = 'Openstaand' order by created_at`),
    db.query<{ ref: string; label: string; priority: string | null }>(
      `select * from (
         select 'project:' || j.id as ref, j.number || ' ' || j.name as label, j.priority_category as priority, j.priority_score as s from projects j
          where j.archived_at is null and j.status not in ('Afgerond','Geannuleerd') and not exists (select 1 from annual_plan_projects a where a.plan_id = $1 and a.project_id = j.id)
         union all
         select 'program:' || g.id, 'Programma: ' || g.name, null, null from programs g where g.archived_at is null and not exists (select 1 from annual_plan_projects a where a.plan_id = $1 and a.program_id = g.id)
         union all
         select 'topic:' || t.id, t.code || ' ' || t.title, t.priority_category, t.priority_score from topics t
          where t.archived_at is null and t.status in ('Gevalideerd','In beoordeling','Te valideren')
            and not exists (select 1 from annual_plan_projects a where a.plan_id = $1 and a.topic_id = t.id)
       ) x order by priority nulls last, s desc nulls last, label`, [plan.id]),
    fin ? db.query<{ kind: string; category: string | null; total: number }>(`select kind, category, sum(amount) as total from budgets where year = $1 group by kind, category`, [year]) : Promise.resolve(null),
    db.one<{ available: number | null; planned: number | null }>(
      `select sum(a.hours) filter (where a.kind = 'Beschikbaar') as available, sum(a.hours) filter (where a.kind <> 'Beschikbaar') as planned
         from capacity_allocations a join capacity_periods p on p.id = a.period_id where p.year = $1 and a.scenario_id is null`, [year]),
  ]);
  return { plan, years, items, pillars, versions, recurring, risks, decisions, candidates, budgets, capacity };
}
