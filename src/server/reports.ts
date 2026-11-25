import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { withUser } from "@/lib/db";
import { respond, type ExportFormat, type Sheet } from "@/server/export";
import { listTopics } from "@/server/queries/topics";
import { summarize } from "@/lib/stats";

const col = (key: string, label: string, width?: number) => ({ key, label, width });

export const REPORTS = ["jaarplan", "directie", "portfolio", "inventarisatie", "prioritering", "formatie", "capaciteit", "risicos", "roadmap"] as const;
export type ReportKey = (typeof REPORTS)[number];

/** Rapportage samenstellen en downloaden (met de rechten van de huidige demorol). */
export async function exportReport(report: ReportKey, format: ExportFormat, yearArg?: number) {
  const user = await requireUser();
  const fin = can(user.roles, "finance.view");
  const result = await withUser(user.id, async (db): Promise<{ title: string; sheets: Sheet[] } | null> => {
    const year = Number(yearArg ?? (await db.one<{ value: number }>(`select value from settings where key = 'jaarplan.actief_jaar'`))?.value ?? 2027);
    const projects = () => db.query(
      `select j.number, j.name, p.number as pijler, g.name as programma, j.status, j.priority_category as prioriteit, round(j.priority_score::numeric,1) as score,
              round(j.feasibility_score::numeric,0) as haalbaarheid, u.display_name as projectleider, j.start_date as start, j.end_date as einde, j.planning_status as planning,
              j.progress_pct as voortgang, j.hours_required as uren_benodigd, j.hours_actual as uren_gerealiseerd,
              ${fin ? "j.budget, j.actual_cost as kosten," : ""} j.rag_time as tijd, j.rag_money as geld, j.rag_scope as scope, j.rag_quality as kwaliteit, j.rag_capacity as capaciteit, j.rag_risk as risico
         from projects j join pillars p on p.id = j.primary_pillar_id left join programs g on g.id = j.program_id left join users u on u.id = j.project_leader_id
        where j.archived_at is null order by p.number, j.number`);
    const projCols = [col("number", "Nr."), col("name", "Project", 40), col("pijler", "Pijler"), col("programma", "Programma"), col("status", "Status"), col("prioriteit", "Prioriteit"),
      col("score", "Score"), col("haalbaarheid", "Haalbaarheid"), col("projectleider", "Projectleider"), col("start", "Start"), col("einde", "Einde"), col("planning", "Planning"),
      col("voortgang", "Voortgang %"), col("uren_benodigd", "Uren benodigd"), col("uren_gerealiseerd", "Uren gerealiseerd"), ...(fin ? [col("budget", "Budget"), col("kosten", "Kosten")] : []),
      col("tijd", "Tijd"), col("geld", "Geld"), col("scope", "Scope"), col("kwaliteit", "Kwaliteit"), col("capaciteit", "Capaciteit"), col("risico", "Risico")];
    const risks = () => db.query(
      `select r.number, r.title, r.category, r.stage, p.number as pijler, j.number as project, r.likelihood, r.impact, r.gross_score, r.residual_score, u.display_name as eigenaar, r.deadline, r.escalation_level, r.proposed_measures
         from risks r left join pillars p on p.id = r.pillar_id left join projects j on j.id = r.project_id left join users u on u.id = r.owner_user_id
        where r.archived_at is null order by coalesce(r.residual_score, r.gross_score) desc nulls last`);
    const riskCols = [col("number", "Risico-ID"), col("title", "Titel", 40), col("category", "Categorie"), col("stage", "Status"), col("pijler", "Pijler"), col("project", "Project"),
      col("likelihood", "Kans"), col("impact", "Impact"), col("gross_score", "Bruto"), col("residual_score", "Rest"), col("eigenaar", "Eigenaar"), col("deadline", "Deadline"), col("escalation_level", "Escalatie"), col("proposed_measures", "Maatregelen", 40)];
    const pillarSummary = () => db.query(
      `select p.number, p.title, p.objective, p.maturity_current, p.maturity_target,
              (select count(*) from topics t where t.pillar_id = p.id and t.archived_at is null and t.status <> 'Samengevoegd')::int as onderwerpen,
              (select count(*) from topics t where t.pillar_id = p.id and t.status = 'Gevalideerd')::int as gevalideerd,
              (select count(*) from projects j where j.primary_pillar_id = p.id and j.status = 'In uitvoering')::int as actieve_projecten,
              (select count(*) from risks r where r.pillar_id = p.id and r.stage in ('Signaal','Gevalideerd') and r.archived_at is null)::int as open_risicos
         from pillars p order by number`);
    const pillarCols = [col("number", "Pijler"), col("title", "Titel", 35), col("objective", "Doelstelling", 60), col("onderwerpen", "Onderwerpen"), col("gevalideerd", "Gevalideerd"),
      col("actieve_projecten", "Actieve projecten"), col("open_risicos", "Open risico's"), col("maturity_current", "Volwassenheid huidig"), col("maturity_target", "Volwassenheid gewenst")];
    const decisions = () => db.query(`select number, subject, outcome, decision_body, decision_date, rationale from decisions where archived_at is null order by created_at desc`);
    const decCols = [col("number", "Nr."), col("subject", "Onderwerp", 40), col("outcome", "Status"), col("decision_body", "Orgaan"), col("decision_date", "Datum"), col("rationale", "Onderbouwing", 40)];

    switch (report) {
      case "portfolio": return { title: "Projectportfolio", sheets: [{ name: "Projecten", columns: projCols, rows: await projects() }] };
      case "risicos": return { title: "Risicoregister", sheets: [{ name: "Risico's", columns: riskCols, rows: await risks() }] };
      case "inventarisatie": {
        const rows = (await listTopics(db)).map((r) => ({ ...r, pillar: r.pillar_number }));
        return { title: "Totale inventarisatie", sheets: [{ name: "Onderwerpen", columns: [col("code", "ID"), col("title", "Titel", 40), col("pillar", "Pijler"), col("program_name", "Programma"), col("sources", "Bron"),
          col("classifications", "Type"), col("status", "Status"), col("priority_category", "Prioriteit"), col("priority_score", "Score"), col("flags", "Markeringen"), col("required_capacity_hours", "Uren"),
          ...(fin ? [col("required_budget", "Budget")] : []), col("owner_name", "Verantwoordelijke")], rows }] };
      }
      case "roadmap": return { title: `Meerjarenroadmap`, sheets: [
        { name: "Projecten", columns: projCols.filter((c) => ["number", "name", "pijler", "programma", "status", "prioriteit", "start", "einde", "planning", "projectleider"].includes(c.key)), rows: await projects() },
        { name: "Mijlpalen", columns: [col("project", "Project"), col("title", "Mijlpaal", 40), col("due_date", "Datum"), col("status", "Status"), col("is_legal_deadline", "Wettelijk")],
          rows: await db.query(`select j.number as project, m.title, m.due_date, m.status, m.is_legal_deadline from milestones m join projects j on j.id = m.project_id order by m.due_date`) },
        { name: "Afhankelijkheden", columns: [col("a", "Project"), col("b", "Afhankelijk van"), col("kind", "Type")],
          rows: await db.query(`select a.number || ' ' || a.name as a, b.number || ' ' || b.name as b, d.kind from project_dependencies d join projects a on a.id = d.project_id join projects b on b.id = d.depends_on_project_id`) },
      ] };
      case "prioritering": {
        const items = await db.query<{ sessie: string; item: string; consensus: string | null; definitief: string | null; scores: number[] }>(
          `select s.name as sessie, coalesce(t.code || ' ' || t.title, j.number || ' ' || j.name) as item, i.consensus_category as consensus,
                  (select d.final_category from priority_decisions d where d.session_item_id = i.id order by decided_at desc limit 1) as definitief,
                  coalesce((select array_agg(a.total_score) from priority_assessments a where a.session_item_id = i.id and not a.is_consensus), '{}') as scores
             from priority_session_items i join priority_sessions s on s.id = i.session_id left join topics t on t.id = i.topic_id left join projects j on j.id = i.project_id
            order by s.created_at desc, i.sort_order`);
        const rows = items.map((x) => { const st = summarize(x.scores); return { ...x, n: st.n, gemiddelde: st.mean?.toFixed(1), mediaan: st.median, hoogste: st.max, laagste: st.min, spreiding: st.stdev?.toFixed(1), overeenstemming: st.agreement }; });
        return { title: "Prioriteringsresultaten", sheets: [{ name: "Resultaten", columns: [col("sessie", "Sessie", 30), col("item", "Item", 40), col("n", "Aantal"), col("gemiddelde", "Gemiddelde"), col("mediaan", "Mediaan"),
          col("hoogste", "Hoogste"), col("laagste", "Laagste"), col("spreiding", "Spreiding"), col("overeenstemming", "Overeenstemming"), col("consensus", "Consensus"), col("definitief", "Definitief")], rows }] };
      }
      case "formatie": {
        if (!can(user.roles, "staffing.view")) return null;
        return { title: "Formatieanalyse", sheets: [
          { name: "Posities", columns: [col("title", "Functie", 30), col("discipline", "Discipline"), col("subteam", "Subteam"), col("fte", "FTE"), col("kind", "Soort"), col("occupancy", "Bezetting"), col("annual_cost", "Jaarkosten")],
            rows: await db.query(`select s.title, d.name as discipline, s.subteam, s.fte, s.kind, s.occupancy, s.annual_cost from staffing_positions s join disciplines d on d.id = s.discipline_id where s.archived_at is null order by d.sort_order`) },
          { name: "Scenario's", columns: [col("scenario", "Scenario", 30), col("discipline", "Discipline"), col("title", "Functie"), col("fte", "FTE"), col("kind", "Soort"), col("annual_cost", "Kosten")],
            rows: await db.query(`select sc.name as scenario, d.name as discipline, p.title, p.fte, p.kind, p.annual_cost from staffing_scenario_positions p join staffing_scenarios sc on sc.id = p.scenario_id join disciplines d on d.id = p.discipline_id order by sc.name, d.sort_order`) },
        ] };
      }
      case "capaciteit": return { title: `Capaciteitsplanning ${year}`, sheets: [{ name: "Capaciteit", columns: [col("kwartaal", "Kwartaal"), col("discipline", "Discipline"), col("beschikbaar", "Beschikbaar"), col("regulier", "Regulier"), col("project", "Project"), col("reservering", "Reservering"), col("saldo", "Saldo")],
        rows: await db.query(`select 'Q' || p.quarter as kwartaal, d.name as discipline,
            round(sum(a.hours) filter (where a.kind='Beschikbaar')) as beschikbaar, round(sum(a.hours) filter (where a.kind='Regulier')) as regulier,
            round(sum(a.hours) filter (where a.kind='Project')) as project, round(sum(a.hours) filter (where a.kind='Reservering')) as reservering,
            round(coalesce(sum(a.hours) filter (where a.kind='Beschikbaar'),0) - coalesce(sum(a.hours) filter (where a.kind<>'Beschikbaar'),0)) as saldo
          from capacity_allocations a join capacity_periods p on p.id = a.period_id join disciplines d on d.id = a.discipline_id
          where p.year = $1 and a.scenario_id is null group by p.quarter, d.name, d.sort_order order by p.quarter, d.sort_order`, [year]) }] };
      case "jaarplan": {
        const plan = await db.one<{ id: string; title: string; status: string; theme: string | null; sections: Record<string, string> }>(`select id, title, status, theme, sections from annual_plans where year = $1`, [year]);
        if (!plan) return null;
        return { title: plan.title, sheets: [
          { name: "Tekst", columns: [col("sectie", "Sectie", 30), col("tekst", "Tekst", 100)], rows: [{ sectie: "Status", tekst: plan.status }, { sectie: "Thema", tekst: plan.theme }, ...Object.entries(plan.sections).map(([k, v]) => ({ sectie: k, tekst: v }))] },
          { name: "Pijlers", columns: pillarCols, rows: await pillarSummary() },
          { name: "Initiatieven", columns: [col("soort", "Soort"), col("label", "Initiatief", 50), col("prioriteit", "Prioriteit"), col("note", "Toelichting", 40)],
            rows: await db.query(`select case when j.id is not null then 'Project' when t.id is not null then 'Onderwerp' else 'Programma' end as soort,
                coalesce(j.number || ' ' || j.name, t.code || ' ' || t.title, g.name) as label, coalesce(j.priority_category, t.priority_category) as prioriteit, ap.note
                from annual_plan_projects ap left join projects j on j.id = ap.project_id left join topics t on t.id = ap.topic_id left join programs g on g.id = ap.program_id where ap.plan_id = $1`, [plan.id]) },
          { name: "Risico's", columns: riskCols, rows: (await risks()).slice(0, 15) },
          { name: "Besluiten", columns: decCols, rows: await decisions() },
        ] };
      }
      case "directie": return { title: "Directierapportage", sheets: [
        { name: "Pijlers", columns: pillarCols, rows: await pillarSummary() },
        { name: "Projecten", columns: projCols.filter((c) => !["haalbaarheid", "uren_gerealiseerd"].includes(c.key)), rows: await projects() },
        { name: "Risico's", columns: riskCols.filter((c) => !["likelihood", "impact"].includes(c.key)), rows: (await risks()).slice(0, 10) },
        { name: "Besluiten", columns: decCols, rows: await decisions() },
      ] };
    }
  });
  if (!result) throw new Error("Geen gegevens of geen toegang voor deze rapportage met deze demorol.");
  return respond(format, report, result.title, result.sheets);
}

