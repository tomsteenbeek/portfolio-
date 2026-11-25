/**
 * E2E-rooktest van de statische site: per demorol alle hoofdschermen openen,
 * wachten tot de gegevens geladen zijn en controleren op fouten.
 *   BASE_URL=http://localhost:8080/portfolio- npm run test:e2e
 * (Vereist Playwright: npm i -D playwright && npx playwright install chromium)
 */
import { chromium } from "playwright";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PATHS = ["/", "/pijlers/detail/?nr=1", "/pijlers/detail/?nr=4", "/onderwerpen/", "/onderwerpen/nieuw/", "/kpis/", "/projecten/",
  "/team/", "/jaarplan/", "/roadmap/", "/zoeken/?q=data"];
// Geen rollen meer: standaard "Team Digitale Informatie"; daarnaast één deelnemer (zoals bij beoordelen in een sessie).
const ROLES = ["team@voorbeeld.test", "medewerker.data@voorbeeld.test"];

const browser = await chromium.launch();
let failures = 0;
for (const email of ROLES) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((e) => { try { sessionStorage.setItem("di.demo.user", e); } catch {} }, email);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { failures++; console.error(`[${email}] pageerror ${page.url()}: ${e.message}`); });
  for (const p of PATHS) {
    await page.goto(BASE + p);
    await page.waitForFunction(() => !document.querySelector('[role="status"]') || document.querySelector("main h1"), null, { timeout: 30000 }).catch(() => {});
    await page.waitForSelector("main h1", { timeout: 30000 }).catch(() => {});
    const h1 = (await page.locator("main h1").first().textContent().catch(() => "")) ?? "";
    if (!h1 || /Er ging iets mis|niet bereikbaar/.test(h1)) {
      failures++;
      const msg = await page.locator("main p").first().textContent().catch(() => "");
      console.error(`[${email}] FOUT ${p}: ${h1 || "(geen titel)"} ${msg ?? ""}`);
    }
  }
  console.log(`[${email}] ${PATHS.length} schermen gecontroleerd`);
  await ctx.close();
}
await browser.close();
if (failures) { console.error(`${failures} fout(en)`); process.exit(1); }
console.log("Rooktest geslaagd");
