import { z } from "zod";
import { withUser, type Db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { formObject, run, type ActionResult } from "@/server/action";

const uuid = z.string().uuid();
const text = (max = 10000) => z.string().max(max, "Te lang").nullable().optional();

const topicSchema = z.object({
  title: z.string({ message: "Titel is verplicht" }).min(2, "Titel is verplicht").max(300),
  pillar_id: uuid,
  owner_name: text(120),
  description: text(),
  scope: text(),
  intended_result: text(),
  remarks: text(),
});
const FIELDS = ["title", "pillar_id", "owner_name", "description", "scope", "intended_result", "remarks"] as const;

async function nextTopicCode(db: Db, pillarId: string) {
  const r = await db.one<{ code: string }>(
    `select p.number || '.' || lpad((coalesce(max(split_part(t.code,'.',2)::int),0) + 1)::text, 2, '0') as code
       from pillars p left join topics t on t.pillar_id = p.id where p.id = $1 group by p.number`, [pillarId]);
  if (!r) throw new Error("Pijler niet gevonden");
  return r.code;
}

/** Onderwerp toevoegen of bijwerken (werk in uitvoering: alle inhoudsvelden optioneel). */
export async function saveTopic(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const raw = formObject(fd);
    const d = topicSchema.parse(raw);
    return withUser(user.id, async (db) => {
      if (raw.id) {
        const r = await db.one<{ id: string }>(`update topics set ${FIELDS.map((f, i) => `${f} = $${i + 2}`).join(", ")} where id = $1 returning id`,
          [uuid.parse(raw.id), ...FIELDS.map((f) => d[f] ?? null)]);
        if (!r) return { ok: false, error: "Onderwerp niet gevonden." };
        return { ok: true, message: "Onderwerp opgeslagen" };
      }
      const code = await nextTopicCode(db, d.pillar_id);
      const r = await db.one<{ id: string }>(
        `insert into topics(code, ${FIELDS.join(",")}) values ($1, ${FIELDS.map((_, i) => `$${i + 2}`).join(",")}) returning id`,
        [code, ...FIELDS.map((f) => d[f] ?? null)]);
      return { ok: true, message: `Onderwerp ${code} toegevoegd`, redirect: `/onderwerpen/detail?id=${r!.id}` };
    });
  });
}

const INLINE = {
  title: z.string().min(2, "Titel is te kort").max(300),
  owner_name: z.string().max(120).nullable(),
  description: z.string().max(10000).nullable(),
  remarks: z.string().max(10000).nullable(),
} as const;

export async function inlineUpdateTopic(id: string, field: string, value: string | null): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    if (!(field in INLINE)) return { ok: false, error: "Dit veld kan niet inline worden bewerkt." };
    const v = INLINE[field as keyof typeof INLINE].parse(value?.trim() ? value.trim() : null);
    await withUser(user.id, (db) => db.query(`update topics set ${field} = $2 where id = $1`, [uuid.parse(id), v]));
    return { ok: true, message: "Bijgewerkt" };
  });
}

export async function bulkTopics(ids: string[], op: "owner" | "archive" | "restore", value?: string | null): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const list = z.array(uuid).min(1, "Selecteer minimaal één onderwerp").parse(ids);
    await withUser(user.id, async (db) => {
      if (op === "owner") await db.query(`update topics set owner_name = $2 where id = any($1::uuid[])`, [list, value?.trim() || null]);
      if (op === "archive") await db.query(`update topics set archived_at = now() where id = any($1::uuid[])`, [list]);
      if (op === "restore") await db.query(`update topics set archived_at = null where id = any($1::uuid[])`, [list]);
    });
    return { ok: true, message: `${list.length} onderwerp(en) bijgewerkt` };
  });
}

export async function duplicateTopic(id: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    return withUser(user.id, async (db) => {
      const t = await db.one<{ pillar_id: string }>(`select pillar_id from topics where id = $1`, [uuid.parse(id)]);
      if (!t) return { ok: false, error: "Onderwerp niet gevonden" };
      const code = await nextTopicCode(db, t.pillar_id);
      const r = await db.one<{ id: string }>(
        `insert into topics(code, pillar_id, title, description, scope, intended_result, remarks)
         select $2, pillar_id, title || ' (kopie)', description, scope, intended_result, remarks from topics where id = $1 returning id`, [id, code]);
      return { ok: true, message: `Kopie ${code} aangemaakt`, redirect: `/onderwerpen/detail?id=${r!.id}` };
    });
  });
}

export async function addComment(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const d = z.object({
      entity_type: z.enum(["topic", "project", "program", "pillar", "risk", "decision", "session"]),
      entity_id: uuid,
      body: z.string({ message: "Opmerking is leeg" }).min(1, "Opmerking is leeg").max(5000),
    }).parse(formObject(fd));
    await withUser(user.id, (db) => db.query(`insert into comments(entity_type, entity_id, body) values ($1,$2,$3)`, [d.entity_type, d.entity_id, d.body]));
    return { ok: true, message: "Opmerking geplaatst" };
  });
}

export async function saveView(page: string, name: string, config: unknown): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const n = z.string().min(1, "Naam is verplicht").max(80).parse(name.trim());
    await withUser(user.id, (db) => db.query(`insert into saved_views(user_id, page, name, config) values ($1,$2,$3,$4)
      on conflict (user_id, page, name) do update set config = excluded.config`, [user.id, page, n, JSON.stringify(config)]));
    return { ok: true, message: `Weergave '${n}' opgeslagen` };
  });
}

export async function deleteView(id: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    await withUser(user.id, (db) => db.query(`delete from saved_views where id = $1`, [uuid.parse(id)]));
    return { ok: true, message: "Weergave verwijderd" };
  });
}
