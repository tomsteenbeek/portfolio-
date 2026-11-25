import Link from "next/link";
import { db } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Afhankelijkheden" };

export default async function DepsPage() {
  const d = await db(async (x) => ({
    deps: await x.query<{ id: string; a_id: string; a: string; a_status: string; a_start: string | null; b_id: string; b: string; b_status: string; b_end: string | null; kind: string; note: string | null; conflict: boolean }>(
      `select d.id, a.id as a_id, a.number || ' ' || a.name as a, a.status as a_status, a.start_date as a_start,
              b.id as b_id, b.number || ' ' || b.name as b, b.status as b_status, b.end_date as b_end, d.kind, d.note,
              (d.kind = 'Einde-start' and a.start_date is not null and b.end_date is not null and a.start_date <= b.end_date) as conflict
         from project_dependencies d join projects a on a.id = d.project_id join projects b on b.id = d.depends_on_project_id
        where a.archived_at is null and b.archived_at is null order by conflict desc, a.number`),
    critical: await x.query<{ id: string; code: string; title: string; flag_rationale: string | null }>(
      `select id, code, title, flag_rationale from topics where flag_critical_dependency and archived_at is null order by code`),
    fan: await x.query<{ id: string; label: string; n: number }>(
      `select b.id, b.number || ' ' || b.name as label, count(*)::int as n from project_dependencies d join projects b on b.id = d.depends_on_project_id group by b.id order by n desc limit 8`),
  }));
  return (
    <>
      <PageHeader title="Afhankelijkheden" crumbs={[{ label: "Portfolio" }, { label: "Afhankelijkheden" }]}
        description="Welke projecten kunnen pas starten als andere gereed zijn, en welke initiatieven zijn randvoorwaardelijk voor veel andere." />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card><CardHeader title="Projectafhankelijkheden" description={`${d.deps.filter((x) => x.conflict).length} planningsconflict(en)`} />
          {d.deps.length === 0 ? <EmptyState title="Nog geen afhankelijkheden vastgelegd" description="Leg afhankelijkheden vast op het tabblad Planning van een project." /> : (
            <table className="w-full text-[13px]"><caption className="sr-only">Afhankelijkheden</caption>
              <thead className="bg-surface-muted text-left text-[12px] text-muted"><tr><th className="px-3 py-2">Project</th><th>is afhankelijk van</th><th>Type</th><th>Signaal</th></tr></thead>
              <tbody>{d.deps.map((x) => (
                <tr key={x.id} className="border-t border-line align-top">
                  <td className="px-3 py-2"><Link className="hover:text-primary hover:underline" href={`/projecten/${x.a_id}`}>{x.a}</Link><div className="text-[12px] text-muted">start {fmtDate(x.a_start)} · <StatusBadge status={x.a_status} /></div></td>
                  <td className="py-2"><Link className="hover:text-primary hover:underline" href={`/projecten/${x.b_id}`}>{x.b}</Link><div className="text-[12px] text-muted">einde {fmtDate(x.b_end)} · <StatusBadge status={x.b_status} /></div></td>
                  <td className="py-2"><Badge>{x.kind}</Badge>{x.note && <div className="text-[12px] text-muted">{x.note}</div>}</td>
                  <td className="py-2 pr-3">{x.conflict ? <Badge tone="bad">Start vóór einde voorganger</Badge> : <Badge tone="ok">Geen conflict</Badge>}</td>
                </tr>))}</tbody>
            </table>
          )}
        </Card>
        <div className="space-y-4">
          <Card><CardHeader title="Meest randvoorwaardelijk" description="Projecten waarvan de meeste andere afhangen" />
            <ul className="divide-y divide-line text-sm">{d.fan.map((f) => <li key={f.id} className="flex justify-between px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/projecten/${f.id}`}>{f.label}</Link><span className="num text-muted">{f.n}</span></li>)}
              {!d.fan.length && <li className="px-5 py-3 text-muted">Geen gegevens.</li>}</ul></Card>
          <Card><CardHeader title="Onderwerpen met kritische afhankelijkheid" />
            <ul className="divide-y divide-line text-sm">{d.critical.map((t) => <li key={t.id} className="px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/onderwerpen/${t.id}`}>{t.code} {t.title}</Link>{t.flag_rationale && <p className="text-[12px] text-muted">{t.flag_rationale}</p>}</li>)}
              {!d.critical.length && <li className="px-5 py-3 text-muted">Nog geen onderwerpen gemarkeerd.</li>}</ul></Card>
        </div>
      </div>
    </>
  );
}
