"use server";
import { z } from "zod";
import { withUser } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { formObject, run, type ActionResult } from "@/server/action";
import { categorize, priorityScore, requiresDeviationRationale, validateWeights, type Category } from "@/lib/priority";
import { feasibilityScore, FEASIBILITY_DIMENSIONS } from "@/lib/feasibility";
import { SESSION_STATUSES } from "@/lib/domain";

const uuid = z.string().uuid();
const optDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional();

/** Nieuwe modelversie: oude versies blijven ongewijzigd zodat sessies reproduceerbaar zijn. */
export async function saveModelVersion(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("priority.model");
    const codes = fd.getAll("code").map(String);
    const criteria = codes.map((code) => ({
      code,
      name: z.string().min(2).max(100).parse(String(fd.get(`name_${code}`) ?? "").trim()),
      weight: z.coerce.number().min(0).max(100).parse(fd.get(`weight_${code}`)),
      description: String(fd.get(`description_${code}`) ?? "").trim() || null,
      rubric: [0, 1, 2, 3, 4, 5].map((i) => z.string().min(2, `Uitleg score ${i} bij ${code} ontbreekt`).max(500).parse(String(fd.get(`rubric_${code}_${i}`) ?? "").trim())),
    }));
    const w = validateWeights(criteria.map((c) => c.weight));
    if (!w.ok) return { ok: false, error: `De som van de gewichten moet exact 100% zijn (nu ${w.sum}%).` };
    const note = String(fd.get("note") ?? "").trim() || null;
    return withUser(user.id, async (db) => {
      const v = await db.one<{ v: number }>(`select coalesce(max(version),0) + 1 as v from priority_models`);
      await db.query(`update priority_models set is_active = false where is_active`);
      const m = await db.one<{ id: string }>(
        `insert into priority_models(version, name, description, is_active) values ($1,$2,$3,true) returning id`,
        [v!.v, `Model versie ${v!.v}`, note],
      );
      for (const [i, c] of criteria.entries()) {
        await db.query(
          `insert into priority_criteria(model_id, code, name, weight, description, rubric, sort_order) values ($1,$2,$3,$4,$5,$6,$7)`,
          [m!.id, c.code, c.name, c.weight, c.description, JSON.stringify(c.rubric), i],
        );
      }
      return { ok: true, message: `Modelversie ${v!.v} is actief. Lopende sessies blijven hun eigen versie gebruiken.` };
    });
  });
}

export async function createSession(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("priority.sessions");
    const d = z.object({
      name: z.string({ message: "Naam is verplicht" }).min(3, "Naam is verplicht").max(200),
      description: z.string().max(3000).nullable().optional(),
      start_date: optDate,
      end_date: optDate,
    }).parse(formObject(fd));
    const members = fd.getAll("members").map(String).filter((x) => uuid.safeParse(x).success);
    const topics = fd.getAll("topics").map(String).filter((x) => uuid.safeParse(x).success);
    const projects = fd.getAll("projects").map(String).filter((x) => uuid.safeParse(x).success);
    const hide = fd.get("hide_individual") !== "off";
    if (d.start_date && d.end_date && d.end_date < d.start_date) return { ok: false, error: "Einddatum ligt voor de startdatum." };
    return withUser(user.id, async (db) => {
      const model = await db.one<{ id: string }>(`select id from priority_models where is_active`);
      if (!model) return { ok: false, error: "Er is geen actief prioriteringsmodel." };
      const s = await db.one<{ id: string }>(
        `insert into priority_sessions(name, description, model_id, start_date, end_date, hide_individual) values ($1,$2,$3,$4,$5,$6) returning id`,
        [d.name, d.description ?? null, model.id, d.start_date ?? null, d.end_date ?? null, hide],
      );
      for (const m of members) await db.query(`insert into priority_session_members values ($1,$2) on conflict do nothing`, [s!.id, m]);
      let i = 0;
      for (const t of topics) await db.query(`insert into priority_session_items(session_id, topic_id, sort_order) values ($1,$2,$3) on conflict do nothing`, [s!.id, t, i++]);
      for (const p of projects) await db.query(`insert into priority_session_items(session_id, project_id, sort_order) values ($1,$2,$3) on conflict do nothing`, [s!.id, p, i++]);
      return { ok: true, message: "Sessie aangemaakt", redirect: `/prioritering/${s!.id}?tab=instellingen` };
    });
  });
}

