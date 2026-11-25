import { z } from "zod";
import { withUser } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { formObject, run, type ActionResult } from "@/server/action";

export async function savePillar(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const d = z.object({
      id: z.string().uuid(),
      title: z.string().min(3, "Titel is verplicht").max(200),
      short_title: z.string().max(60).nullable().optional(),
      description: z.string().max(5000).nullable().optional(),
      objective: z.string({ message: "Doelstelling is verplicht" }).min(10, "Doelstelling is verplicht").max(3000),
      ambition_year: z.string().max(5000).nullable().optional(),
      ambition_multi_year: z.string().max(5000).nullable().optional(),
      ambition_q1: z.string().max(5000).nullable().optional(),
      ambition_q2: z.string().max(5000).nullable().optional(),
      ambition_q3: z.string().max(5000).nullable().optional(),
      ambition_q4: z.string().max(5000).nullable().optional(),
    }).parse(formObject(fd));
    const results = String(fd.get("results") ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
    await withUser(user.id, async (db) => {
      await db.query(
        `update pillars set title=$2, short_title=$3, description=$4, objective=$5, ambition_year=$6, ambition_multi_year=$7,
                ambition_q1=$8, ambition_q2=$9, ambition_q3=$10, ambition_q4=$11 where id=$1`,
        [d.id, d.title, d.short_title ?? null, d.description ?? null, d.objective, d.ambition_year ?? null, d.ambition_multi_year ?? null,
         d.ambition_q1 ?? null, d.ambition_q2 ?? null, d.ambition_q3 ?? null, d.ambition_q4 ?? null]);
      await db.query(`delete from pillar_objectives where pillar_id = $1 and kind = 'gewenst_resultaat'`, [d.id]);
      for (const [i, r] of results.entries()) await db.query(`insert into pillar_objectives(pillar_id, kind, text, sort_order) values ($1,'gewenst_resultaat',$2,$3)`, [d.id, r, i]);
    });
    return { ok: true, message: "Pijler opgeslagen" };
  });
}
