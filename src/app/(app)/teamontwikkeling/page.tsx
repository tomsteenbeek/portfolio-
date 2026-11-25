import Link from "next/link";
import { db } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";

export const metadata = { title: "Teamontwikkeling" };

export default async function TeamDevPage() {
  const d = await db(async (x) => ({
    topics: await x.query<{ id: string; code: string; title: string; status: string }>(
      `select id, code, title, status from topics where archived_at is null and code in ('1.02','1.10','3.15','3.16','4.10','4.17','4.20','5.14','5.15','7.20') order by string_to_array(code,'.')::int[]`),
    nobackup: await x.query<{ id: string; name: string; criticality: string; responsible_role: string | null }>(
      `select id, name, criticality, responsible_role from recurring_activities where archived_at is null and criticality in ('Hoog','Kritiek') and coalesce(backup_role,'') = '' order by criticality desc, name`),
    critical: await x.query<{ id: string; name: string; discipline: string | null }>(
      `select s.id, s.name, d.name as discipline from skills s left join disciplines d on d.id = s.discipline_id where s.is_critical order by d.sort_order, s.name`),
  }));
  return (
    <>
      <PageHeader title="Teamontwikkeling" crumbs={[{ label: "Organisatie" }, { label: "Teamontwikkeling" }]}
        description="Kennisborging, achtervang en ontwikkeling van expertise – om kwetsbaarheid door afhankelijkheid van individuele medewerkers te verminderen." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader title="Gerelateerde onderwerpen" description="Uit de inventarisatie" />
          <ul className="divide-y divide-line text-sm">{d.topics.map((t) => <li key={t.id} className="flex justify-between gap-2 px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/onderwerpen/${t.id}`}><span className="num text-muted">{t.code}</span> {t.title}</Link><StatusBadge status={t.status} /></li>)}</ul></Card>
        <Card><CardHeader title="Kritieke werkzaamheden zonder achtervang" />
          <ul className="divide-y divide-line text-sm">{d.nobackup.map((r) => <li key={r.id} className="flex justify-between px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/reguliere-werkzaamheden/${r.id}`}>{r.name}</Link><Badge tone="bad">{r.criticality}</Badge></li>)}
            {!d.nobackup.length && <li className="px-5 py-3 text-muted">Geen gesignaleerd (of kritikaliteit/achtervang nog niet vastgelegd).</li>}</ul></Card>
        <Card><CardHeader title="Kritische expertise" actions={<Link className="text-[13px] text-primary hover:underline" href="/expertise">Beheren</Link>} />
          <ul className="divide-y divide-line text-sm">{d.critical.map((s) => <li key={s.id} className="px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/expertise/${s.id}`}>{s.name}</Link>{s.discipline && <span className="text-muted"> · {s.discipline}</span>}</li>)}
            {!d.critical.length && <li className="px-5 py-3 text-muted">Nog geen kritische expertise vastgelegd.</li>}</ul></Card>
      </div>
    </>
  );
}
