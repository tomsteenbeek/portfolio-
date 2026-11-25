import Link from "next/link";
import { db } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { fmtDateTime } from "@/lib/format";
import { MATURITY_LEVELS } from "@/lib/domain";

export const metadata = { title: "Deepdive" };

export default async function DeepdiveIndex() {
  const d = await db(async (x) => ({
    pillars: await x.query<{ number: number; title: string; topics: number; started: number; approved: number; not_relevant: number }>(
      `select p.number, p.title,
              count(t.id)::int as topics,
              count(a.id) filter (where a.answers <> '{}'::jsonb)::int as started,
              count(a.id) filter (where a.status = 'Goedgekeurd')::int as approved,
              count(t.id) filter (where t.status = 'Niet relevant')::int as not_relevant
         from pillars p left join topics t on t.pillar_id = p.id and t.archived_at is null and t.status not in ('Samengevoegd','Gesplitst')
         left join topic_assessments a on a.topic_id = t.id
        where p.archived_at is null group by p.id order by p.number`),
    sessions: await x.query<{ id: string; title: string; updated_at: string; state: { topicId?: string; code?: string }; number: number | null; by: string | null }>(
      `select w.id, w.title, w.updated_at, w.state, p.number, u.display_name as by from work_sessions w left join pillars p on p.id = w.pillar_id
         left join users u on u.id = coalesce(w.updated_by, w.created_by) where w.kind = 'Deepdive' and w.status = 'Lopend' order by w.updated_at desc limit 10`),
  }));
  return (
    <>
      <PageHeader title="Inhoudelijke deepdive" crumbs={[{ label: "Portfolio" }, { label: "Deepdive" }]}
        description="Werksessie 1: doorloop per pijler alle onderwerpen, beoordeel relevantie, leg huidige en gewenste situatie vast en bundel onderwerpen tot programma's of projecten." />
      {d.sessions.length > 0 && (
        <Card className="mb-6"><CardHeader title="Lopende werksessies hervatten" />
          <ul className="divide-y divide-line text-sm">
            {d.sessions.map((s) => (
              <li key={s.id}><Link className="flex justify-between px-5 py-2.5 hover:bg-surface-muted" href={`/deepdive/${s.number}${s.state.topicId ? `?t=${s.state.topicId}` : ""}`}>
                <span>{s.title}{s.state.code ? ` – laatst bij ${s.state.code}` : ""}</span><span className="text-muted">{fmtDateTime(s.updated_at)}{s.by ? ` · ${s.by}` : ""}</span>
              </Link></li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {d.pillars.map((p) => (
          <Link key={p.number} href={`/deepdive/${p.number}`} className="rounded-lg border border-line bg-surface p-4 shadow-card hover:border-primary">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-primary">Pijler {p.number}</div>
            <div className="mt-1 font-semibold leading-snug">{p.title}</div>
            <div className="mt-3 flex h-1.5 gap-[2px] overflow-hidden rounded bg-line" aria-hidden>
              <span className="bg-ok" style={{ width: `${(p.approved / Math.max(1, p.topics)) * 100}%` }} />
              <span className="bg-info" style={{ width: `${((p.started - p.approved) / Math.max(1, p.topics)) * 100}%` }} />
            </div>
            <p className="mt-1.5 num text-[12px] text-muted">{p.started} van {p.topics} besproken · {p.approved} goedgekeurd · {p.not_relevant} niet relevant</p>
          </Link>
        ))}
      </div>
      <Card className="mt-6"><CardHeader title="Volwassenheidsmodel" />
        <ol className="grid gap-px bg-line sm:grid-cols-5">{MATURITY_LEVELS.map((m) => <li key={m.level} className="bg-surface p-4"><div className="font-semibold">{m.level}. {m.label}</div><p className="mt-1 text-[13px] text-muted">{m.description}</p></li>)}</ol>
      </Card>
    </>
  );
}
