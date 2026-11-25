"use server";
import { z } from "zod";
import { withUser, type Db } from "@/lib/db";
import { requirePermission, requireUser } from "@/lib/auth/current-user";
import { formObject, run, type ActionResult } from "@/server/action";
import { TOPIC_STATUSES, WORK_TYPES, SOURCE_TYPES, DEEPDIVE_QUESTIONS } from "@/lib/domain";

const uuid = z.string().uuid();
const optText = (max = 5000) => z.string().max(max).nullable().optional();
const optNum = z.preprocess((v) => (v === null || v === "" || v === undefined ? null : Number(String(v).replace(/\./g, "").replace(",", "."))),
  z.number().min(0, "Moet 0 of hoger zijn").nullable());
const optDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum").nullable().optional();

const topicSchema = z.object({
  title: z.string({ message: "Titel is verplicht" }).min(2, "Titel is verplicht").max(300),
  pillar_id: uuid,
  subcategory: optText(200),
  program_id: uuid.nullable().optional(),
  description: optText(),
  reason: optText(),
  current_situation: optText(),
  desired_situation: optText(),
  problem_statement: optText(),
  intended_result: optText(),
  owner_user_id: uuid.nullable().optional(),
  strategic_contribution: optText(),
  legal_basis: optText(1000),
  legal_deadline: optDate,
  risk_if_not_done: optText(),
  service_impact: optText(),
  dependencies_text: optText(),
  required_capacity_hours: optNum,
  required_budget: optNum,
  status: z.enum(TOPIC_STATUSES),
  remarks: optText(),
});

const FIELDS = Object.keys(topicSchema.shape) as (keyof z.infer<typeof topicSchema>)[];

async function nextTopicCode(db: Db, pillarId: string) {
  const r = await db.one<{ code: string }>(
    `select p.number || '.' || lpad((coalesce(max(split_part(t.code,'.',2)::int),0) + 1)::text, 2, '0') as code
       from pillars p left join topics t on t.pillar_id = p.id and t.code ~ ('^' || p.number || '\\.\\d+$')
      where p.id = $1 group by p.number`,
    [pillarId],
  );
  if (!r) throw new Error("Pijler niet gevonden");
  return r.code;
}

async function setMulti(db: Db, topicId: string, classifications: string[], disciplines: string[] | null) {
  await db.query(`delete from topic_classifications where topic_id = $1 and not (classification = any($2))`, [topicId, classifications]);
  for (const c of classifications) {
    await db.query(`insert into topic_classifications(topic_id, classification) values ($1,$2) on conflict do nothing`, [topicId, c]);
  }
  if (disciplines) {
    await db.query(`delete from topic_disciplines where topic_id = $1 and not (discipline_id = any($2::uuid[]))`, [topicId, disciplines]);
    for (const d of disciplines) {
      await db.query(`insert into topic_disciplines(topic_id, discipline_id) values ($1,$2) on conflict do nothing`, [topicId, d]);
    }
  }
}

export async function saveTopic(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.edit");
    const raw = formObject(fd);
    const id = raw.id;
    const data = topicSchema.parse(raw);
    const classifications = fd.getAll("classifications").map(String).filter((c) => (WORK_TYPES as readonly string[]).includes(c));
    const disciplines = fd.getAll("disciplines").map(String).filter((d) => uuid.safeParse(d).success);
    return withUser(user.id, async (db) => {
      if (id) {
        const sets = FIELDS.map((f, i) => `${f} = $${i + 2}`).join(", ");
        const expected = raw.version ? Number(raw.version) : null;
        const row = await db.one<{ id: string }>(
          `update topics set ${sets}, version = version + 1 where id = $1 ${expected ? `and version = ${expected}` : ""} returning id`,
          [id, ...FIELDS.map((f) => data[f] ?? null)],
        );
        if (!row) return { ok: false, error: "Dit onderwerp is intussen door iemand anders gewijzigd. Herlaad de pagina en probeer het opnieuw." };
        await setMulti(db, id, classifications, disciplines);
        return { ok: true, message: "Onderwerp opgeslagen" };
      }
      const code = await nextTopicCode(db, data.pillar_id);
      const cols = ["code", ...FIELDS];
      const row = await db.one<{ id: string }>(
        `insert into topics(${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")}) returning id`,
        [code, ...FIELDS.map((f) => data[f] ?? null)],
      );
      const sourceType = SOURCE_TYPES.includes(raw.source_type as never) ? raw.source_type : "Nog te valideren";
      await db.query(`insert into topic_sources(topic_id, source_type, note) values ($1,$2,$3)`, [row!.id, sourceType, raw.source_note ?? null]);
      await setMulti(db, row!.id, classifications, disciplines);
      return { ok: true, message: `Onderwerp ${code} toegevoegd`, id: row!.id, redirect: raw.stay ? undefined : `/onderwerpen/${row!.id}` };
    });
  });
}

