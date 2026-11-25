import type { Db } from "@/lib/db";
import { OWNER_NO_CAPACITY, OWNER_NO_PERSON } from "@/lib/domain";

export const ACTIVE_PROJECT = ["Gepland", "Goedgekeurd", "In voorbereiding", "In uitvoering", "Geblokkeerd"];

export type PillarSummary = {
  id: string; number: number; title: string; short_title: string | null; objective: string;
  ambition_year: string | null; ambition_q1: string | null; ambition_q2: string | null; ambition_q3: string | null; ambition_q4: string | null;
  topics: number; topics_with_owner: number; topics_no_capacity: number; topics_no_person: number; topics_described: number;
  kpis: number; projects_running: number; projects_total: number; last_update: string | null;
};

/** Overzicht per pijler: onderwerpen, eigenaarschap, KPI's, projecten/initiatieven en ambities per kwartaal. */
export async function pillarSummaries(db: Db) {
  return db.query<PillarSummary>(
    `with pj as (
       select j.id, j.status, j.primary_pillar_id as pillar_id from projects j where j.archived_at is null
       union select j.id, j.status, pp.pillar_id from projects j join project_pillars pp on pp.project_id = j.id where j.archived_at is null
       union select j.id, j.status, t.pillar_id from projects j join project_topics pt on pt.project_id = j.id join topics t on t.id = pt.topic_id where j.archived_at is null),
     tp as (select t.* from topics t where t.archived_at is null and t.status not in ('Samengevoegd','Gesplitst'))
     select p.id, p.number, p.title, p.short_title, p.objective, p.ambition_year, p.ambition_q1, p.ambition_q2, p.ambition_q3, p.ambition_q4,
       (select count(*) from tp where tp.pillar_id = p.id)::int as topics,
       (select count(*) from tp where tp.pillar_id = p.id and coalesce(tp.owner_name,'') <> '' and tp.owner_name not in ($1, $2))::int as topics_with_owner,
       (select count(*) from tp where tp.pillar_id = p.id and tp.owner_name = $2)::int as topics_no_capacity,
       (select count(*) from tp where tp.pillar_id = p.id and tp.owner_name = $1)::int as topics_no_person,
       (select count(*) from tp where tp.pillar_id = p.id and (coalesce(tp.description,'') <> '' or coalesce(tp.scope,'') <> ''))::int as topics_described,
       (select count(*) from kpis k left join topics t on t.id = k.topic_id where k.archived_at is null and (k.pillar_id = p.id or t.pillar_id = p.id))::int as kpis,
       (select count(distinct id) from pj where pj.pillar_id = p.id and pj.status = 'In uitvoering')::int as projects_running,
       (select count(distinct id) from pj where pj.pillar_id = p.id and pj.status not in ('Afgerond','Geannuleerd'))::int as projects_total,
       greatest(p.updated_at, (select max(updated_at) from topics t where t.pillar_id = p.id)) as last_update
     from pillars p where p.archived_at is null order by p.number`, [OWNER_NO_PERSON, OWNER_NO_CAPACITY]);
}

export async function pillarDetail(db: Db, number: number) {
  const p = await db.one<{ id: string; number: number; title: string; short_title: string | null; description: string | null; objective: string;
    ambition_year: string | null; ambition_multi_year: string | null; updated_at: string;
    ambition_q1: string | null; ambition_q2: string | null; ambition_q3: string | null; ambition_q4: string | null }>(
    `select id, number, title, short_title, description, objective, ambition_year, ambition_multi_year, updated_at,
            ambition_q1, ambition_q2, ambition_q3, ambition_q4 from pillars where number = $1`, [number]);
  if (!p) return null;
  const [results, topics, kpis, projects] = await Promise.all([
    db.query<{ text: string }>(`select text from pillar_objectives where pillar_id = $1 and kind = 'gewenst_resultaat' order by sort_order`, [p.id]),
    db.query<{ id: string; code: string; title: string; owner_name: string | null; description: string | null; scope: string | null; kpi_count: number; project_count: number }>(
      `select t.id, t.code, t.title, t.owner_name, t.description, t.scope,
              (select count(*) from kpis k where k.topic_id = t.id and k.archived_at is null)::int as kpi_count,
              (select count(*) from project_topics pt join projects j on j.id = pt.project_id where pt.topic_id = t.id and j.archived_at is null)::int as project_count
         from topics t where t.pillar_id = $1 and t.archived_at is null and t.status not in ('Samengevoegd','Gesplitst')
        order by string_to_array(t.code,'.')::int[]`, [p.id]),
    db.query<{ id: string; name: string; unit: string | null; target_value: number | null; latest: number | null; topic: string | null; owner_name: string | null }>(
      `select k.id, k.name, k.unit, k.target_value, k.owner_name, t.code || ' ' || t.title as topic,
              (select value from kpi_measurements m where m.kpi_id = k.id order by measured_on desc limit 1) as latest
         from kpis k left join topics t on t.id = k.topic_id
        where k.archived_at is null and (k.pillar_id = $1 or t.pillar_id = $1) order by k.name`, [p.id]),
    db.query<{ id: string; number: string; name: string; status: string; lead_name: string | null; end_date: string | null; planner_url: string | null; topics: string[] }>(
      `select j.id, j.number, j.name, j.status, j.lead_name, j.end_date, j.planner_url,
              coalesce((select array_agg(t.code order by t.code) from project_topics pt join topics t on t.id = pt.topic_id where pt.project_id = j.id), '{}') as topics
         from projects j where j.archived_at is null and (j.primary_pillar_id = $1
           or exists (select 1 from project_pillars pp where pp.project_id = j.id and pp.pillar_id = $1)
           or exists (select 1 from project_topics pt join topics t on t.id = pt.topic_id where pt.project_id = j.id and t.pillar_id = $1))
        order by (j.status in ('Afgerond','Geannuleerd')), j.end_date nulls last, j.name`, [p.id]),
  ]);
  return { p, results, topics, kpis, projects };
}
