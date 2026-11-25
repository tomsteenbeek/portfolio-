import { z } from "zod";
import { withUser } from "@/lib/db";
import { requirePermission, requireUser } from "@/lib/auth/current-user";
import { formObject, run, type ActionResult } from "@/server/action";
import { PROJECT_STATUSES, RAG } from "@/lib/domain";

const uuid = z.string().uuid();
const optText = z.string().max(10000).nullable().optional();
const optNum = z.preprocess((v) => (v === null || v === undefined || v === "" ? null : Number(String(v).replace(",", "."))), z.number().min(0, "Moet 0 of hoger zijn").nullable());
const optDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum").nullable().optional();
const rag = z.enum(RAG).nullable().optional();

const projectSchema = z.object({
  name: z.string({ message: "Projectnaam is verplicht" }).min(2, "Projectnaam is verplicht").max(200),
  program_id: uuid.nullable().optional(),
  primary_pillar_id: uuid,
  reason: optText, problem_statement: optText, objective: optText, scope: optText, out_of_scope: optText, business_case: optText,
  sponsor: z.string().max(200).nullable().optional(),
  project_leader_id: uuid.nullable().optional(),
  stakeholders: optText, steering_group: optText,
  start_date: optDate, end_date: optDate,
  planning_status: z.enum(["Gepland", "Vastgesteld"]),
  budget: optNum, actual_cost: optNum, hours_required: optNum, hours_actual: optNum,
  status: z.enum(PROJECT_STATUSES),
  progress_pct: z.preprocess((v) => (v === null || v === undefined ? null : Number(v)), z.number().min(0).max(100).nullable()),
  rag_time: rag, rag_money: rag, rag_scope: rag, rag_quality: rag, rag_capacity: rag, rag_risk: rag,
}).refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, { message: "Einddatum ligt voor de startdatum", path: ["end_date"] });

const FIELDS = ["name", "program_id", "primary_pillar_id", "reason", "problem_statement", "objective", "scope", "out_of_scope", "business_case", "sponsor",
  "project_leader_id", "stakeholders", "steering_group", "start_date", "end_date", "planning_status", "budget", "actual_cost", "hours_required", "hours_actual",
  "status", "progress_pct", "rag_time", "rag_money", "rag_scope", "rag_quality", "rag_capacity", "rag_risk"] as const;

export async function saveProject(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const raw = formObject(fd);
    const user = await requirePermission(raw.id ? "comments.add" : "projects.create"); // bewerkrecht wordt per project in de database (RLS) afgedwongen
    const d = projectSchema.parse(raw);
    const secondary = fd.getAll("secondary_pillars").map(String).filter((x) => uuid.safeParse(x).success && x !== d.primary_pillar_id);
    return withUser(user.id, async (db) => {
      let id = raw.id;
      if (id) {
        const r = await db.one<{ id: string }>(`update projects set ${FIELDS.map((f, i) => `${f} = $${i + 2}`).join(", ")} where id = $1 returning id`,
          [uuid.parse(id), ...FIELDS.map((f) => d[f] ?? null)]);
        if (!r) return { ok: false, error: "U heeft geen rechten om dit project te wijzigen." };
      } else {
        const r = await db.one<{ id: string }>(`insert into projects(${FIELDS.join(",")}) values (${FIELDS.map((_, i) => `$${i + 1}`).join(",")}) returning id`,
          FIELDS.map((f) => d[f] ?? null));
        id = r!.id;
      }
      if (fd.has("secondary_pillars_present")) {
        await db.query(`delete from project_pillars where project_id = $1`, [id]);
        for (const p of secondary) await db.query(`insert into project_pillars(project_id, pillar_id) values ($1,$2)`, [id, p]);
      }
      return { ok: true, message: "Project opgeslagen", redirect: raw.id ? undefined : `/projecten/detail?id=${id}` };
    });
  });
}

