/**
 * Eenvoudige, hostingonafhankelijke migratierunner.
 * Voert alle bestanden uit db/migrations in alfabetische volgorde uit,
 * elk in een eigen transactie, en registreert ze in schema_migrations.
 *
 *   npm run db:migrate
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dbClient } from "./connect";
import { loadEnv } from "./env";

loadEnv();

async function main() {
  const client = dbClient();
  await client.connect();
  await client.query(`create table if not exists schema_migrations (
    name text primary key, applied_at timestamptz not null default now())`);
  const done = new Set(
    (await client.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name),
  );
  const dir = join(process.cwd(), "db", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = readFileSync(join(dir, file), "utf8");
    process.stdout.write(`→ ${file} ... `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations(name) values ($1)", [file]);
      await client.query("commit");
      console.log("ok");
    } catch (e) {
      await client.query("rollback");
      console.log("MISLUKT");
      throw e;
    }
  }
  await client.end();
  console.log("Migraties bijgewerkt.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
