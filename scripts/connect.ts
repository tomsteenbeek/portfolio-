import { Client } from "pg";

/**
 * Databaseverbinding voor de scripts. Supabase vereist TLS; met DATABASE_SSL=true
 * wordt versleuteld verbonden. DATABASE_SSL_VERIFY=false slaat de certificaatcontrole
 * over (nodig met de standaard Supabase-pooler zonder eigen CA-bestand).
 */
export function dbClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL ontbreekt (zie README)");
  if (process.env.DATABASE_SSL !== "true") return new Client({ connectionString: raw });
  const u = new URL(raw);
  u.searchParams.delete("sslmode");
  return new Client({ connectionString: u.toString(), ssl: { rejectUnauthorized: process.env.DATABASE_SSL_VERIFY !== "false" } });
}
