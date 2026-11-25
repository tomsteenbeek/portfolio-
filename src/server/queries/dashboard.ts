import type { Db } from "@/lib/db";

/** Instellingen (thema, actief jaar, drempels) als object. */
export async function getSettings(db: Db) {
  const rows = await db.query<{ key: string; value: unknown }>(`select key, value from settings`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
}
