import { z } from "zod";
import { withUser } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { run, type ActionResult } from "@/server/action";
import { listDemoUsers } from "@/lib/auth/current-user";

/** Deelnemer voor prioriteringssessies toevoegen (naam als vrije tekst). */
export async function addParticipant(name: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const n = z.string().min(2, "Naam is te kort").max(80).parse(name.trim());
    const slug = n.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "deelnemer";
    await withUser(user.id, async (db) => {
      const u = await db.one<{ id: string }>(
        `insert into users(email, display_name, is_fictitious) values ($1, $2, true) returning id`, [`${slug}.${Date.now().toString(36)}@deelnemer.local`, n]);
      await db.query(`insert into user_roles(user_id, role_id) select $1, id from roles where code = 'medewerker'`, [u!.id]);
    });
    await listDemoUsers(true);
    return { ok: true, message: `${n} toegevoegd als deelnemer` };
  });
}

export async function removeParticipant(id: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    if (id === user.id) return { ok: false, error: "Je kunt jezelf niet verwijderen." };
    await withUser(user.id, (db) => db.query(`update users set is_active = false where id = $1`, [z.string().uuid().parse(id)]));
    await listDemoUsers(true);
    return { ok: true, message: "Deelnemer verwijderd (eerdere beoordelingen blijven bewaard)" };
  });
}