/** Inline bewerken vanuit de tabel (alleen veilige velden). */
const INLINE = {
  title: z.string().min(2).max(300),
  subcategory: z.string().max(200).nullable(),
  status: z.enum(TOPIC_STATUSES),
  owner_user_id: uuid.nullable(),
  program_id: uuid.nullable(),
  remarks: z.string().max(5000).nullable(),
  required_capacity_hours: optNum,
  required_budget: optNum,
  legal_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
} as const;

export async function inlineUpdateTopic(id: string, field: string, value: string | null): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.edit");
    if (!(field in INLINE)) return { ok: false, error: "Dit veld kan niet inline worden bewerkt." };
    const parsed = INLINE[field as keyof typeof INLINE].parse(value === "" ? null : value);
    await withUser(user.id, (db) => db.query(`update topics set ${field} = $2, version = version + 1 where id = $1`, [uuid.parse(id), parsed]));
    return { ok: true, message: "Bijgewerkt" };
  });
}

export async function bulkTopics(ids: string[], op: "status" | "program" | "archive" | "restore" | "owner", value?: string | null): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.edit");
    const list = z.array(uuid).min(1, "Selecteer minimaal één onderwerp").parse(ids);
    await withUser(user.id, async (db) => {
      if (op === "status") await db.query(`update topics set status = $2 where id = any($1::uuid[])`, [list, z.enum(TOPIC_STATUSES).parse(value)]);
      if (op === "program") await db.query(`update topics set program_id = $2 where id = any($1::uuid[])`, [list, value ? uuid.parse(value) : null]);
      if (op === "owner") await db.query(`update topics set owner_user_id = $2 where id = any($1::uuid[])`, [list, value ? uuid.parse(value) : null]);
      if (op === "archive") await db.query(`update topics set archived_at = now() where id = any($1::uuid[])`, [list]);
      if (op === "restore") await db.query(`update topics set archived_at = null where id = any($1::uuid[])`, [list]);
    });
    return { ok: true, message: `${list.length} onderwerp(en) bijgewerkt` };
  });
}

export async function duplicateTopic(id: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.edit");
    return withUser(user.id, async (db) => {
      const t = await db.one<{ pillar_id: string; title: string }>(`select pillar_id, title from topics where id = $1`, [uuid.parse(id)]);
      if (!t) return { ok: false, error: "Onderwerp niet gevonden" };
      const code = await nextTopicCode(db, t.pillar_id);
      const row = await db.one<{ id: string }>(
        `insert into topics(code, pillar_id, title, subcategory, program_id, description, reason, current_situation, desired_situation,
           problem_statement, intended_result, strategic_contribution, legal_basis, risk_if_not_done, service_impact, dependencies_text, status)
         select $2, pillar_id, title || ' (kopie)', subcategory, program_id, description, reason, current_situation, desired_situation,
           problem_statement, intended_result, strategic_contribution, legal_basis, risk_if_not_done, service_impact, dependencies_text, 'Te valideren'
           from topics where id = $1 returning id`,
        [id, code],
      );
      await db.query(`insert into topic_classifications select $2, classification from topic_classifications where topic_id = $1`, [id, row!.id]);
      await db.query(`insert into topic_disciplines select $2, discipline_id from topic_disciplines where topic_id = $1`, [id, row!.id]);
      await db.query(`insert into topic_sources(topic_id, source_type, note) values ($1,'Overige bron',$2)`, [row!.id, `Gedupliceerd van ${t.title}`]);
      return { ok: true, message: `Kopie ${code} aangemaakt`, redirect: `/onderwerpen/${row!.id}` };
    });
  });
}