/** Status wijzigen (kanban). */
export async function setProjectStatus(id: string, status: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const s = z.enum(PROJECT_STATUSES).parse(status);
    const r = await withUser(user.id, (db) => db.one(`update projects set status = $2 where id = $1 returning id`, [uuid.parse(id), s]));
    if (!r) return { ok: false, error: "Geen rechten om dit project te wijzigen." };
    return { ok: true, message: `Status gewijzigd naar ${s}` };
  });
}

/** Planning verschuiven (roadmap drag-and-drop), met validatie van afhankelijkheden. */
export async function setProjectDates(id: string, start: string, end: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const s = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(start);
    const e = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(end);
    if (e < s) return { ok: false, error: "Einddatum ligt voor de startdatum." };
    return withUser(user.id, async (db) => {
      const blockers = await db.query<{ number: string; name: string; end_date: string }>(
        `select p.number, p.name, p.end_date::text from project_dependencies d join projects p on p.id = d.depends_on_project_id
          where d.project_id = $1 and d.kind = 'Einde-start' and p.end_date is not null and p.end_date >= $2::date`, [uuid.parse(id), s]);
      const r = await db.one<{ planning_status: string }>(`update projects set start_date = $2, end_date = $3 where id = $1 returning planning_status`, [id, s, e]);
      if (!r) return { ok: false, error: "Geen rechten om de planning van dit project te wijzigen." };
      if (blockers.length) return { ok: true, message: `Opgeslagen, maar let op: start vóór einde van ${blockers.map((b) => b.number).join(", ")} (afhankelijkheid).` };
      return { ok: true, message: r.planning_status === "Vastgesteld" ? "Vastgestelde planning gewijzigd" : "Planning bijgewerkt" };
    });
  });
}

export async function addProjectUpdate(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const d = z.object({ project_id: uuid, body: z.string({ message: "Tekst is verplicht" }).min(3, "Tekst is verplicht").max(5000),
      progress_pct: z.preprocess((v) => (v === null ? null : Number(v)), z.number().min(0).max(100).nullable()) }).parse(formObject(fd));
    await withUser(user.id, async (db) => {
      await db.query(`insert into project_updates(project_id, body, progress_pct) values ($1,$2,$3)`, [d.project_id, d.body, d.progress_pct]);
      if (d.progress_pct !== null) await db.query(`update projects set progress_pct = $2 where id = $1`, [d.project_id, d.progress_pct]);
    });
    return { ok: true, message: "Voortgangsupdate geplaatst" };
  });
}

export async function addMilestone(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const d = z.object({ project_id: uuid, title: z.string({ message: "Titel is verplicht" }).min(2).max(200), due_date: z.string({ message: "Datum is verplicht" }).regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(formObject(fd));
    await withUser(user.id, (db) => db.query(`insert into milestones(project_id, title, due_date, is_legal_deadline) values ($1,$2,$3,$4)`,
      [d.project_id, d.title, d.due_date, fd.get("is_legal_deadline") === "on"]));
    return { ok: true, message: "Mijlpaal toegevoegd" };
  });
}

export async function setMilestoneStatus(id: string, status: "Open" | "Behaald" | "Gemist" | "Verschoven"): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    await withUser(user.id, (db) => db.query(`update milestones set status = $2 where id = $1`, [uuid.parse(id), z.enum(["Open", "Behaald", "Gemist", "Verschoven"]).parse(status)]));
    return { ok: true, message: "Mijlpaal bijgewerkt" };
  });
}

export async function addTask(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const d = z.object({ project_id: uuid, title: z.string({ message: "Titel is verplicht" }).min(2).max(300), assignee_id: uuid.nullable().optional(), due_date: optDate }).parse(formObject(fd));
    await withUser(user.id, (db) => db.query(`insert into tasks(project_id, title, assignee_id, due_date) values ($1,$2,$3,$4)`, [d.project_id, d.title, d.assignee_id ?? null, d.due_date ?? null]));
    return { ok: true, message: "Actie toegevoegd" };
  });
}

