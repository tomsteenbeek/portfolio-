/**
 * Idempotente seed. Veilig om herhaald uit te voeren: bestaande records
 * (op unieke sleutel) worden niet overschreven.
 *
 *   npm run db:seed            # basisinhoud + fictieve ontwikkelgebruikers
 *   SEED_DEV_USERS=false npm run db:seed   # zonder fictieve gebruikers (test/productie)
 */
import { Client } from "pg";
import { loadEnv } from "./env";
import {
  DEFAULT_SETTINGS,
  DEV_USERS,
  DISCIPLINES,
  EXAMPLE_KPIS,
  EXAMPLE_RECURRING,
  EXAMPLE_SCENARIOS,
  PILLARS,
  PRIORITY_CRITERIA,
  ROLES,
} from "../db/seed/data";

loadEnv();

export function topicCode(pillar: number, index: number) {
  return `${pillar}.${String(index + 1).padStart(2, "0")}`;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("begin");
  try {
    // Disciplines
    for (const [i, d] of DISCIPLINES.entries()) {
      await client.query(
        `insert into disciplines(code, name, sort_order) values ($1,$2,$3) on conflict (code) do nothing`,
        [d.code, d.name, i],
      );
    }
    // Rollen
    for (const r of ROLES) {
      await client.query(
        `insert into roles(code, name, description) values ($1,$2,$3) on conflict (code) do nothing`,
        [r.code, r.name, r.description],
      );
    }
    // Fictieve gebruikers (alleen ontwikkel/test)
    if ((process.env.SEED_DEV_USERS ?? "true") !== "false") {
      for (const u of DEV_USERS) {
        const { rows } = await client.query(
          `insert into users(email, display_name, discipline_id, is_fictitious)
           values ($1,$2,(select id from disciplines where code=$3),true)
           on conflict (email) do update set display_name = excluded.display_name
           returning id`,
          [u.email, u.name, u.discipline],
        );
        for (const role of u.roles) {
          await client.query(
            `insert into user_roles(user_id, role_id) select $1, id from roles where code=$2 on conflict do nothing`,
            [rows[0].id, role],
          );
        }
      }
    }
    // Pijlers, gewenste resultaten en onderwerpen
    let topicCount = 0;
    for (const p of PILLARS) {
      const { rows } = await client.query(
        `insert into pillars(number, title, short_title, objective, sort_order)
         values ($1,$2,$3,$4,$1)
         on conflict (number) do update set title = pillars.title
         returning id, (xmax = 0) as inserted`,
        [p.number, p.title, p.shortTitle, p.objective],
      );
      const pillarId = rows[0].id as string;
      if (rows[0].inserted) {
        for (const [i, r] of p.results.entries()) {
          await client.query(
            `insert into pillar_objectives(pillar_id, kind, text, sort_order) values ($1,'gewenst_resultaat',$2,$3)`,
            [pillarId, r, i],
          );
        }
      }
      for (const [i, title] of p.topics.entries()) {
        const code = topicCode(p.number, i);
        const res = await client.query(
          `insert into topics(code, pillar_id, title, status) values ($1,$2,$3,'Te valideren')
           on conflict (code) do nothing returning id`,
          [code, pillarId, title],
        );
        if (res.rows[0]) {
          await client.query(
            `insert into topic_sources(topic_id, source_type, note)
             values ($1,'Nog te valideren','Initiële inventarisatie: combinatie van medewerkersinput en managementvoorstellen; bron per onderwerp nog vast te stellen.')`,
            [res.rows[0].id],
          );
        }
        topicCount++;
      }
    }
    // Programma's Data en AI binnen pijler 4
    const p4 = (await client.query(`select id from pillars where number = 4`)).rows[0].id;
    for (const prog of [
      { code: "PGM-DATA", name: "Programma Data", from: 1, to: 10, extra: [20] },
      { code: "PGM-AI", name: "Programma AI", from: 11, to: 19, extra: [] as number[] },
    ]) {
      const { rows } = await client.query(
        `insert into programs(code, name, pillar_id, status, description)
         values ($1,$2,$3,'Concept',$4) on conflict (code) do update set code = excluded.code returning id`,
        [prog.code, prog.name, p4, `Programma binnen pijler 4 (${prog.name.replace("Programma ", "")}). Indeling voorlopig, te valideren.`],
      );
      const codes = [];
      for (let n = prog.from; n <= prog.to; n++) codes.push(topicCode(4, n - 1));
      for (const n of prog.extra) codes.push(topicCode(4, n - 1));
      await client.query(`update topics set program_id = $1 where code = any($2) and program_id is null`, [rows[0].id, codes]);
    }
    // Prioriteringsmodel v1
    const model = await client.query(
      `insert into priority_models(version, name, description, is_active)
       values (1,'Standaardmodel','Gewogen prioriteringsmodel conform opdracht (som gewichten 100%).', true)
       on conflict (version) do nothing returning id`,
    );
    if (model.rows[0]) {
      for (const [i, c] of PRIORITY_CRITERIA.entries()) {
        await client.query(
          `insert into priority_criteria(model_id, code, name, weight, description, rubric, sort_order)
           values ($1,$2,$3,$4,$5,$6,$7)`,
          [model.rows[0].id, c.code, c.name, c.weight, c.description, JSON.stringify(c.rubric), i],
        );
      }
    }
    // Instellingen
    for (const [key, s] of Object.entries(DEFAULT_SETTINGS)) {
      await client.query(
        `insert into settings(key, value, description) values ($1,$2,$3) on conflict (key) do nothing`,
        [key, JSON.stringify(s.value), s.description],
      );
    }
    // Capaciteitsperiodes 2027–2030
    for (let y = 2027; y <= 2030; y++) {
      for (let q = 1; q <= 4; q++) {
        await client.query(
          `insert into capacity_periods(year, quarter, label) values ($1,$2,$3) on conflict do nothing`,
          [y, q, `Q${q} ${y}`],
        );
      }
    }
    // KPI-definities zonder waarden of nulmetingen
    for (const k of EXAMPLE_KPIS) {
      await client.query(
        `insert into kpis(name, unit, direction, pillar_id, description)
         select $1,$2,$3,(select id from pillars where number=$4),'Voorbeeld-KPI; definitie, meetmethode en nulmeting nog vast te stellen.'
         where not exists (select 1 from kpis where name = $1)`,
        [k.name, k.unit, k.direction, k.pillar],
      );
    }
    // Reguliere werkzaamheden zonder urenschatting
    for (const r of EXAMPLE_RECURRING) {
      await client.query(
        `insert into recurring_activities(name, pillar_id, discipline_id, is_legal_obligation, description)
         select $1,(select id from pillars where number=$2),(select id from disciplines where code=$3),$4,
                'Voorbeeld; frequentie en uren nog te inventariseren.'
         where not exists (select 1 from recurring_activities where name = $1)`,
        [r.name, r.pillar, r.discipline, r.legal ?? false],
      );
    }
    // Formatiescenario's (leeg)
    for (const s of EXAMPLE_SCENARIOS) {
      await client.query(
        `insert into staffing_scenarios(name, description, is_baseline) values ($1,$2,$3) on conflict (name) do nothing`,
        [s.name, s.description, s.baseline ?? false],
      );
    }
    // Jaarplan 2027 (concept)
    await client.query(
      `insert into annual_plans(year, title, theme, status, sections)
       values (2027,'Jaarplan Digitale Informatie 2027',$1,'Concept','{}'::jsonb) on conflict (year) do nothing`,
      [DEFAULT_SETTINGS["organisatie.thema"].value],
    );
    await client.query("commit");
    console.log(`Seed gereed: ${PILLARS.length} pijlers, ${topicCount} onderwerpen.`);
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