/** Samenvoegen: bronnen worden gekopieerd; oorspronkelijke onderwerpen blijven bestaan met status 'Samengevoegd'. */
export async function mergeTopics(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.edit");
    const target = uuid.parse(fd.get("target"));
    const sources = z.array(uuid).min(1, "Kies minimaal één onderwerp om samen te voegen").parse(fd.getAll("sources").map(String)).filter((s) => s !== target);
    if (!sources.length) return { ok: false, error: "Kies minimaal één ander onderwerp om samen te voegen." };
    return withUser(user.id, async (db) => {
      const list = await db.query<{ code: string; title: string; description: string | null }>(
        `select code, title, description from topics where id = any($1::uuid[])`, [sources]);
      await db.query(
        `insert into topic_sources(topic_id, source_type, source_input_id, reference, note)
         select $1, source_type, source_input_id, reference, coalesce(note,'') || ' [via samenvoeging ' || t.code || ']'
           from topic_sources s join topics t on t.id = s.topic_id where s.topic_id = any($2::uuid[])`,
        [target, sources],
      );
      await db.query(`insert into topic_classifications select $1, classification from topic_classifications where topic_id = any($2::uuid[]) on conflict do nothing`, [target, sources]);
      await db.query(`insert into topic_disciplines select $1, discipline_id from topic_disciplines where topic_id = any($2::uuid[]) on conflict do nothing`, [target, sources]);
      await db.query(`update topics set status = 'Samengevoegd', merged_into_id = $1 where id = any($2::uuid[])`, [target, sources]);
      await db.query(`insert into comments(entity_type, entity_id, body) values ('topic', $1, $2)`, [
        target,
        `Samengevoegd met: ${list.map((t) => `${t.code} ${t.title}${t.description ? ` – ${t.description}` : ""}`).join("; ")}. Oorspronkelijke onderwerpen blijven raadpleegbaar.`,
      ]);
      return { ok: true, message: `${sources.length} onderwerp(en) samengevoegd` };
    });
  });
}

export async function splitTopic(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.edit");
    const id = uuid.parse(fd.get("id"));
    const titles = String(fd.get("titles") ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
    if (titles.length < 2) return { ok: false, error: "Geef minimaal twee nieuwe titels op (één per regel)." };
    return withUser(user.id, async (db) => {
      const t = await db.one<{ pillar_id: string; code: string; program_id: string | null }>(`select pillar_id, code, program_id from topics where id = $1`, [id]);
      if (!t) return { ok: false, error: "Onderwerp niet gevonden" };
      for (const title of titles) {
        const code = await nextTopicCode(db, t.pillar_id);
        const n = await db.one<{ id: string }>(
          `insert into topics(code, pillar_id, title, program_id, split_from_id, status, description)
           values ($1,$2,$3,$4,$5,'Te valideren',$6) returning id`,
          [code, t.pillar_id, title.slice(0, 300), t.program_id, id, `Ontstaan uit splitsing van ${t.code}.`],
        );
        await db.query(
          `insert into topic_sources(topic_id, source_type, source_input_id, reference, note)
           select $1, source_type, source_input_id, reference, coalesce(note,'') || ' [via splitsing ${t.code}]' from topic_sources where topic_id = $2`,
          [n!.id, id],
        );
      }
      await db.query(`update topics set status = 'Gesplitst' where id = $1`, [id]);
      return { ok: true, message: `Gesplitst in ${titles.length} onderwerpen` };
    });
  });
}

