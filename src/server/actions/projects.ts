import { z } from "zod";
import { withUser } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { formObject, run, type ActionResult } from "@/server/action";

export const SIMPLE_PROJECT_STATUSES = ["Idee", "Gepland", "In uitvoering", "Gepauzeerd", "Afgerond", "Geannuleerd"] as const;
const uuid = z.string().uuid();
const optDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum").nullable().optional();

const schema = z.object({
  name: z.string({ message: "Naam is verplicht" }).min(2, "Naam is verplicht").max(200),
  description: z.string().max(10000).nullable().optional(),
  lead_name: z.string().max(120).nullable().optional(),
  planner_url: z.string().regex(/^https?:\/\/\S+$/, "Gebruik een volledige link (https://…)").nullable().optional(),
  primary_pillar_id: uuid,
  status: z.enum(SIMPLE_PROJECT_STATUSES),
  start_date: optDate,
  end_date: optDate,
}).refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, { message: "Einddatum ligt voor de startdatum", path: ["end_date"] });
const FIELDS = ["name", "description", "lead_name", "planner_url", "primary_pillar_id", "status", "start_date", "end_date"] as const;

/** Project/initiatief vastleggen; het werk zelf wordt in Planner bijgehouden. */
export async function saveProject(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const raw = formObject(fd);
    const d = schema.parse(raw);
    const secondary = fd.getAll("secondary_pillars").map(String).filter((x) => uuid.safeParse(x).success && x !== d.primary_pillar_id);
    const topics = fd.getAll("topics").map(String).filter((x) => uuid.safeParse(x).success);
    return withUser(user.id, async (db) => {
      let id = raw.id;
      if (id) {
        const r = await db.one<{ id: string }>(`update projects set ${FIELDS.map((f, i) => `${f} = $${i + 2}`).join(", ")} where id = $1 returning id`,
          [uuid.parse(id), ...FIELDS.map((f) => d[f] ?? null)]);
        if (!r) return { ok: false, error: "Project niet gevonden." };
      } else {
        const r = await db.one<{ id: string }>(`insert into projects(${FIELDS.join(",")}) values (${FIELDS.map((_, i) => `$${i + 1}`).join(",")}) returning id`,
          FIELDS.map((f) => d[f] ?? null));
        id = r!.id;
      }
      await db.batch([
        { q: `delete from project_pillars where project_id = $1`, params: [id] },
        ...secondary.map((p) => ({ q: `insert into project_pillars(project_id, pillar_id) values ($1,$2)`, params: [id, p] })),
        { q: `delete from project_topics where project_id = $1`, params: [id] },
        ...topics.map((t) => ({ q: `insert into project_topics(project_id, topic_id) values ($1,$2)`, params: [id, t] })),
      ]);
      return { ok: true, message: "Opgeslagen", redirect: raw.id ? undefined : `/projecten/detail?id=${id}` };
    });
  });
}

export async function archiveProject(id: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    await withUser(user.id, (db) => db.query(`update projects set archived_at = now() where id = $1`, [uuid.parse(id)]));
    return { ok: true, message: "Gearchiveerd", redirect: "/projecten" };
  });
}

/** Planning verschuiven (roadmap), met signalering van afhankelijkheden. */
export async function setProjectDates(id: string, start: string, end: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const s = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(start);
    const e = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(end);
    if (e < s) return { ok: false, error: "Einddatum ligt voor de startdatum." };
    const r = await withUser(user.id, (db) => db.one(`update projects set start_date = $2, end_date = $3 where id = $1 returning id`, [uuid.parse(id), s, e]));
    if (!r) return { ok: false, error: "Project niet gevonden." };
    return { ok: true, message: "Planning bijgewerkt" };
  });
}
