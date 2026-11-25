import { z } from "zod";
import { withUser } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { formObject, run, type ActionResult } from "@/server/action";

export async function addMeasurement(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("registers.edit");
    const d = z.object({
      kpi_id: z.string().uuid(),
      measured_on: z.string({ message: "Datum is verplicht" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum"),
      value: z.preprocess((v) => (v === null ? undefined : Number(String(v).replace(",", "."))), z.number({ message: "Waarde is verplicht" }).finite()),
      note: z.string().max(1000).nullable().optional(),
    }).parse(formObject(fd));
    await withUser(user.id, (db) => db.query(
      `insert into kpi_measurements(kpi_id, measured_on, value, note) values ($1,$2,$3,$4)
       on conflict (kpi_id, measured_on) do update set value = excluded.value, note = excluded.note`, [d.kpi_id, d.measured_on, d.value, d.note ?? null]));
    return { ok: true, message: "Meting vastgelegd" };
  });
}
