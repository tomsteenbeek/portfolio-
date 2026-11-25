import { z } from "zod";
import { withUser } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { run, type ActionResult } from "@/server/action";
import { getRegister, type FieldDef } from "@/lib/registers";
import { FREQUENCY_PER_YEAR } from "@/lib/capacity";

function parseField(f: FieldDef, raw: FormDataEntryValue | null) {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (f.type === "bool") return raw === "on";
  if (s === "") {
    if (f.required) throw new z.ZodError([{ code: "custom", path: [f.name], message: `${f.label} is verplicht`, input: s }]);
    return null;
  }
  const fail = (message: string) => { throw new z.ZodError([{ code: "custom", path: [f.name], message, input: s }]); };
  switch (f.type) {
    case "number": case "score": {
      const n = Number(s.replace(",", "."));
      if (!Number.isFinite(n)) fail("Ongeldig getal");
      if (f.min !== undefined && n < f.min) fail(`Minimaal ${f.min}`);
      if (f.max !== undefined && n > f.max) fail(`Maximaal ${f.max}`);
      if (f.type === "number" && n < 0 && f.min === undefined) fail("Moet 0 of hoger zijn");
      return n;
    }
    case "date": if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) fail("Ongeldige datum"); return s;
    case "select": if (!f.options?.includes(s)) fail("Ongeldige keuze"); return s;
    case "ref": if (!z.string().uuid().safeParse(s).success) fail("Ongeldige keuze"); return s;
    case "url": if (!/^https?:\/\/\S+$/.test(s)) fail("Gebruik een volledige URL (https://…)"); return s;
    default: if (s.length > (f.type === "textarea" ? 10000 : 500)) fail("Te lang"); return s;
  }
}

export async function saveRecord(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const def = getRegister(String(fd.get("__register")));
    const id = String(fd.get("id") ?? "") || null;
    const user = await requirePermission(id ? def.editPerm : def.createPerm ?? def.editPerm);
    const values: Record<string, unknown> = {};
    const errors: z.core.$ZodIssue[] = [];
    for (const f of def.fields) {
      try { values[f.name] = parseField(f, fd.get(f.name)); } catch (e) { if (e instanceof z.ZodError) errors.push(...e.issues); else throw e; }
    }
    if (errors.length) throw new z.ZodError(errors);
    // Afgeleide waarden (reproduceerbaar): uitvoeringen per jaar volgen uit frequentie als leeg
    if (def.key === "recurring" && values.occurrences_per_year === null && typeof values.frequency === "string") {
      values.occurrences_per_year = FREQUENCY_PER_YEAR[values.frequency] ?? null;
    }
    if (def.key === "decisions" && values.outcome !== "Openstaand" && !values.decision_date) {
      return { ok: false, error: "Vul de besluitdatum in.", fieldErrors: { decision_date: "Verplicht wanneer het besluit is genomen" } };
    }
    const cols = Object.keys(values);
    return withUser(user.id, async (db) => {
      if (id) {
        const r = await db.one<{ id: string }>(`update ${def.table} set ${cols.map((c, i) => `${c} = $${i + 2}`).join(", ")} where id = $1 returning id`,
          [z.string().uuid().parse(id), ...cols.map((c) => values[c])]);
        if (!r) return { ok: false, error: "U heeft geen rechten om dit record te wijzigen, of het bestaat niet meer." };
        return { ok: true, message: `${def.singular[0].toUpperCase()}${def.singular.slice(1)} opgeslagen` };
      }
      const r = await db.one<{ id: string }>(`insert into ${def.table}(${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")}) returning id`,
        cols.map((c) => values[c]));
      return { ok: true, message: `${def.singular[0].toUpperCase()}${def.singular.slice(1)} toegevoegd`, redirect: `${def.path}/detail?id=${r!.id}` };
    });
  });
}

export async function archiveRecord(registerKey: string, id: string, restore = false): Promise<ActionResult> {
  return run(async () => {
    const def = getRegister(registerKey);
    const user = await requirePermission(def.editPerm);
    if (!def.archivable) return { ok: false, error: "Dit register ondersteunt geen archivering." };
    const r = await withUser(user.id, (db) => db.one(`update ${def.table} set archived_at = ${restore ? "null" : "now()"} where id = $1 returning id`, [z.string().uuid().parse(id)]));
    if (!r) return { ok: false, error: "Geen rechten of record niet gevonden." };
    return { ok: true, message: restore ? "Hersteld" : "Gearchiveerd", redirect: restore ? undefined : def.path };
  });
}
