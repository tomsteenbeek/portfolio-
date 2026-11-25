import Link from "next/link";
import { db } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Zoeken" };

type Hit = { kind: string; id: string; label: string; sub: string | null; status: string | null; href: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim().slice(0, 100);
  const hits = term.length < 2 ? [] : await db((x) => x.query<Hit>(
    `with q as (select '%' || replace(replace(lower($1), '%', '\\%'), '_', '\\_') || '%' as p)
     select * from (
       select 'Onderwerp' as kind, t.id, t.code || ' ' || t.title as label, t.description as sub, t.status, '/onderwerpen/' || t.id as href from topics t, q
        where t.archived_at is null and (lower(t.code || ' ' || t.title || ' ' || coalesce(t.description,'') || ' ' || coalesce(t.remarks,'')) like q.p)
       union all select 'Project', j.id, j.number || ' ' || j.name, j.objective, j.status, '/projecten/' || j.id from projects j, q
        where j.archived_at is null and lower(j.number || ' ' || j.name || ' ' || coalesce(j.objective,'')) like q.p
       union all select 'Programma', g.id, g.name, g.description, g.status, '/programmas/' || g.id from programs g, q where lower(g.code || ' ' || g.name) like q.p
       union all select 'Pijler', p.id, 'Pijler ' || p.number || ' – ' || p.title, p.objective, null, '/pijlers/' || p.number from pillars p, q where lower(p.title || ' ' || p.objective) like q.p
       union all select 'Risico', r.id, r.number || ' ' || r.title, r.description, r.stage, '/risicos/' || r.id from risks r, q where r.archived_at is null and lower(r.number || ' ' || r.title || ' ' || coalesce(r.description,'')) like q.p
       union all select 'Besluit', d.id, d.number || ' ' || d.subject, d.decision_text, d.outcome, '/besluiten/' || d.id from decisions d, q where d.archived_at is null and lower(d.number || ' ' || d.subject) like q.p
       union all select 'KPI', k.id, k.name, k.description, null, '/kpis/' || k.id from kpis k, q where k.archived_at is null and lower(k.name) like q.p
       union all select 'Werkzaamheid', a.id, a.name, a.description, null, '/reguliere-werkzaamheden/' || a.id from recurring_activities a, q where a.archived_at is null and lower(a.name) like q.p
       union all select 'Leverancier', s.id, s.name, s.services, null, '/leveranciers/' || s.id from suppliers s, q where s.archived_at is null and lower(s.name || ' ' || coalesce(s.services,'')) like q.p
       union all select 'Regelgeving', w.id, w.name, w.description, w.status, '/wetgeving/' || w.id from regulatory_requirements w, q where lower(w.name || ' ' || coalesce(w.description,'')) like q.p
     ) x limit 100`, [term]));
  return (
    <>
      <PageHeader title={term ? `Zoekresultaten voor “${term}”` : "Zoeken"} crumbs={[{ label: "Zoeken" }]} />
      <form method="get" role="search" className="mb-4 flex max-w-xl gap-2">
        <label htmlFor="q2" className="sr-only">Zoekterm</label>
        <input id="q2" name="q" defaultValue={term} className="h-10 flex-1 rounded-md border border-line-strong bg-surface px-3" placeholder="Zoek in onderwerpen, projecten, risico's, besluiten…" />
        <button className="h-10 rounded-md bg-primary px-4 text-sm text-white">Zoeken</button>
      </form>
      <Card>
        {term.length < 2 ? <EmptyState title="Typ minimaal twee tekens" /> : hits.length === 0 ? <EmptyState title="Niets gevonden" /> : (
          <ul className="divide-y divide-line" aria-live="polite">
            {hits.map((h) => (
              <li key={`${h.kind}-${h.id}`}><Link href={h.href} className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-surface-muted">
                <span className="min-w-0"><span className="text-[12px] font-medium uppercase tracking-wide text-muted">{h.kind}</span><span className="block font-medium">{h.label}</span>{h.sub && <span className="line-clamp-1 text-[13px] text-muted">{h.sub}</span>}</span>
                {h.status && <StatusBadge status={h.status} />}
              </Link></li>))}
          </ul>
        )}
      </Card>
    </>
  );
}
