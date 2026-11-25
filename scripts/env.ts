import { existsSync, readFileSync } from "node:fs";

/** Laadt .env.local / .env (zonder extra dependency) voor CLI-scripts. */
export function loadEnv() {
  const mode = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
  // Zelfde volgorde als Next.js; .env.local wordt in testmodus overgeslagen.
  const files = [`.env.${mode}.local`, ...(mode === "test" ? [] : [".env.local"]), `.env.${mode}`, ".env"];
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      const value = m[2].replace(/^["']|["']$/g, "");
      if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
  }
}
