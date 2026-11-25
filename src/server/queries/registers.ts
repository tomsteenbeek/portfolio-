import type { Db } from "@/lib/db";
import type { RefKind, RegisterDef } from "@/lib/registers";

const REF_LABEL: Record<RefKind, (col: string) => string> = {
  pillars: (c) => `(select 'Pijler ' || number || ' – ' || coalesce(short_title, title) from pillars where id = r.${c})`,
  users: (c) => `(select display_name from users where id = r.${c})`,
  disciplines: (c) => `(select name from disciplines where id = r.${c})`,
  projects: (c) => `(select number || ' ' || name from projects where id = r.${c})`,
  programs: (c) => `(select name from programs where id = r.${c})`,
  topics: (c) => `(select code || ' ' || title from topics where id = r.${c})`,
  scenarios: (c) => `(select name from staffing_scenarios where id = r.${c})`,
};

const REF_OPTIONS: Record<RefKind, string> = {
  pillars: `select id, 'Pijler ' || number || ' – ' || title as label from pillars where archived_at is null order by number`,
  users: `select id, display_name as label from users where is_active order by display_name`,
  disciplines: `select id, name as label from disciplines order by sort_order`,
  projects: `select id, number || ' ' || name as label from projects where archived_at is null order by number`,
  programs: `select id, name as label from programs where archived_at is null order by code`,
  topics: `select id, code || ' ' || title as label from topics where archived_at is null and status <> 'Samengevoegd' order by string_to_array(code,'.')::int[]`,
  scenarios: `select id, name as label from staffing_scenarios order by name`,
};

export type RefOptions = Partial<Record<RefKind, { id: string; label: string }[]>>;

export async function refOptions(db: Db, def: RegisterDef): Promise<RefOptions> {
  const kinds = [...new Set(def.fields.filter((f) => f.ref).map((f) => f.ref!))];
  const out: RefOptions = {};
  for (const k of kinds) out[k] = await db.query(REF_OPTIONS[k]);
  return out;
}

function selectSql(def: RegisterDef) {
  const refs = def.fields.filter((f) => f.type === "ref" && f.ref).map((f) => `${REF_LABEL[f.ref!](f.name)} as "${f.name}__label"`);
  return `select r.*${refs.length ? ", " + refs.join(", ") : ""} from ${def.table} r`;
}

export async function listRecords(db: Db, def: RegisterDef, includeArchived = false) {
  const where = def.archivable && !includeArchived ? "where r.archived_at is null" : "";
  return db.query<Record<string, unknown> & { id: string }>(`${selectSql(def)} ${where} order by ${def.orderBy}`);
}

export async function getRecord(db: Db, def: RegisterDef, id: string) {
  return db.one<Record<string, unknown> & { id: string }>(`${selectSql(def)} where r.id = $1`, [id]);
}