export async function setFlags(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.edit");
    const id = uuid.parse(fd.get("id"));
    const flags = {
      flag_legal: fd.get("flag_legal") === "on",
      flag_hard_deadline: fd.get("flag_hard_deadline") === "on",
      flag_acute_risk: fd.get("flag_acute_risk") === "on",
      flag_admin_decided: fd.get("flag_admin_decided") === "on",
      flag_critical_dependency: fd.get("flag_critical_dependency") === "on",
    };
    const rationale = (String(fd.get("flag_rationale") ?? "").trim() || null);
    const deadline = (String(fd.get("legal_deadline") ?? "").trim() || null);
    const any = Object.values(flags).some(Boolean);
    if (any && !rationale) return { ok: false, error: "Een markering vereist een onderbouwing.", fieldErrors: { flag_rationale: "Onderbouwing is verplicht" } };
    if (flags.flag_hard_deadline && !deadline) return { ok: false, error: "Bij een harde deadline is een datum verplicht.", fieldErrors: { legal_deadline: "Datum verplicht" } };
    await withUser(user.id, (db) =>
      db.query(
        `update topics set flag_legal=$2, flag_hard_deadline=$3, flag_acute_risk=$4, flag_admin_decided=$5, flag_critical_dependency=$6,
                flag_rationale=$7, legal_deadline=$8 where id=$1`,
        [id, flags.flag_legal, flags.flag_hard_deadline, flags.flag_acute_risk, flags.flag_admin_decided, flags.flag_critical_dependency, rationale, deadline],
      ),
    );
    return { ok: true, message: "Markeringen opgeslagen" };
  });
}

/** Deepdive: antwoorden opslaan (autosave) en waar mogelijk naar onderwerpvelden synchroniseren. */
export async function saveAssessment(topicId: string, answers: Record<string, string>, submit?: "Ter goedkeuring"): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.edit");
    const id = uuid.parse(topicId);
    const clean: Record<string, string> = {};
    for (const q of DEEPDIVE_QUESTIONS) {
      const v = answers[q.key];
      if (typeof v === "string" && v.trim()) clean[q.key] = v.slice(0, 5000);
    }
    return withUser(user.id, async (db) => {
      const existing = await db.one<{ status: string }>(`select status from topic_assessments where topic_id = $1`, [id]);
      if (existing?.status === "Goedgekeurd" && !user.roles.some((r) => r === "teamleider" || r === "admin")) {
        return { ok: false, error: "Deze beoordeling is goedgekeurd; alleen de teamleider kan hem nog wijzigen." };
      }
      const status = submit ?? (existing?.status === "Goedgekeurd" ? "Goedgekeurd" : existing?.status ?? "Concept");
      await db.query(
        `insert into topic_assessments(topic_id, answers, status) values ($1,$2,$3)
         on conflict (topic_id) do update set answers = excluded.answers, status = excluded.status`,
        [id, JSON.stringify(clean), status],
      );
      // synchronisatie naar kernvelden (alleen als ingevuld)
      const sync: Record<string, string | undefined> = {
        current_situation: clean.q2, desired_situation: clean.q5, intended_result: clean.q8,
        risk_if_not_done: clean.q10, dependencies_text: clean.q11,
      };
      const entries = Object.entries(sync).filter(([, v]) => v);
      if (entries.length) {
        await db.query(`update topics set ${entries.map(([k], i) => `${k} = $${i + 2}`).join(", ")} where id = $1`, [id, ...entries.map(([, v]) => v)]);
      }
      if (clean.q1) {
        const rel = /^ja/i.test(clean.q1) ? true : /^nee/i.test(clean.q1) ? false : null;
        await db.query(`update topics set is_relevant = $2, status = case when status = 'Te valideren' then 'In beoordeling' else status end where id = $1`, [id, rel]);
      } else {
        await db.query(`update topics set status = 'In beoordeling' where id = $1 and status = 'Te valideren'`, [id]);
      }
      return { ok: true, message: submit ? "Ter goedkeuring aangeboden" : "Automatisch opgeslagen" };
    });
  });
}

