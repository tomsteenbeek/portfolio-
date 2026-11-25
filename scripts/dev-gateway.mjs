/**
 * Lokale nabootsing van de Supabase REST-API voor ontwikkeling en tests,
 * zodat de statische site zonder Supabase-project kan draaien.
 * Ondersteunt alleen: POST /rest/v1/rpc/{di_sql|di_batch|di_demo_users}
 * en voert die uit als rol 'anon' (zoals Supabase/PostgREST).
 *
 *   DATABASE_URL=postgres://… node scripts/dev-gateway.mjs   (poort 54321)
 * Zet daarna NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 in .env.local.
 */
import http from "node:http";
import pg from "pg";

const PORT = Number(process.env.GATEWAY_PORT ?? 54321);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgres://postgres@localhost:5432/di_portfolio_dev" });
const CALLS = {
  di_sql: (b) => ["select public.di_sql($1, $2::jsonb, $3::uuid) as r", [b.q, JSON.stringify(b.params ?? []), b.as_user ?? null]],
  di_batch: (b) => ["select public.di_batch($1::jsonb, $2::uuid) as r", [JSON.stringify(b.stmts ?? []), b.as_user ?? null]],
  di_demo_users: () => ["select coalesce(jsonb_agg(to_jsonb(u)), '[]') as r from public.di_demo_users() u", []],
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  const m = req.url?.match(/^\/rest\/v1\/rpc\/(\w+)/);
  if (req.method !== "POST" || !m || !CALLS[m[1]]) { res.writeHead(404, cors); return res.end(); }
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const client = await pool.connect();
  try {
    const [sql, params] = CALLS[m[1]](raw ? JSON.parse(raw) : {});
    await client.query("begin");
    await client.query("set local role anon");
    const r = await client.query(sql, params);
    await client.query("commit");
    res.writeHead(200, { ...cors, "Content-Type": "application/json" });
    res.end(JSON.stringify(r.rows[0].r));
  } catch (e) {
    await client.query("rollback").catch(() => {});
    res.writeHead(400, { ...cors, "Content-Type": "application/json" });
    res.end(JSON.stringify({ code: e.code ?? null, message: e.message, details: e.detail ?? null, hint: e.hint ?? null }));
  } finally {
    client.release();
  }
}).listen(PORT, () => console.log(`Lokale Supabase-nabootsing op http://localhost:${PORT}`));
