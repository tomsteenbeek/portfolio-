/**
 * Integratietests op databaseniveau (Row Level Security, constraints, audit).
 * Vereist TEST_DATABASE_URL met een gemigreerde en geseede database:
 *   npm run test:db:setup && npm run test:integration
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("autorisatie in de database", () => {
  const c = new Client({ connectionString: url });
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    await c.connect();
    for (const [k, email] of Object.entries({ tl: "teamleider@voorbeeld.test", mw: "medewerker.data@voorbeeld.test", mw2: "medewerker.geo@voorbeeld.test", dir: "directie@voorbeeld.test", adm: "beheerder@voorbeeld.test" })) {
      ids[k] = (await c.query("select id from users where email = $1", [email])).rows[0].id;
    }
  });
  afterAll(async () => { await c.end(); });

  /** Voert SQL uit als gebruiker binnen een transactie die altijd wordt teruggedraaid. */
  async function as<T = unknown>(user: string | null, fn: () => Promise<T>): Promise<T> {
    await c.query("begin");
    try {
      await c.query("set local role app_user");
      await c.query("select set_config('app.user_id', $1, true)", [user ?? ""]);
      return await fn();
    } finally {
      await c.query("rollback");
    }
  }
  const q = (sql: string, p: unknown[] = []) => c.query(sql, p);
  /** Verwachte fout binnen een savepoint, zodat de transactie bruikbaar blijft. */
  async function fails(sql: string, p: unknown[], re: RegExp) {
    await q("savepoint s");
    await expect(q(sql, p)).rejects.toThrow(re);
    await q("rollback to savepoint s");
  }

  it("anonieme verbinding ziet geen gegevens", async () => {
    const n = await as(null, async () => (await q("select count(*)::int n from topics")).rows[0].n);
    expect(n).toBe(0);
  });

  it("directie kan lezen maar geen onderwerpen toevoegen", async () => {
    await as(ids.dir, async () => {
      expect((await q("select count(*)::int n from topics")).rows[0].n).toBeGreaterThanOrEqual(122);
      await expect(q("insert into topics(code, pillar_id, title) select '9.99', id, 'x' from pillars limit 1")).rejects.toThrow(/row-level security/);
    });
  });

  it("medewerker kan geen definitieve prioriteit zetten", async () => {
    await as(ids.mw, async () => {
      await expect(q("update topics set priority_category = 'P1' where code = '1.01'")).rejects.toThrow(/teamleider/);
    });
  });

  it("formatie en budgetten zijn afgeschermd voor medewerkers", async () => {
    await as(ids.mw, async () => {
      expect((await q("select count(*)::int n from staffing_scenarios")).rows[0].n).toBe(0);
      await expect(q("insert into budgets(year, kind, amount) values (2027,'Beschikbaar',1)")).rejects.toThrow(/row-level security/);
    });
  });

  it("auditlog is niet wijzigbaar en alleen leesbaar voor teamleider/beheer", async () => {
    await as(ids.mw, async () => {
      expect((await q("select count(*)::int n from audit_logs")).rows[0].n).toBe(0);
      await expect(q("delete from audit_logs")).rejects.toThrow(/permission denied/);
    });
  });

  it("wijzigingen worden gelogd met de gebruiker", async () => {
    await as(ids.tl, async () => {
      await q("update topics set remarks = 'audit-test' where code = '1.01'");
      const r = await q("select changed_by, changed_fields from audit_logs where table_name = 'topics' order by id desc limit 1");
      expect(r.rows[0].changed_by).toBe(ids.tl);
      expect(r.rows[0].changed_fields).toContain("remarks");
    });
  });

  it("markering zonder onderbouwing wordt geweigerd", async () => {
    await as(ids.tl, async () => {
      await expect(q("update topics set flag_legal = true where code = '1.01'")).rejects.toThrow(/topic_flag_rationale/);
    });
  });

  it("gewichten van het prioriteringsmodel moeten 100% zijn", async () => {
    await as(ids.tl, async () => {
      await q("update priority_criteria set weight = weight + 5 where code = 'WET' and model_id = (select id from priority_models where is_active)");
      await expect(q("set constraints all immediate")).rejects.toThrow(/100%/);
    });
  });

  it("blind stemmen: deelnemers zien elkaars beoordelingen niet tijdens open ronde", async () => {
    await as(ids.tl, async () => {
      const model = (await q("select id from priority_models where is_active")).rows[0].id;
      const s = (await q("insert into priority_sessions(name, model_id, status) values ('rls-test',$1,'Open voor beoordeling') returning id", [model])).rows[0].id;
      await q("insert into priority_session_members values ($1,$2),($1,$3)", [s, ids.mw, ids.mw2]);
      const item = (await q("insert into priority_session_items(session_id, topic_id) select $1, id from topics where code = '1.01' returning id", [s])).rows[0].id;
      await q("select set_config('app.user_id', $1, true)", [ids.mw]);
      await q("insert into priority_assessments(session_item_id, user_id, total_score, category) values ($1,$2,80,'P1')", [item, ids.mw]);
      await q("select set_config('app.user_id', $1, true)", [ids.mw2]);
      await q("insert into priority_assessments(session_item_id, user_id, total_score, category) values ($1,$2,30,'P4')", [item, ids.mw2]);
      expect((await q("select count(*)::int n from priority_assessments where session_item_id = $1", [item])).rows[0].n).toBe(1);
      // niet-deelnemer kan niet stemmen
      await q("select set_config('app.user_id', $1, true)", [ids.dir]);
      await fails("insert into priority_assessments(session_item_id, user_id, total_score, category) values ($1,$2,50,'P3')", [item, ids.dir], /row-level security/);
      // na sluiten van de ronde zichtbaar
      await q("select set_config('app.user_id', $1, true)", [ids.tl]);
      await q("update priority_sessions set status = 'Bespreking' where id = $1", [s]);
      await q("select set_config('app.user_id', $1, true)", [ids.mw2]);
      expect((await q("select count(*)::int n from priority_assessments where session_item_id = $1", [item])).rows[0].n).toBe(2);
    });
  });

  it("afwijken van consensus vereist motivering", async () => {
    await as(ids.tl, async () => {
      const t = (await q("select id from topics where code = '1.02'")).rows[0].id;
      await fails("insert into priority_decisions(topic_id, consensus_category, final_category) values ($1,'P1','P3')", [t], /deviation_requires_rationale/);
      await q("insert into priority_decisions(topic_id, consensus_category, final_category, deviation_rationale) values ($1,'P1','P3','Onvoldoende capaciteit in 2027')", [t]);
    });
  });

  it("oorspronkelijke input is onveranderlijk", async () => {
    await as(ids.tl, async () => {
      const r = (await q(`insert into source_inputs(raw) values ('{"reactie":"origineel"}') returning id`)).rows[0].id;
      await expect(q(`update source_inputs set raw = '{"reactie":"gewijzigd"}' where id = $1`, [r])).rejects.toThrow(/niet worden gewijzigd/);
    });
  });
});