export async function approveAssessment(topicId: string, decision: "approve" | "notRelevant" | "reopen"): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.approve");
    const id = uuid.parse(topicId);
    await withUser(user.id, async (db) => {
      if (decision === "reopen") {
        await db.query(`update topic_assessments set status='Concept', approved_by=null, approved_at=null where topic_id=$1`, [id]);
        await db.query(`update topics set status='In beoordeling' where id=$1 and status in ('Gevalideerd','Niet relevant')`, [id]);
        return;
      }
      await db.query(
        `insert into topic_assessments(topic_id, status, approved_by, approved_at) values ($1,'Goedgekeurd',$2,now())
         on conflict (topic_id) do update set status='Goedgekeurd', approved_by=$2, approved_at=now()`,
        [id, user.id],
      );
      await db.query(`update topics set status = $2, is_relevant = $3 where id = $1`, [id, decision === "approve" ? "Gevalideerd" : "Niet relevant", decision === "approve"]);
    });
    return { ok: true, message: decision === "approve" ? "Beoordeling goedgekeurd; onderwerp gevalideerd" : decision === "reopen" ? "Beoordeling heropend" : "Onderwerp als niet relevant vastgesteld" };
  });
}

export async function saveMaturity(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.edit");
    const d = z.object({
      topic_id: uuid.optional().nullable(),
      pillar_id: uuid.optional().nullable(),
      current_level: z.coerce.number({ message: "Kies een niveau" }).int().min(1, "Kies een niveau").max(5),
      target_level: z.coerce.number({ message: "Kies een niveau" }).int().min(1, "Kies een niveau").max(5),
      current_rationale: z.string().max(3000).nullable().optional(),
      target_rationale: z.string().max(3000).nullable().optional(),
    }).parse(formObject(fd));
    if (!d.topic_id && !d.pillar_id) return { ok: false, error: "Geen onderwerp of pijler opgegeven" };
    if (d.pillar_id) await requirePermission("pillars.edit");
    await withUser(user.id, async (db) => {
      await db.query(
        `insert into maturity_assessments(topic_id, pillar_id, current_level, target_level, current_rationale, target_rationale) values ($1,$2,$3,$4,$5,$6)`,
        [d.topic_id ?? null, d.pillar_id ?? null, d.current_level, d.target_level, d.current_rationale ?? null, d.target_rationale ?? null],
      );
      if (d.topic_id) await db.query(`update topics set maturity_current=$2, maturity_target=$3 where id=$1`, [d.topic_id, d.current_level, d.target_level]);
      if (d.pillar_id) await db.query(`update pillars set maturity_current=$2, maturity_target=$3, maturity_rationale=$4 where id=$1`,
        [d.pillar_id, d.current_level, d.target_level, d.current_rationale ?? null]);
    });
    return { ok: true, message: "Volwassenheid vastgelegd" };
  });
}

export async function addSource(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.edit");
    const d = z.object({
      topic_id: uuid,
      source_type: z.enum(SOURCE_TYPES),
      reference: z.string().max(500).nullable().optional(),
      note: z.string().max(2000).nullable().optional(),
      source_input_id: uuid.nullable().optional(),
    }).parse(formObject(fd));
    await withUser(user.id, (db) =>
      db.query(`insert into topic_sources(topic_id, source_type, reference, note, source_input_id) values ($1,$2,$3,$4,$5)`,
        [d.topic_id, d.source_type, d.reference ?? null, d.note ?? null, d.source_input_id ?? null]),
    );
    return { ok: true, message: "Bron gekoppeld" };
  });
}

export async function removeSource(id: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("topics.edit");
    await withUser(user.id, (db) => db.query(`delete from topic_sources where id = $1`, [uuid.parse(id)]));
    return { ok: true, message: "Koppeling verwijderd (oorspronkelijke input blijft bewaard)" };
  });
}

export async function addComment(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const d = z.object({
      entity_type: z.enum(["topic", "project", "program", "pillar", "risk", "decision", "session"]),
      entity_id: uuid,
      body: z.string({ message: "Opmerking is leeg" }).min(1, "Opmerking is leeg").max(5000),
    }).parse(formObject(fd));
    await withUser(user.id, (db) => db.query(`insert into comments(entity_type, entity_id, body) values ($1,$2,$3)`, [d.entity_type, d.entity_id, d.body]));
    return { ok: true, message: "Opmerking geplaatst" };
  });
}

