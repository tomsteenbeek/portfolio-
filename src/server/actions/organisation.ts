import { z } from "zod";
import { withUser, type Db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { formObject, run, type ActionResult } from "@/server/action";
import { capacityFor, type CapacityAssumptions } from "@/lib/capacity";

const uuid = z.string().uuid();
const num = (min = 0) => z.preprocess((v) => (v === null || v === undefined || v === "" ? null : Number(String(v).replace(",", "."))), z.number().min(min).nullable());

export async function savePosition(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("staffing.edit");
    const d = z.object({
      id: uuid.nullable().optional(),
      title: z.string({ message: "Functietitel is verplicht" }).min(2, "Functietitel is verplicht").max(200),
      discipline_id: uuid,
      subteam: z.string().max(100).nullable().optional(),
      fte: z.preprocess((v) => Number(String(v ?? "").replace(",", ".")), z.number({ message: "FTE is verplicht" }).gt(0, "FTE moet groter dan 0 zijn").max(1.5)),
      kind: z.enum(["Vastgestelde formatie", "Tijdelijke inhuur", "Structurele inhuur"]),
      occupancy: z.enum(["Bezet", "Vacature", "Deels bezet"]),
      occupied_fte: num(),
      user_id: uuid.nullable().optional(),
      annual_cost: num(),
      contract_hours_per_week: num(),
      notes: z.string().max(2000).nullable().optional(),
    }).parse(formObject(fd));
    const occ = d.occupancy === "Bezet" ? d.fte : d.occupancy === "Vacature" ? 0 : d.occupied_fte;
    if (d.occupancy === "Deels bezet" && (occ === null || occ <= 0 || occ >= d.fte)) return { ok: false, error: "Vul bij 'Deels bezet' de bezette FTE in (tussen 0 en de formatie).", fieldErrors: { occupied_fte: "Ongeldig" } };
    const cols = ["title", "discipline_id", "subteam", "fte", "kind", "occupancy", "occupied_fte", "user_id", "annual_cost", "contract_hours_per_week", "notes"] as const;
    const vals = { ...d, occupied_fte: occ };
    await withUser(user.id, (db) => d.id
      ? db.query(`update staffing_positions set ${cols.map((c, i) => `${c} = $${i + 2}`).join(", ")} where id = $1`, [d.id, ...cols.map((c) => vals[c] ?? null)])
      : db.query(`insert into staffing_positions(${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})`, cols.map((c) => vals[c] ?? null)));
    return { ok: true, message: "Positie opgeslagen" };
  });
}

export async function archivePosition(id: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("staffing.edit");
    await withUser(user.id, (db) => db.query(`update staffing_positions set archived_at = now() where id = $1`, [uuid.parse(id)]));
    return { ok: true, message: "Positie gearchiveerd" };
  });
}

export async function saveScenario(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("staffing.edit");
    const d = z.object({ id: uuid.nullable().optional(), name: z.string().min(3, "Naam is verplicht").max(120), description: z.string().max(3000).nullable().optional(),
      structure_notes: z.string().max(5000).nullable().optional() }).parse(formObject(fd));
    return withUser(user.id, async (db) => {
      if (d.id) { await db.query(`update staffing_scenarios set name=$2, description=$3, structure_notes=$4 where id=$1`, [d.id, d.name, d.description ?? null, d.structure_notes ?? null]); return { ok: true, message: "Scenario opgeslagen" }; }
      const r = await db.one<{ id: string }>(`insert into staffing_scenarios(name, description, structure_notes) values ($1,$2,$3) returning id`, [d.name, d.description ?? null, d.structure_notes ?? null]);
      return { ok: true, message: "Scenario aangemaakt", redirect: `/formatie?tab=scenarios&scenario=${r!.id}` };
    });
  });
}