export async function updateSession(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("priority.sessions");
    const id = uuid.parse(fd.get("id"));
    const members = fd.getAll("members").map(String).filter((x) => uuid.safeParse(x).success);
    const addTopics = fd.getAll("add_topics").map(String).filter((x) => uuid.safeParse(x).success);
    const removeItems = fd.getAll("remove_items").map(String).filter((x) => uuid.safeParse(x).success);
    const d = z.object({
      name: z.string().min(3).max(200),
      description: z.string().max(3000).nullable().optional(),
      start_date: optDate, end_date: optDate,
    }).parse(formObject(fd));
    return withUser(user.id, async (db) => {
      await db.query(`update priority_sessions set name=$2, description=$3, start_date=$4, end_date=$5, hide_individual=$6 where id=$1`,
        [id, d.name, d.description ?? null, d.start_date ?? null, d.end_date ?? null, fd.get("hide_individual") === "on"]);
      await db.query(`delete from priority_session_members where session_id = $1 and not (user_id = any($2::uuid[]))`, [id, members]);
      for (const m of members) await db.query(`insert into priority_session_members values ($1,$2) on conflict do nothing`, [id, m]);
      const max = await db.one<{ m: number }>(`select coalesce(max(sort_order),0) as m from priority_session_items where session_id=$1`, [id]);
      let i = (max?.m ?? 0) + 1;
      for (const t of addTopics) await db.query(`insert into priority_session_items(session_id, topic_id, sort_order) values ($1,$2,$3) on conflict do nothing`, [id, t, i++]);
      if (removeItems.length) {
        const used = await db.one<{ n: number }>(`select count(*) as n from priority_assessments where session_item_id = any($1::uuid[])`, [removeItems]);
        if (used?.n) return { ok: false, error: "Items met beoordelingen kunnen niet worden verwijderd (beoordelingen blijven bewaard)." };
        await db.query(`delete from priority_session_items where id = any($1::uuid[]) and session_id = $2`, [removeItems, id]);
      }
      return { ok: true, message: "Sessie bijgewerkt" };
    });
  });
}

export async function setSessionStatus(id: string, status: (typeof SESSION_STATUSES)[number]): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("priority.sessions");
    await withUser(user.id, async (db) => {
      const n = await db.one<{ items: number; members: number }>(
        `select (select count(*) from priority_session_items where session_id=$1) as items, (select count(*) from priority_session_members where session_id=$1) as members`, [id]);
      if (status === "Open voor beoordeling" && (!n?.items || !n?.members)) throw Object.assign(new Error("Voeg eerst onderwerpen en deelnemers toe."), { code: "P0001" });
      await db.query(`update priority_sessions set status = $2 where id = $1`, [uuid.parse(id), z.enum(SESSION_STATUSES).parse(status)]);
    });
    return { ok: true, message: `Status: ${status}` };
  });
}

type ScoreInput = Record<string, number | null>;

async function loadCriteria(db: Parameters<Parameters<typeof withUser>[1]>[0], itemId: string) {
  return db.query<{ id: string; code: string; name: string; weight: number }>(
    `select c.id, c.code, c.name, c.weight from priority_session_items i join priority_sessions s on s.id = i.session_id
       join priority_criteria c on c.model_id = s.model_id where i.id = $1 order by c.sort_order`, [itemId]);
}

/** Individuele beoordeling (blind). Elke wijziging wordt als revisie bewaard. */
export async function submitAssessment(itemId: string, scores: ScoreInput, rationale: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("priority.assess");
    const id = uuid.parse(itemId);
    return withUser(user.id, async (db) => {
      const criteria = await loadCriteria(db, id);
      const total = priorityScore(criteria, scores);
      if (total === null) return { ok: false, error: "Geef bij ieder criterium een score (0–5)." };
      const cat = categorize(total);
      const a = await db.one<{ id: string }>(
        `insert into priority_assessments(session_item_id, user_id, is_consensus, rationale, total_score, category)
         values ($1,$2,false,$3,$4,$5)
         on conflict (session_item_id, user_id, is_consensus) do update
           set rationale = excluded.rationale, total_score = excluded.total_score, category = excluded.category,
               revision = priority_assessments.revision + 1, submitted_at = now()
         returning id`,
        [id, user.id, rationale.trim().slice(0, 3000) || null, total, cat],
      );
      if (!a) return { ok: false, error: "Beoordelen is niet mogelijk: de sessie is niet open of u bent geen deelnemer." };
      await db.query(`delete from priority_scores where assessment_id = $1`, [a.id]);
      for (const c of criteria) await db.query(`insert into priority_scores values ($1,$2,$3)`, [a.id, c.id, scores[c.id]]);
      await db.query(`select app.finalize_assessment($1)`, [a.id]);
      return { ok: true, message: `Beoordeling opgeslagen (${cat}, ${total.toFixed(1).replace(".", ",")})` };
    });
  });
}

