import { z } from "zod";
import { withUser, type Db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { formObject, run, type ActionResult } from "@/server/action";
import { ANNUAL_PLAN_STATUSES } from "@/lib/domain";
import { ANNUAL_PLAN_SECTIONS } from "@/lib/annual-plan";

const uuid = z.string().uuid();

async function snapshot(db: Db, planId: string, note: string | null) {
  const plan = await db.one<Record<string, unknown> & { status: string }>(`select * from annual_plans where id = $1`, [planId]);
  const items = await db.query(
    `select ap.id, ap.note, coalesce(j.number || ' ' || j.name, t.code || ' ' || t.title, g.name) as label,
            case when j.id is not null then 'project' when t.id is not null then 'onderwerp' else 'programma' end as kind,
            coalesce(j.priority_category, t.priority_category) as priority
       from annual_plan_projects ap left join projects j on j.id = ap.project_id left join topics t on t.id = ap.topic_id left join programs g on g.id = ap.program_id
      where ap.plan_id = $1`, [planId]);
  const v = await db.one<{ v: number }>(`select coalesce(max(version),0) + 1 as v from annual_plan_versions where plan_id = $1`, [planId]);
  await db.query(`insert into annual_plan_versions(plan_id, version, status, snapshot, note) values ($1,$2,$3,$4,$5)`,
    [planId, v!.v, plan!.status, JSON.stringify({ plan, items, generated_at: new Date().toISOString() }), note]);
  return v!.v;
}

export async function createPlan(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("annualplan.edit");
    const d = z.object({ year: z.coerce.number().int().min(2020).max(2100), title: z.string().min(3).max(200).nullable().optional(), theme: z.string().max(1000).nullable().optional() }).parse(formObject(fd));
    await withUser(user.id, (db) => db.query(`insert into annual_plans(year, title, theme) values ($1,$2,$3)`, [d.year, d.title ?? `Jaarplan Digitale Informatie ${d.year}`, d.theme ?? null]));
    return { ok: true, message: `Jaarplan ${d.year} aangemaakt`, redirect: `/jaarplan?jaar=${d.year}` };
  });
}

export async function saveSections(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("annualplan.edit");
    const id = uuid.parse(fd.get("id"));
    const sections: Record<string, string> = {};
    for (const s of ANNUAL_PLAN_SECTIONS) {
      const v = String(fd.get(s.key) ?? "").trim();
      if (v) sections[s.key] = v.slice(0, 20000);
    }
    const title = z.string().min(3).max(200).parse(String(fd.get("title") ?? "").trim());
    const theme = String(fd.get("theme") ?? "").trim() || null;
    await withUser(user.id, (db) => db.query(`update annual_plans set sections = $2, title = $3, theme = $4 where id = $1`, [id, JSON.stringify(sections), title, theme]));
    return { ok: true, message: "Jaarplan opgeslagen" };
  });
}

export async function setPlanStatus(id: string, status: string, note: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("annualplan.edit");
    const s = z.enum(ANNUAL_PLAN_STATUSES).parse(status);
    return withUser(user.id, async (db) => {
      await db.query(`update annual_plans set status = $2 where id = $1`, [uuid.parse(id), s]);
      const v = await snapshot(db, id, note || `Statuswijziging naar ${s}`);
      return { ok: true, message: `Status ${s}; versie ${v} vastgelegd` };
    });
  });
}

export async function saveVersion(id: string, note: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("annualplan.edit");
    const v = await withUser(user.id, (db) => snapshot(db, uuid.parse(id), note || null));
    return { ok: true, message: `Versie ${v} opgeslagen` };
  });
}

export async function addPlanItem(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("annualplan.edit");
    const planId = uuid.parse(fd.get("plan_id"));
    const ref = String(fd.get("ref") ?? "");
    const [kind, refId] = ref.split(":");
    const col = ({ project: "project_id", topic: "topic_id", program: "program_id" } as const)[kind as "project"];
    if (!col) return { ok: false, error: "Kies een initiatief." };
    await withUser(user.id, (db) => db.query(`insert into annual_plan_projects(plan_id, ${col}, note) values ($1,$2,$3) on conflict do nothing`,
      [planId, uuid.parse(refId), String(fd.get("note") ?? "").trim() || null]));
    return { ok: true, message: "Toegevoegd aan jaarplan" };
  });
}

export async function removePlanItem(id: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("annualplan.edit");
    await withUser(user.id, (db) => db.query(`delete from annual_plan_projects where id = $1`, [uuid.parse(id)]));
    return { ok: true, message: "Verwijderd uit jaarplan" };
  });
}