export async function addScenarioPosition(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("staffing.edit");
    const d = z.object({ scenario_id: uuid, discipline_id: uuid, subteam: z.string().max(100).nullable().optional(), title: z.string().min(2, "Titel verplicht").max(200),
      fte: z.preprocess((v) => Number(String(v ?? "").replace(",", ".")), z.number().gt(0).max(50)), kind: z.enum(["Intern", "Inhuur"]), annual_cost: num(),
      notes: z.string().max(1000).nullable().optional() }).parse(formObject(fd));
    await withUser(user.id, (db) => db.query(
      `insert into staffing_scenario_positions(scenario_id, discipline_id, subteam, title, fte, kind, annual_cost, notes) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [d.scenario_id, d.discipline_id, d.subteam ?? null, d.title, d.fte, d.kind, d.annual_cost, d.notes ?? null]));
    return { ok: true, message: "Positie aan scenario toegevoegd" };
  });
}

export async function removeScenarioPosition(id: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("staffing.edit");
    await withUser(user.id, (db) => db.query(`delete from staffing_scenario_positions where id = $1`, [uuid.parse(id)]));
    return { ok: true, message: "Verwijderd" };
  });
}

/** Neemt de huidige formatie (bezetting) over als startpunt voor een scenario. */
export async function copyBaselineIntoScenario(scenarioId: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("staffing.edit");
    const n = await withUser(user.id, async (db) => {
      const r = await db.query(
        `insert into staffing_scenario_positions(scenario_id, discipline_id, subteam, title, fte, kind, annual_cost)
         select $1, discipline_id, subteam, title, fte, case when kind = 'Vastgestelde formatie' then 'Intern' else 'Inhuur' end, annual_cost
           from staffing_positions where archived_at is null returning id`, [uuid.parse(scenarioId)]);
      return r.length;
    });
    return { ok: true, message: `${n} posities overgenomen uit de huidige formatie` };
  });
}

export async function saveAssumptions(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("capacity.edit");
    const keys = ["uren_per_fte_per_jaar", "vakantie_en_verlof_pct", "feestdagen_uren_per_fte", "verwachte_afwezigheid_pct", "overleg_pct", "opleiding_pct", "incidenten_onvoorzien_pct", "managementtaken_pct"] as const;
    const v: Record<string, number> = {};
    for (const k of keys) v[k] = z.preprocess((x) => Number(String(x ?? "").replace(",", ".")), z.number().min(0).max(k === "uren_per_fte_per_jaar" ? 2500 : k === "feestdagen_uren_per_fte" ? 200 : 100)).parse(fd.get(k));
    const pctSum = v.vakantie_en_verlof_pct + v.verwachte_afwezigheid_pct + v.overleg_pct + v.opleiding_pct + v.incidenten_onvoorzien_pct + v.managementtaken_pct;
    if (pctSum >= 100) return { ok: false, error: "De som van de percentages moet onder 100% blijven." };
    await withUser(user.id, (db) => db.query(`update settings set value = $1 where key = 'capaciteit.aannames'`, [JSON.stringify(v)]));
    return { ok: true, message: "Rekenaannames opgeslagen" };
  });
}

async function assumptions(db: Db) {
  return (await db.one<{ value: CapacityAssumptions }>(`select value from settings where key = 'capaciteit.aannames'`))!.value;
}

/**
 * Stelt de capaciteitsplanning voor een jaar vast (vervangt eerder gegenereerde regels):
 *  - Beschikbaar: netto inzetbare uren uit de feitelijke bezetting (incl. inhuur)
 *  - Regulier: uren uit het basispakket reguliere werkzaamheden
 *  - Project: benodigde uren van lopende/geplande projecten, naar rato van looptijd per kwartaal
 * Reserveringen voor verlof/overleg/opleiding zitten al in 'netto' en worden niet nogmaals afgetrokken.
 */
export async function establishCapacity(year: number): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("capacity.edit");
    const y = z.number().int().min(2020).max(2100).parse(year);
    return withUser(user.id, async (db) => {
      const a = await assumptions(db);
      const netPerFteQuarter = capacityFor(1, a, 0, 0.25).netto;
      const reservePct = (a.incidenten_onvoorzien_pct + a.managementtaken_pct) / 100;
      const periods = await db.query<{ id: string; quarter: number }>(`select id, quarter from capacity_periods where year = $1 order by quarter`, [y]);
      if (periods.length !== 4) {
        for (let q = 1; q <= 4; q++) await db.query(`insert into capacity_periods(year, quarter, label) values ($1,$2,$3) on conflict do nothing`, [y, q, `Q${q} ${y}`]);
        periods.splice(0, periods.length, ...(await db.query<{ id: string; quarter: number }>(`select id, quarter from capacity_periods where year = $1 order by quarter`, [y])));
      }
      const periodIds = periods.map((p) => p.id);
      const staff = await db.query<{ discipline_id: string; fte: number }>(
        `select discipline_id, sum(case occupancy when 'Bezet' then fte when 'Deels bezet' then coalesce(occupied_fte,0) else 0 end) as fte
           from staffing_positions where archived_at is null group by discipline_id`);
      const recurring = await db.query<{ discipline_id: string; hours: number }>(
        `select discipline_id, sum(coalesce(hours_per_year, hours_per_occurrence * occurrences_per_year)) as hours from recurring_activities
          where archived_at is null and discipline_id is not null and coalesce(hours_per_year, hours_per_occurrence * occurrences_per_year) is not null group by discipline_id`);
      const projects = await db.query<{ id: string; hours_required: number; start_date: string; end_date: string; disciplines: string[] }>(
        `select j.id, j.hours_required, j.start_date::text, j.end_date::text,
                coalesce((select array_agg(distinct u.discipline_id) from project_members m join users u on u.id = m.user_id where m.project_id = j.id and u.discipline_id is not null),
                         array[(select id from disciplines where code = 'PM')]) as disciplines
           from projects j where j.archived_at is null and j.status in ('Goedgekeurd','Gepland','In uitvoering','Geblokkeerd','Gepauzeerd')
            and j.hours_required is not null and j.start_date is not null and j.end_date is not null
            and j.start_date <= make_date($1,12,31) and j.end_date >= make_date($1,1,1)`, [y]);
      // Regels verzamelen en in één transactie opslaan
      const stmts: { q: string; params: unknown[] }[] = [];
      const ins = async (period: string, disc: string, kind: string, hours: number, note: string, projectId: string | null = null) => {
        if (hours <= 0) return;
        stmts.push({ q: `insert into capacity_allocations(period_id, discipline_id, kind, hours, note, project_id) values ($1,$2,$3,$4,$5,$6)`,
          params: [period, disc, kind, Math.round(hours * 10) / 10, note, projectId] });
      };
      for (const p of periods) {
        for (const s of staff) {
          await ins(p.id, s.discipline_id, "Beschikbaar", s.fte * netPerFteQuarter, "Gegenereerd: netto inzetbaar uit bezetting");
          await ins(p.id, s.discipline_id, "Reservering", s.fte * a.uren_per_fte_per_jaar * 0.25 * reservePct, "Gegenereerd: incidenten/onvoorzien en managementtaken");
        }
        for (const r of recurring) await ins(p.id, r.discipline_id, "Regulier", r.hours / 4, "Gegenereerd: reguliere werkzaamheden");
      }
      for (const pj of projects) {
        const s = new Date(pj.start_date), e = new Date(pj.end_date);
        const totalDays = Math.max(1, (e.getTime() - s.getTime()) / 86400000 + 1);
        for (const p of periods) {
          const qs = new Date(y, (p.quarter - 1) * 3, 1), qe = new Date(y, p.quarter * 3, 0);
          const ov = Math.max(0, (Math.min(e.getTime(), qe.getTime()) - Math.max(s.getTime(), qs.getTime())) / 86400000 + 1);
          if (ov <= 0) continue;
          const h = (pj.hours_required * ov) / totalDays / pj.disciplines.length;
          for (const dsc of pj.disciplines) await ins(p.id, dsc, "Project", h, "Gegenereerd: projecturen naar rato", pj.id);
        }
      }
      await db.batch([
        { q: `delete from capacity_allocations where scenario_id is null and period_id = any($1::uuid[]) and note like 'Gegenereerd:%'`, params: [periodIds] },
        ...stmts,
      ]);
      return { ok: true, message: `Capaciteitsplanning ${y} vastgesteld (${stmts.length} regels). Ontbrekende uren-ramingen tellen niet mee.` };
    });
  });
}
