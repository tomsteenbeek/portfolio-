"use client";
import { AsyncPage, spObject } from "@/components/async-page";
import Link from "next/link";
import { GetForm } from "@/components/common/get-form";
import { db } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type Hit = { kind: string; id: string; label: string; sub: string | null; status: string | null; href: string };

export default function SearchPage() {
  return <AsyncPage render={async (__sp) => {
    const searchParams = Promise.resolve(spObject(__sp));

  const { q = "" } = await searchParams;
  const term = q.trim().slice(0, 100);
  const hits = term.length < 2 ? [] : await db((x) => x.query<Hit>(
    `with q as (select '%' || replace(replace(lower($1), '%', '\\%'), '_', '\\_') || '%' as p)
     select * from (
       select 'Pijler' as kind, p.id, 'Pijler ' || p.number || ' – ' || p.title as label, p.objective as sub, null::text as status, '/pijlers/detail?nr=' || p.number as href from pillars p, q
        where lower(p.title || ' ' || p.objective || ' ' || coalesce(p.description,'')) like q.p
       union all select 'Onderwerp', t.id, t.code || ' ' || t.title, coalesce(t.description, t.scope), null, '/onderwerpen/detail?id=' || t.id from topics t, q
        where t.archived_at is null and lower(t.code || ' ' || t.title || ' ' || coalesce(t.description,'') || ' ' || coalesce(t.scope,'') || ' ' || coalesce(t.remarks,'') || ' ' || coalesce(t.owner_name,'')) like q.p
       union all select 'KPI', k.id, k.name, k.description, null, '/kpis/detail?id=' || k.id from kpis k, q where k.archived_at is null and lower(k.name || ' ' || coalesce(k.description,'')) like q.p
       union all select 'Project / initiatief', j.id, j.name, j.description, j.status, '/projecten/detail?id=' || j.id from projects j, q
        where j.archived_at is null and lower(j.name || ' ' || coalesce(j.description,'') || ' ' || coalesce(j.lead_name,'')) like q.p
     ) x limit 100`, [term]));
  return (
    <>
      <PageHeader title={term ? `Zoekresultaten voor “${term}”` : "Zoeken"} crumbs={[{ label: "Zoeken" }]} />
      <GetForm path="/zoeken" role="search" className="mb-4 flex max-w-xl gap-2">
        <label htmlFor="q2" className="sr-only">Zoekterm</label>
        <input id="q2" name="q" defaultValue={term} className="h-10 flex-1 rounded-md border border-line-strong bg-surface px-3" placeholder="Zoek in pijlers, onderwerpen, KPI's en projecten…" />
        <button className="h-10 rounded-md bg-primary px-4 text-sm text-white">Zoeken</button>
      </GetForm>
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

  }} />;
}
