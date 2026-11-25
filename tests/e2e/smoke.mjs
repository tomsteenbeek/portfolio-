/**
 * E2E-rooktest: logt per rol in (ontwikkel-login) en opent alle hoofdschermen.
 * Vereist een draaiende app (npm run dev) met geseede database en Playwright:
 *   BASE_URL=http://localhost:3000 npm run test:e2e
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PATHS = ["/", "/directie", "/pijlers", "/pijlers/1", "/jaarplan", "/roadmap", "/inventarisatie", "/deepdive", "/deepdive/1", "/programmas",
  "/projecten", "/prioritering", "/prioritering?tab=matrix", "/kanban", "/afhankelijkheden", "/besluiten", "/reguliere-werkzaamheden",
  "/formatie", "/capaciteit", "/expertise", "/teamontwikkeling", "/risicos", "/wetgeving", "/leveranciers", "/kpis", "/beheer/rollen",
  "/beheer/prioriteringsmodel", "/beheer/import-export", "/zoeken?q=data"];
const ROLES = ["Robin Teamleider", "Dani Data", "Lou Directie", "Kim Projectleider", "Alex Beheer"];

const browser = await chromium.launch();
let failures = 0;
for (const who of ROLES) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => { failures++; console.error(`[${who}] pageerror ${page.url()}: ${e.message}`); });
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: new RegExp(who) }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  for (const p of PATHS) {
    const res = await page.goto(BASE + p, { waitUntil: "networkidle" });
    const h1 = (await page.locator("h1").first().textContent()) ?? "";
    if (!res?.ok() || /Er ging iets mis/.test(h1)) { failures++; console.error(`[${who}] FOUT ${p}: ${res?.status()} ${h1}`); }
  }
  console.log(`[${who}] ${PATHS.length} schermen gecontroleerd`);
  await page.close();
}
await browser.close();
if (failures) { console.error(`${failures} fout(en)`); process.exit(1); }
console.log("Rooktest geslaagd");
