/**
 * Databasekoppeling vanuit de browser via de Supabase REST-API.
 * Alle SQL wordt uitgevoerd door public.di_sql / di_batch (zie migratie 0005)
 * met de rechten van app_user: Row Level Security en constraints blijven gelden.
 */
const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type Db = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  batch(stmts: { q: string; params?: unknown[] }[]): Promise<unknown[][]>;
};

export class DbError extends Error {
  code?: string;
  constraint?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
    // constraintnaam uit de Postgres-melding halen voor nette foutteksten
    const m = message.match(/constraint "([^"]+)"/);
    if (m) this.constraint = m[1];
  }
}

export function isConfigured() {
  return Boolean(URL && KEY);
}

async function rpc<T>(fn: string, body: unknown): Promise<T> {
  if (!isConfigured()) throw new DbError("De databasekoppeling is niet geconfigureerd (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  let res: Response;
  try {
    res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      // Nieuwe Supabase-sleutels (sb_publishable_…) alleen in 'apikey'; oude anon-JWT ook als Bearer.
      headers: { apikey: KEY, ...(KEY.startsWith("sb_") ? {} : { Authorization: `Bearer ${KEY}` }), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new DbError("De database is niet bereikbaar. Controleer je internetverbinding of het Supabase-project (gepauzeerd?).");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new DbError(data?.message ?? `Databasefout (${res.status})`, data?.code ?? undefined);
  return data as T;
}

/** Waarden omzetten naar tekst zoals Postgres ze als literal verwacht (arrays als {a,b}). */
function toParam(v: unknown): unknown {
  if (v === undefined || v === null) return null;
  if (Array.isArray(v)) {
    return "{" + v.map((x) => (x === null || x === undefined ? "NULL" : `"${String(x).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`)).join(",") + "}";
  }
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

export function dbFor(userId: string | null): Db {
  const query = async <T,>(sql: string, params: unknown[] = []) =>
    rpc<T[]>("di_sql", { q: sql, params: params.map(toParam), as_user: userId });
  return {
    query,
    async one<T>(sql: string, params: unknown[] = []) {
      return ((await query<T>(sql, params))[0] as T) ?? null;
    },
    batch: (stmts) => rpc<unknown[][]>("di_batch", { stmts: stmts.map((s) => ({ q: s.q, params: (s.params ?? []).map(toParam) })), as_user: userId }),
  };
}

/** Compatibel met de oorspronkelijke servercode: werk uitvoeren namens een gebruiker. */
export async function withUser<T>(userId: string | null, fn: (db: Db) => Promise<T>): Promise<T> {
  return fn(dbFor(userId));
}

export type DemoUser = { id: string; email: string; display_name: string; discipline: string | null; discipline_id: string | null; roles: string[] };
export function demoUsers() {
  return rpc<DemoUser[]>("di_demo_users", {});
}
