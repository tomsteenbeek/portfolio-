import { z } from "zod";
import { withUser } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { formObject, run, type ActionResult } from "@/server/action";

const ROLE_CODES = ["admin", "teamleider", "medewerker", "projectleider", "management"] as const;

export async function saveUser(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("users.manage");
    const d = z.object({
      id: z.string().uuid().nullable().optional(),
      email: z.string({ message: "E-mail is verplicht" }).email("Ongeldig e-mailadres").max(200),
      display_name: z.string({ message: "Naam is verplicht" }).min(2).max(120),
      discipline_id: z.string().uuid().nullable().optional(),
      job_title: z.string().max(120).nullable().optional(),
    }).parse(formObject(fd));
    const roles = fd.getAll("roles").map(String).filter((r): r is (typeof ROLE_CODES)[number] => (ROLE_CODES as readonly string[]).includes(r));
    const active = fd.get("is_active") === "on";
    return withUser(user.id, async (db) => {
      if (d.id === user.id && (!roles.includes("admin") || !active)) return { ok: false, error: "U kunt uw eigen beheerrechten niet intrekken." };
      const id = d.id
        ? (await db.one<{ id: string }>(`update users set email=$2, display_name=$3, discipline_id=$4, job_title=$5, is_active=$6 where id=$1 returning id`,
            [d.id, d.email.toLowerCase(), d.display_name, d.discipline_id ?? null, d.job_title ?? null, active]))?.id
        : (await db.one<{ id: string }>(`insert into users(email, display_name, discipline_id, job_title, is_active) values ($1,$2,$3,$4,$5) returning id`,
            [d.email.toLowerCase(), d.display_name, d.discipline_id ?? null, d.job_title ?? null, active]))?.id;
      if (!id) return { ok: false, error: "Gebruiker niet gevonden." };
      await db.query(`delete from user_roles where user_id = $1 and role_id not in (select id from roles where code = any($2))`, [id, roles]);
      await db.query(`insert into user_roles(user_id, role_id, granted_by) select $1, id, $3 from roles where code = any($2) on conflict do nothing`, [id, roles, user.id]);
      return { ok: true, message: "Gebruiker opgeslagen (wijziging gelogd)" };
    });
  });
}

export async function saveSetting(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("settings.edit");
    const key = z.string().min(1).max(100).parse(fd.get("key"));
    let value: unknown;
    try { value = JSON.parse(String(fd.get("value") ?? "")); } catch { return { ok: false, error: "Ongeldige waarde (verwacht JSON, bijv. 2027, \"tekst\" of {\"a\":1})." }; }
    const validators: Record<string, z.ZodType> = {
      "jaarplan.actief_jaar": z.number().int().min(2020).max(2100),
      "haalbaarheid.drempel": z.number().min(0).max(100),
      "prioriteit.drempel_matrix": z.number().min(0).max(100),
      "roadmap.periode": z.object({ van: z.number().int().min(2020), tot: z.number().int().max(2100) }).refine((x) => x.tot >= x.van, "'tot' moet ≥ 'van' zijn"),
      "risico.matrix": z.object({ laag_tot: z.number().int(), midden_tot: z.number().int(), hoog_tot: z.number().int(), labels: z.array(z.string()).length(4) })
        .refine((x) => x.laag_tot < x.midden_tot && x.midden_tot < x.hoog_tot && x.hoog_tot < 25, "Drempels moeten oplopen en onder 25 blijven"),
      "organisatie.naam": z.string().min(2), "organisatie.thema": z.string().min(2),
    };
    if (key === "capaciteit.aannames") return { ok: false, error: "Wijzig rekenaannames via Capaciteitsplanning." };
    const v = validators[key];
    if (v) { const r = v.safeParse(value); if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Ongeldige waarde" }; }
    const r = await withUser(user.id, (db) => db.one(`update settings set value = $2, updated_by = $3, updated_at = now() where key = $1 returning key`, [key, JSON.stringify(value), user.id]));
    if (!r) return { ok: false, error: "Onbekende instelling." };
    return { ok: true, message: "Instelling opgeslagen" };
  });
}