const TOPIC_LABELS: Record<string, string> = {
  code: "ID", title: "Titel", pillar: "Pijler", subcategory: "Subcategorie", program_name: "Programma", description: "Omschrijving", scope: "Wat valt eronder",
  reason: "Aanleiding", current_situation: "Huidige situatie", desired_situation: "Gewenste situatie", problem_statement: "Probleemstelling",
  intended_result: "Beoogd resultaat", sources: "Bron", classifications: "Type werkzaamheden", owner_name: "Eigenaar",
  disciplines: "Betrokken disciplines", strategic_contribution: "Strategische bijdrage", legal_basis: "Wettelijke grondslag",
  legal_deadline: "Wettelijke deadline", risk_if_not_done: "Risico bij niet uitvoeren", service_impact: "Impact op dienstverlening",
  dependencies_text: "Afhankelijkheden", maturity_current: "Volwassenheid (huidig)", maturity_target: "Volwassenheid (gewenst)",
  priority_category: "Prioriteit", priority_score: "Prioriteitsscore", flags: "Markeringen", required_capacity_hours: "Benodigde capaciteit (uur)",
  required_budget: "Benodigd budget (EUR)", status: "Status", remarks: "Opmerkingen", updated_at: "Laatst gewijzigd",
};

/** Export van (gefilterde) onderwerpen met de zichtbare kolommen. */
export async function exportTopics(idList: string[], colList: string[], format: ExportFormat) {
  const user = await requireUser();
  const ids = new Set(idList);
  let cols = colList.filter((c) => c in TOPIC_LABELS);
  if (!cols.length) cols = Object.keys(TOPIC_LABELS);
  if (cols.includes("maturity_current")) cols.splice(cols.indexOf("maturity_current") + 1, 0, "maturity_target");
  if (cols.includes("priority_category")) cols.splice(cols.indexOf("priority_category") + 1, 0, "priority_score");
  const rows = await withUser(user.id, (db) => listTopics(db, { includeArchived: true }));
  const data = rows.filter((r) => ids.size === 0 || ids.has(r.id)).map((r) => ({ ...r, pillar: `${r.pillar_number}. ${r.pillar_title}` }));
  return respond(format, "onderwerpen", "Onderwerpen", [
    { name: "Onderwerpen", columns: cols.map((k) => ({ key: k, label: TOPIC_LABELS[k], width: ["title", "description"].includes(k) ? 50 : undefined })), rows: data },
  ]);
}