export async function setTaskStatus(id: string, status: "Open" | "Bezig" | "Gereed" | "Vervallen"): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    await withUser(user.id, (db) => db.query(`update tasks set status = $2 where id = $1`, [uuid.parse(id), z.enum(["Open", "Bezig", "Gereed", "Vervallen"]).parse(status)]));
    return { ok: true, message: "Actie bijgewerkt" };
  });
}

export async function addMember(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const d = z.object({ project_id: uuid, user_id: uuid, role: z.string().min(2).max(100), hours_planned: optNum }).parse(formObject(fd));
    await withUser(user.id, (db) => db.query(`insert into project_members(project_id, user_id, role, hours_planned) values ($1,$2,$3,$4)
      on conflict (project_id, user_id) do update set role = excluded.role, hours_planned = excluded.hours_planned`, [d.project_id, d.user_id, d.role, d.hours_planned]));
    return { ok: true, message: "Teamlid opgeslagen" };
  });
}

export async function removeMember(projectId: string, userId: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    await withUser(user.id, (db) => db.query(`delete from project_members where project_id = $1 and user_id = $2`, [uuid.parse(projectId), uuid.parse(userId)]));
    return { ok: true, message: "Teamlid verwijderd" };
  });
}

export async function addDependency(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const d = z.object({ project_id: uuid, depends_on_project_id: uuid, kind: z.enum(["Einde-start", "Start-start", "Inhoudelijk"]), note: z.string().max(1000).nullable().optional() }).parse(formObject(fd));
    if (d.project_id === d.depends_on_project_id) return { ok: false, error: "Een project kan niet van zichzelf afhankelijk zijn." };
    return withUser(user.id, async (db) => {
      // cyclusdetectie
      const cycle = await db.one<{ found: boolean }>(
        `with recursive chain(id) as (select depends_on_project_id from project_dependencies where project_id = $1
           union select d.depends_on_project_id from project_dependencies d join chain c on d.project_id = c.id)
         select exists (select 1 from chain where id = $2) as found`, [d.depends_on_project_id, d.project_id]);
      if (cycle?.found) return { ok: false, error: "Deze afhankelijkheid zou een kringverwijzing veroorzaken." };
      await db.query(`insert into project_dependencies(project_id, depends_on_project_id, kind, note) values ($1,$2,$3,$4)`, [d.project_id, d.depends_on_project_id, d.kind, d.note ?? null]);
      return { ok: true, message: "Afhankelijkheid toegevoegd" };
    });
  });
}

export async function removeDependency(id: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    await withUser(user.id, (db) => db.query(`delete from project_dependencies where id = $1`, [uuid.parse(id)]));
    return { ok: true, message: "Afhankelijkheid verwijderd" };
  });
}

export async function addExpense(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const d = z.object({ project_id: uuid, spent_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum verplicht"),
      amount: z.preprocess((v) => Number(String(v ?? "").replace(",", ".")), z.number({ message: "Bedrag verplicht" }).finite()),
      description: z.string({ message: "Omschrijving verplicht" }).min(2).max(500) }).parse(formObject(fd));
    await withUser(user.id, async (db) => {
      await db.query(`insert into expenses(project_id, spent_on, amount, description) values ($1,$2,$3,$4)`, [d.project_id, d.spent_on, d.amount, d.description]);
      await db.query(`update projects set actual_cost = (select sum(amount) from expenses where project_id = $1) where id = $1`, [d.project_id]);
    });
    return { ok: true, message: "Kosten geregistreerd" };
  });
}

export async function addAttachment(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const d = z.object({ entity_type: z.enum(["project", "topic", "decision"]), entity_id: uuid, title: z.string({ message: "Titel verplicht" }).min(2).max(200),
      url: z.string({ message: "URL verplicht" }).regex(/^https?:\/\/\S+$/, "Gebruik een volledige URL (https://…)") }).parse(formObject(fd));
    await withUser(user.id, (db) => db.query(`insert into attachments(entity_type, entity_id, title, url) values ($1,$2,$3,$4)`, [d.entity_type, d.entity_id, d.title, d.url]));
    return { ok: true, message: "Bijlage gekoppeld" };
  });
}
