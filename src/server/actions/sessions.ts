"use server";
import { z } from "zod";
import { withUser } from "@/lib/db";
import { requireUser, requirePermission } from "@/lib/auth/current-user";
import { run, type ActionResult } from "@/server/action";

/** Registreert de positie in een werksessie zodat deze later kan worden hervat. */
export async function touchWorkSession(kind: "Deepdive" | "Prioritering" | "Jaarplanning", title: string, pillarId: string | null, state: Record<string, unknown>): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    if (!user.roles.some((r) => ["admin", "teamleider", "medewerker"].includes(r))) return { ok: true };
    await withUser(user.id, async (db) => {
      const existing = await db.one<{ id: string }>(
        `select id from work_sessions where kind = $1 and coalesce(pillar_id::text,'') = coalesce($2,'') and status = 'Lopend' order by updated_at desc limit 1`, [kind, pillarId]);
      if (existing) await db.query(`update work_sessions set state = $2, title = $3 where id = $1`, [existing.id, JSON.stringify(state), title]);
      else await db.query(`insert into work_sessions(kind, title, pillar_id, state) values ($1,$2,$3,$4)`, [kind, title, pillarId, JSON.stringify(state)]);
    });
    return { ok: true };
  });
}

export async function closeWorkSession(id: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.edit");
    await withUser(user.id, (db) => db.query(`update work_sessions set status = 'Afgerond' where id = $1`, [z.string().uuid().parse(id)]));
    return { ok: true, message: "Werksessie afgerond" };
  });
}

export async function quickAddTopic(pillarId: string, title: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.edit");
    const t = z.string().min(2, "Titel is te kort").max(300).parse(title.trim());
    return withUser(user.id, async (db) => {
      const code = await db.one<{ code: string }>(
        `select p.number || '.' || lpad((coalesce(max(split_part(t.code,'.',2)::int),0) + 1)::text, 2, '0') as code
           from pillars p left join topics t on t.pillar_id = p.id where p.id = $1 group by p.number`, [z.string().uuid().parse(pillarId)]);
      const r = await db.one<{ id: string }>(`insert into topics(code, pillar_id, title, status) values ($1,$2,$3,'Te valideren') returning id`, [code!.code, pillarId, t]);
      await db.query(`insert into topic_sources(topic_id, source_type, note) values ($1,'Medewerkersinput','Toegevoegd tijdens deepdive-werksessie')`, [r!.id]);
      return { ok: true, message: `Onderwerp ${code!.code} toegevoegd`, id: r!.id };
    });
  });
}
