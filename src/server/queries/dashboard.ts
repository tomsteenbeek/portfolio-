import type { Db } from "@/lib/db";

/**
 * Alle dashboardcijfers worden in de database berekend uit brongegevens
 * (reproduceerbaar). Null betekent: onbekend / niet ingevuld – nooit 0.
 */
export async function getSettings(db: Db) {
  const rows = await db.query<{ key: string; value: unknown }>(`select key, value from settings`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
}

export async function dashboardKpis(db: Db, year: number, canFinance: boolean) {
  const k = await db.one<{
    pillars: number; topics: number; validated: number; to_validate: number; active_projects: number; projects_total: number;
    high_risk_projects: number; open_decisions: number;
    req_hours_topics: number | null; req_hours_projects: number | null; req_hours_recurring: number | null;
    topics_with_hours: number; recurring_with_hours: number; recurring_total: number;
    available_hours: number | null; protected_topics: number;
  }>(
    `select
      (select count(*) from pillars where archived_at is null) as pillars,
      (select count(*) from topics where archived_at is null and status not in ('Samengevoegd')) as topics,
      (select count(*) from topics where archived_at is null and status in ('Gevalideerd','Omgezet naar project')) as validated,
      (select count(*) from topics where archived_at is null and status = 'Te valideren') as to_validate,
      (select count(*) from projects where archived_at is null and status = 'In uitvoering') as active_projects,
      (select count(*) from projects where archived_at is null and status not in ('Afgerond','Geannuleerd')) as projects_total,
      (select count(distinct p.id) from projects p left join risks r on r.project_id = p.id and r.stage in ('Signaal','Gevalideerd')
         where p.archived_at is null and p.status not in ('Afgerond','Geannuleerd')
           and (p.rag_risk = 'rood' or coalesce(r.residual_score, r.gross_score) >= 15)) as high_risk_projects,
      (select count(*) from decisions where archived_at is null and outcome = 'Openstaand') as open_decisions,
      (select sum(required_capacity_hours) from topics where archived_at is null and status in ('Gevalideerd','In beoordeling','Te valideren')
         and not exists (select 1 from project_topics pt where pt.topic_id = topics.id)) as req_hours_topics,
      (select sum(hours_required) from projects where archived_at is null and status not in ('Afgerond','Geannuleerd','Idee')
         and (start_date is null or extract(year from start_date) <= $1) and (end_date is null or extract(year from end_date) >= $1)) as req_hours_projects,
      (select sum(coalesce(hours_per_year, hours_per_occurrence * occurrences_per_year)) from recurring_activities where archived_at is null) as req_hours_recurring,
      (select count(*) from topics where archived_at is null and required_capacity_hours is not null) as topics_with_hours,
      (select count(*) from recurring_activities where archived_at is null and coalesce(hours_per_year, hours_per_occurrence * occurrences_per_year) is not null) as recurring_with_hours,
      (select count(*) from recurring_activities where archived_at is null) as recurring_total,
      (select sum(a.hours) from capacity_allocations a join capacity_periods cp on cp.id = a.period_id
         where a.kind = 'Beschikbaar' and a.scenario_id is null and cp.year = $1) as available_hours,
      (select count(*) from topics where archived_at is null and status not in ('Niet relevant','Samengevoegd')
         and (flag_legal or flag_hard_deadline or flag_acute_risk or flag_admin_decided)) as protected_topics`,
    [year],
  );
  let budget: { required: number | null; available: number | null } | null = null;
  if (canFinance) {
    budget = await db.one(
      `select
        (select sum(amount) from budgets where year = $1 and kind = 'Benodigd') +
          coalesce((select sum(required_budget) from topics where archived_at is null and status not in ('Niet relevant','Samengevoegd','Omgezet naar project')), 0) as required,
        (select sum(amount) from budgets where year = $1 and kind = 'Beschikbaar') as available`,
      [year],
    );
    // 'required' blijft null als er nergens een bedrag is ingevuld
    const anyRequired = await db.one<{ n: number }>(
      `select (select count(*) from budgets where year=$1 and kind='Benodigd') + (select count(*) from topics where required_budget is not null) as n`,
      [year],
    );
    if (budget && !anyRequired?.n) budget.required = null;
  }
  const required =
    k!.req_hours_topics === null && k!.req_hours_projects === null && k!.req_hours_recurring === null
      ? null
      : (k!.req_hours_topics ?? 0) + (k!.req_hours_projects ?? 0) + (k!.req_hours_recurring ?? 0);
  return { ...k!, required_hours: required, budget };
}

export type PillarCard = {
  id: string; number: number; title: string; short_title: string; objective: string;
  topics: number; programs: number; active_projects: number; projects: number;
  p1: number; p2: number; p3: number; p4: number; unprioritized: number;
  progress: number | null; max_risk: number | null; open_risks: number;
  req_hours: number | null; req_budget: number | null; avail_budget: number | null;
  maturity_current: number | null; maturity_target: number | null;
  last_update: string | null;
};

export async function pillarCards(db: Db, year: number, canFinance: boolean): Promise<PillarCard[]> {
  return db.query<PillarCard>(
    `select p.id, p.number, p.title, p.short_title, p.objective, p.maturity_current, p.maturity_target,
       (select count(*) from topics t where t.pillar_id = p.id and t.archived_at is null and t.status <> 'Samengevoegd') as topics,
       (select count(*) from programs g where g.pillar_id = p.id and g.archived_at is null) as programs,
       (select count(*) from projects j where j.primary_pillar_id = p.id and j.archived_at is null and j.status = 'In uitvoering') as active_projects,
       (select count(*) from projects j where j.primary_pillar_id = p.id and j.archived_at is null and j.status not in ('Afgerond','Geannuleerd')) as projects,
       (select count(*) from topics t where t.pillar_id = p.id and t.archived_at is null and t.priority_category = 'P1') as p1,
       (select count(*) from topics t where t.pillar_id = p.id and t.archived_at is null and t.priority_category = 'P2') as p2,
       (select count(*) from topics t where t.pillar_id = p.id and t.archived_at is null and t.priority_category = 'P3') as p3,
       (select count(*) from topics t where t.pillar_id = p.id and t.archived_at is null and t.priority_category = 'P4') as p4,
       (select count(*) from topics t where t.pillar_id = p.id and t.archived_at is null and t.priority_category is null
          and t.status not in ('Samengevoegd','Niet relevant')) as unprioritized,
       coalesce(p.progress_pct, (select avg(progress_pct) from projects j where j.primary_pillar_id = p.id and j.archived_at is null
          and j.status in ('In uitvoering','Geblokkeerd','Gepauzeerd','Afgerond'))) as progress,
       (select max(coalesce(r.residual_score, r.gross_score)) from risks r where r.pillar_id = p.id and r.archived_at is null and r.stage in ('Signaal','Gevalideerd')) as max_risk,
       (select count(*) from risks r where r.pillar_id = p.id and r.archived_at is null and r.stage in ('Signaal','Gevalideerd')) as open_risks,
       (select sum(required_capacity_hours) from topics t where t.pillar_id = p.id and t.archived_at is null and t.status not in ('Niet relevant','Samengevoegd')) as req_hours,
       ${canFinance ? `(select sum(amount) from budgets b where b.pillar_id = p.id and b.year = $1 and b.kind = 'Benodigd')` : "(select null::numeric where $1::int is not null)"} as req_budget,
       ${canFinance ? `(select sum(amount) from budgets b where b.pillar_id = p.id and b.year = $1 and b.kind = 'Beschikbaar')` : "null::numeric"} as avail_budget,
       greatest(p.updated_at,
         (select max(updated_at) from topics t where t.pillar_id = p.id),
         (select max(updated_at) from projects j where j.primary_pillar_id = p.id)) as last_update
     from pillars p where p.archived_at is null order by p.sort_order, p.number`,
    [year],
  );
}

export async function dashboardCharts(db: Db, year: number) {
  const [byPriority, byStatus, byPillarProgress, byQuarter, capacity, topRisks, deadlines, needsDecision, insufficient, topicStatus] =
    await Promise.all([
      db.query<{ label: string; value: number }>(
        `select c as label, (select count(*) from projects where priority_category = c and archived_at is null and status not in ('Afgerond','Geannuleerd')) as value
           from unnest(array['P1','P2','P3','P4']) c`,
      ),
      db.query<{ label: string; value: number }>(
        `select status as label, count(*) as value from projects where archived_at is null group by status
          order by array_position(array['Idee','Te onderzoeken','In voorbereiding','Ter besluitvorming','Goedgekeurd','Gepland','In uitvoering','Geblokkeerd','Gepauzeerd','Afgerond','Geannuleerd'], status)`,
      ),
      db.query<{ label: string; value: number | null }>(
        `select 'P' || p.number || ' ' || coalesce(p.short_title, p.title) as label,
                coalesce(p.progress_pct, (select avg(progress_pct) from projects j where j.primary_pillar_id = p.id and j.archived_at is null
                   and j.status in ('In uitvoering','Geblokkeerd','Gepauzeerd','Afgerond'))) as value
           from pillars p where p.archived_at is null order by p.number`,
      ),
      db.query<{ label: string; value: number }>(
        `select 'Q' || q || ' ' || $1 as label,
                (select count(*) from projects j where j.archived_at is null and j.status not in ('Geannuleerd')
                   and j.start_date <= make_date($1::int, q*3, 1) + interval '1 month' - interval '1 day'
                   and coalesce(j.end_date, j.start_date) >= make_date($1::int, q*3-2, 1)) as value
           from generate_series(1,4) q`,
        [year],
      ),
      db.query<{ label: string; a: number | null; b: number | null }>(
        `select d.name as label,
           (select sum(hours) from capacity_allocations a join capacity_periods cp on cp.id = a.period_id
             where a.discipline_id = d.id and a.kind in ('Regulier','Project','Reservering') and a.scenario_id is null and cp.year = $1) as a,
           (select sum(hours) from capacity_allocations a join capacity_periods cp on cp.id = a.period_id
             where a.discipline_id = d.id and a.kind = 'Beschikbaar' and a.scenario_id is null and cp.year = $1) as b
         from disciplines d order by d.sort_order`,
        [year],
      ),
      db.query<{ id: string; number: string; title: string; score: number; category: string; pillar: number | null; stage: string }>(
        `select r.id, r.number, r.title, coalesce(r.residual_score, r.gross_score) as score, r.category, p.number as pillar, r.stage
           from risks r left join pillars p on p.id = r.pillar_id
          where r.archived_at is null and r.stage in ('Signaal','Gevalideerd') and r.gross_score is not null
          order by coalesce(r.residual_score, r.gross_score) desc nulls last limit 6`,
      ),
      db.query<{ kind: string; title: string; date: string; href: string }>(
        `select * from (
           select 'Mijlpaal' as kind, m.title || coalesce(' – ' || j.name, '') as title, m.due_date::text as date,
                  coalesce('/projecten/detail?id=' || j.id, '/roadmap') as href
             from milestones m left join projects j on j.id = m.project_id where m.status = 'Open' and m.due_date >= current_date
           union all
           select 'Wettelijke deadline', t.code || ' ' || t.title, t.legal_deadline::text, '/onderwerpen/detail?id=' || t.id
             from topics t where t.legal_deadline >= current_date and t.archived_at is null
           union all
           select 'Regelgeving', r.name, r.deadline::text, '/wetgeving' from regulatory_requirements r where r.deadline >= current_date
           union all
           select 'Risicomaatregel', r.number || ' ' || r.title, r.deadline::text, '/risicos/detail?id=' || r.id
             from risks r where r.deadline >= current_date and r.archived_at is null and r.stage <> 'Gesloten'
         ) x order by date limit 8`,
      ),
      db.query<{ id: string; label: string; href: string; kind: string }>(
        `select * from (
           select j.id, j.number || ' ' || j.name as label, '/projecten/detail?id=' || j.id as href, 'Project ter besluitvorming' as kind
             from projects j where j.status = 'Ter besluitvorming' and j.archived_at is null
           union all
           select d.id, d.number || ' ' || d.subject, '/besluiten/detail?id=' || d.id, 'Openstaand besluit'
             from decisions d where d.outcome = 'Openstaand' and d.archived_at is null
         ) x limit 8`,
      ),
      db.query<{ id: string; code: string; title: string; reasons: string[]; flags: boolean }>(
        `select t.id, t.code, t.title,
                array_remove(array[
                  case when f.blocking_capacity then 'Capaciteit' end,
                  case when f.blocking_expertise then 'Expertise' end,
                  case when f.blocking_budget then 'Budget' end], null) as reasons,
                (t.flag_legal or t.flag_hard_deadline or t.flag_acute_risk or t.flag_admin_decided) as flags
           from topics t
           join lateral (select * from feasibility_assessments fa where fa.topic_id = t.id order by assessed_at desc limit 1) f on true
          where t.archived_at is null and t.status not in ('Niet relevant','Samengevoegd')
            and (f.blocking_capacity or f.blocking_expertise or f.blocking_budget)
            and (t.priority_category in ('P1','P2') or t.flag_legal or t.flag_hard_deadline or t.flag_acute_risk or t.flag_admin_decided)
          order by t.priority_score desc nulls last limit 10`,
      ),
      db.query<{ label: string; value: number }>(
        `select s as label, (select count(*) from topics where status = s and archived_at is null) as value
           from unnest(array['Te valideren','In beoordeling','Gevalideerd','Niet relevant','Omgezet naar project']) s`,
      ),
    ]);
  return { byPriority, byStatus, byPillarProgress, byQuarter, capacity, topRisks, deadlines, needsDecision, insufficient, topicStatus };
}