/** Bundelen tot programma (bestaand of nieuw). */
export async function bundleToProgram(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("programs.edit");
    const ids = z.array(uuid).min(1, "Selecteer minimaal één onderwerp").parse(fd.getAll("topic_ids").map(String));
    const programId = String(fd.get("program_id") ?? "");
    const newName = String(fd.get("new_name") ?? "").trim();
    return withUser(user.id, async (db) => {
      let pid = programId;
      if (!pid) {
        if (newName.length < 3) return { ok: false, error: "Kies een programma of geef een naam voor een nieuw programma." };
        const pillar = await db.one<{ pillar_id: string; number: number }>(
          `select t.pillar_id, p.number from topics t join pillars p on p.id = t.pillar_id where t.id = $1`, [ids[0]]);
        const n = await db.one<{ c: number }>(`select count(*) + 1 as c from programs`);
        const row = await db.one<{ id: string }>(
          `insert into programs(code, name, pillar_id, status) values ($1,$2,$3,'Concept') returning id`,
          [`PGM-${pillar!.number}-${String(n!.c).padStart(2, "0")}`, newName, pillar!.pillar_id],
        );
        pid = row!.id;
      }
      await db.query(`update topics set program_id = $2 where id = any($1::uuid[])`, [ids, uuid.parse(pid)]);
      return { ok: true, message: `${ids.length} onderwerp(en) gebundeld in programma`, redirect: `/programmas/${pid}` };
    });
  });
}

/** Omzetten naar concreet project; onderwerpen blijven gekoppeld (herleidbaar). */
export async function convertToProject(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("projects.create");
    const ids = z.array(uuid).min(1, "Selecteer minimaal één onderwerp").parse(fd.getAll("topic_ids").map(String));
    const name = z.string({ message: "Projectnaam is verplicht" }).min(2, "Projectnaam is verplicht").max(200).parse(String(fd.get("name") ?? "").trim() || null);
    return withUser(user.id, async (db) => {
      const first = await db.one<{ pillar_id: string; program_id: string | null; problem_statement: string | null; intended_result: string | null;
        priority_category: string | null; priority_score: number | null }>(
        `select pillar_id, program_id, problem_statement, intended_result, priority_category, priority_score from topics where id = $1`, [ids[0]]);
      const p = await db.one<{ id: string; number: string }>(
        `insert into projects(name, primary_pillar_id, program_id, problem_statement, objective, priority_category, priority_score, status)
         values ($1,$2,$3,$4,$5,$6,$7,'Idee') returning id, number`,
        [name, first!.pillar_id, first!.program_id, first!.problem_statement, first!.intended_result, first!.priority_category, first!.priority_score],
      );
      for (const t of ids) await db.query(`insert into project_topics(project_id, topic_id) values ($1,$2) on conflict do nothing`, [p!.id, t]);
      await db.query(
        `insert into project_pillars(project_id, pillar_id)
         select distinct $1::uuid, pillar_id from topics where id = any($2::uuid[]) and pillar_id <> $3 on conflict do nothing`,
        [p!.id, ids, first!.pillar_id],
      );
      await db.query(`update topics set status = 'Omgezet naar project' where id = any($1::uuid[])`, [ids]);
      return { ok: true, message: `Project ${p!.number} aangemaakt`, redirect: `/projecten/${p!.id}` };
    });
  });
}

export async function saveView(page: string, name: string, config: unknown): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    const n = z.string().min(1, "Naam is verplicht").max(80).parse(name.trim());
    await withUser(user.id, (db) =>
      db.query(`insert into saved_views(user_id, page, name, config) values ($1,$2,$3,$4)
                on conflict (user_id, page, name) do update set config = excluded.config`, [user.id, page, n, JSON.stringify(config)]),
    );
    return { ok: true, message: `Weergave '${n}' opgeslagen` };
  });
}

export async function deleteView(id: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requireUser();
    await withUser(user.id, (db) => db.query(`delete from saved_views where id = $1`, [uuid.parse(id)]));
    return { ok: true, message: "Weergave verwijderd" };
  });
}
