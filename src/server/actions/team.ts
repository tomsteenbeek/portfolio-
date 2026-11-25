import { z } from "zod";
import { withUser } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { formObject, run, type ActionResult } from "@/server/action";
import { OWNER_SPECIAL, TEAM_KINDS } from "@/lib/domain";

const schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string({ message: "Naam is verplicht" }).trim().min(2, "Naam is verplicht").max(120)
    .refine((n) => !(OWNER_SPECIAL as readonly string[]).includes(n), "Deze naam is gereserveerd"),
  function_title: z.string().max(160).nullable().optional(),
  kind: z.enum(TEAM_KINDS),
});

/** Teamlid toevoegen of wijzigen. Bij een naamswijziging gaan eigenaarschappen mee. */
export async function saveMember(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const d = schema.parse(formObject(fd));
    return withUser(user.id, async (db) => {
      if (!d.id) {
        await db.query(`insert into team_members(name, function_title, kind, sort_order) values ($1,$2,$3,(select coalesce(max(sort_order),0)+1 from team_members))`,
          [d.name, d.function_title ?? null, d.kind]);
        return { ok: true, message: `${d.name} toegevoegd` };
      }
      const old = await db.one<{ name: string }>(`select name from team_members where id = $1`, [d.id]);
      if (!old) return { ok: false, error: "Teamlid niet gevonden." };
      await db.batch([
        { q: `update team_members set name = $2, function_title = $3, kind = $4, updated_at = now() where id = $1`, params: [d.id, d.name, d.function_title ?? null, d.kind] },
        ...(old.name !== d.name ? [
          { q: `update topics set owner_name = $2 where owner_name = $1`, params: [old.name, d.name] },
          { q: `update projects set lead_name = $2 where lead_name = $1`, params: [old.name, d.name] },
          { q: `update kpis set owner_name = $2 where owner_name = $1`, params: [old.name, d.name] },
        ] : []),
      ]);
      return { ok: true, message: "Opgeslagen" };
    });
  });
}

/** Teamlid (de)activeren; inactieve leden verdwijnen uit de keuzelijsten, eigenaarschappen blijven zichtbaar. */
export async function setMemberActive(id: string, active: boolean): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    await withUser(user.id, (db) => db.query(`update team_members set is_active = $2, updated_at = now() where id = $1`, [z.string().uuid().parse(id), active]));
    return { ok: true, message: active ? "Teamlid weer actief" : "Teamlid op inactief gezet" };
  });
}