export async function saveConsensus(itemId: string, scores: ScoreInput, note: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("priority.sessions");
    const id = uuid.parse(itemId);
    return withUser(user.id, async (db) => {
      const criteria = await loadCriteria(db, id);
      const total = priorityScore(criteria, scores);
      if (total === null) return { ok: false, error: "Vul alle criteria in voor de consensusbeoordeling." };
      const cat = categorize(total);
      const a = await db.one<{ id: string }>(
        `insert into priority_assessments(session_item_id, user_id, is_consensus, rationale, total_score, category)
         values ($1,$2,true,$3,$4,$5)
         on conflict (session_item_id, user_id, is_consensus) do update
           set rationale = excluded.rationale, total_score = excluded.total_score, category = excluded.category,
               revision = priority_assessments.revision + 1, submitted_at = now()
         returning id`,
        [id, user.id, note.trim() || null, total, cat],
      );
      await db.query(`delete from priority_scores where assessment_id = $1`, [a!.id]);
      for (const c of criteria) await db.query(`insert into priority_scores values ($1,$2,$3)`, [a!.id, c.id, scores[c.id]]);
      await db.query(`select app.finalize_assessment($1)`, [a!.id]);
      await db.query(`update priority_session_items set consensus_score=$2, consensus_category=$3, consensus_note=$4, consensus_at=now() where id=$1`,
        [id, total, cat, note.trim() || null]);
      return { ok: true, message: `Consensus vastgelegd: ${cat}` };
    });
  });
}

/** Definitieve prioriteit door de teamleider; motivering verplicht bij afwijking van consensus. */
export async function finalizePriority(itemId: string, finalCategory: Category, rationale: string): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("priority.finalize");
    const id = uuid.parse(itemId);
    const final = z.enum(["P1", "P2", "P3", "P4"]).parse(finalCategory);
    return withUser(user.id, async (db) => {
      const item = await db.one<{ topic_id: string | null; project_id: string | null; consensus_category: Category | null; consensus_score: number | null; mean: number | null }>(
        `select i.topic_id, i.project_id, i.consensus_category, i.consensus_score,
                (select avg(total_score) from priority_assessments a where a.session_item_id = i.id and not a.is_consensus) as mean
           from priority_session_items i where i.id = $1`, [id]);
      if (!item) return { ok: false, error: "Item niet gevonden" };
      if (requiresDeviationRationale(item.consensus_category, final) && rationale.trim().length < 10) {
        return { ok: false, error: "U wijkt af van de gezamenlijke beoordeling. Een motivering van minimaal 10 tekens is verplicht." };
      }
      await db.query(
        `insert into priority_decisions(topic_id, project_id, session_item_id, consensus_category, consensus_score, final_category, deviation_rationale)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [item.topic_id, item.project_id, id, item.consensus_category, item.consensus_score, final, rationale.trim() || null],
      );
      const score = item.consensus_score ?? item.mean;
      if (item.topic_id) await db.query(`update topics set priority_category=$2, priority_score=$3, priority_is_final=true where id=$1`, [item.topic_id, final, score]);
      if (item.project_id) await db.query(`update projects set priority_category=$2, priority_score=$3 where id=$1`, [item.project_id, final, score]);
      return { ok: true, message: `Definitieve prioriteit ${final} vastgesteld` };
    });
  });
}

export async function saveFeasibility(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const user = await requirePermission("feasibility.edit");
    const o = formObject(fd);
    const target = o.topic_id ? { col: "topic_id", id: uuid.parse(o.topic_id) } : { col: "project_id", id: uuid.parse(o.project_id) };
    const dims: Record<string, number | null> = {};
    for (const d of FEASIBILITY_DIMENSIONS) {
      const v = o[d.key];
      dims[d.key] = v === null || v === undefined ? null : z.coerce.number().int().min(0).max(5).parse(v);
    }
    const total = feasibilityScore(dims);
    await withUser(user.id, async (db) => {
      await db.query(
        `insert into feasibility_assessments(${target.col}, ${FEASIBILITY_DIMENSIONS.map((d) => d.key).join(",")}, total_score,
           blocking_capacity, blocking_expertise, blocking_budget, rationale)
         values ($1, ${FEASIBILITY_DIMENSIONS.map((_, i) => `$${i + 2}`).join(",")}, $9, $10, $11, $12, $13)`,
        [target.id, ...FEASIBILITY_DIMENSIONS.map((d) => dims[d.key]), total,
          fd.get("blocking_capacity") === "on", fd.get("blocking_expertise") === "on", fd.get("blocking_budget") === "on", o.rationale ?? null],
      );
      if (target.col === "project_id") await db.query(`update projects set feasibility_score = $2 where id = $1`, [target.id, total]);
    });
    return { ok: true, message: total === null ? "Haalbaarheid (deels) vastgelegd" : `Haalbaarheid vastgelegd: ${Math.round(total)}/100` };
  });
}
