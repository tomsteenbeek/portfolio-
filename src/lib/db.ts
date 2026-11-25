import "server-only";
import { Pool, PoolClient, types } from "pg";

// numeric -> number, bigint (count) -> number, date blijft 'YYYY-MM-DD'
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));
types.setTypeParser(1082, (v) => v);

const g = globalThis as unknown as { __pgPool?: Pool };

function pool(): Pool {
  if (!g.__pgPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is niet ingesteld");
    g.__pgPool = new Pool({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    });
  }
  return g.__pgPool;
}

export type Db = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
};

/** Serialiseert query's op één verbinding (een transactie kan geen parallelle query's uitvoeren). */
function wrap(client: PoolClient): Db {
  let chain: Promise<unknown> = Promise.resolve();
  const exec = (sql: string, params: unknown[]) => {
    const next = chain.then(() => client.query(sql, params));
    chain = next.catch(() => {});
    return next;
  };
  return {
    async query<T>(sql: string, params: unknown[] = []) {
      return (await exec(sql, params)).rows as T[];
    },
    async one<T>(sql: string, params: unknown[] = []) {
      return ((await exec(sql, params)).rows[0] as T) ?? null;
    },
  };
}

/**
 * Voert werk uit namens een gebruiker. Binnen de transactie gelden de
 * RLS-policies van rol app_user en is app.uid() gelijk aan userId.
 */
export async function withUser<T>(userId: string | null, fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query("set local role app_user");
    await client.query("select set_config('app.user_id', $1, true)", [userId ?? ""]);
    const result = await fn(wrap(client));
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Systeemtoegang zonder RLS. Uitsluitend voor authenticatie (gebruiker
 * opzoeken vóór er een sessie is). Nooit gebruiken voor inhoudelijke data.
 */
export async function asSystem<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    return await fn(wrap(client));
  } finally {
    client.release();
  }
}
