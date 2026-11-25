import type { Db } from "@/lib/db";

export type TeamOption = { name: string; function_title: string | null; kind: "Vast" | "Inhuur" };
export type TeamMember = TeamOption & {
  id: string; is_active: boolean; sort_order: number;
  topics: number; projects: number; projects_running: number; kpis: number;
};

/** Actieve teamleden voor keuzelijsten (eigenaar, trekker). */
export async function teamOptions(db: Db) {
  return db.query<TeamOption>(`select name, function_title, kind from team_members where is_active order by kind desc, sort_order, name`);
}

/** Teamleden met het aantal onderwerpen, projecten en KPI's waarvan zij eigenaar/trekker zijn. */
export async function listTeam(db: Db) {
  return db.query<TeamMember>(
    `select m.id, m.name, m.function_title, m.kind, m.is_active, m.sort_order,
            (select count(*) from topics t where t.owner_name = m.name and t.archived_at is null and t.status not in ('Samengevoegd','Gesplitst'))::int as topics,
            (select count(*) from projects j where j.lead_name = m.name and j.archived_at is null and j.status not in ('Afgerond','Geannuleerd'))::int as projects,
            (select count(*) from projects j where j.lead_name = m.name and j.archived_at is null and j.status = 'In uitvoering')::int as projects_running,
            (select count(*) from kpis k where k.owner_name = m.name and k.archived_at is null)::int as kpis
       from team_members m order by m.is_active desc, m.kind desc, m.sort_order, m.name`);
}
