import type { Db } from "@/lib/db";
import type { DDTopic } from "@/components/deepdive/walkthrough";

export async function deepdiveData(db: Db, number: number) {
  const pillar = await db.one<{ id: string; number: number; title: string; objective: string }>(`select id, number, title, objective from pillars where number = $1`, [number]);
  if (!pillar) return null;
  const topics = await db.query<DDTopic>(
    `select t.id, t.code, t.title, t.status, t.description, g.name as program_name, t.priority_category, t.maturity_current, t.maturity_target,
            a.status as assessment_status, a.answers, (t.flag_legal or t.flag_hard_deadline or t.flag_acute_risk or t.flag_admin_decided) as flags
       from topics t left join programs g on g.id = t.program_id left join topic_assessments a on a.topic_id = t.id
      where t.pillar_id = $1 and t.archived_at is null and t.status not in ('Samengevoegd','Gesplitst')
      order by string_to_array(t.code,'.')::int[]`, [pillar.id]);
  return { pillar, topics };
}
