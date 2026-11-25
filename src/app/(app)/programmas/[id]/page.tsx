import Link from "next/link";
import { RegisterDetailPage } from "@/components/registers/register-pages";
import { Card, CardHeader } from "@/components/ui/card";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RegisterDetailPage registerKey="programs" id={id} extra={async (d) => {
      const topics = await d.query<{ id: string; code: string; title: string; status: string; priority_category: string | null }>(
        `select id, code, title, status, priority_category from topics where program_id = $1 and archived_at is null order by string_to_array(code,'.')::int[]`, [id]);
      const projects = await d.query<{ id: string; number: string; name: string; status: string }>(
        `select id, number, name, status from projects where program_id = $1 and archived_at is null order by number`, [id]);
      return (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Card><CardHeader title={`Onderwerpen (${topics.length})`} />
            <ul className="divide-y divide-line text-sm">{topics.map((t) => <li key={t.id} className="flex items-center justify-between gap-2 px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/onderwerpen/${t.id}`}><span className="num text-muted">{t.code}</span> {t.title}</Link><span className="flex gap-1"><PriorityBadge category={t.priority_category} /><StatusBadge status={t.status} /></span></li>)}
              {topics.length === 0 && <li className="px-5 py-4 text-muted">Nog geen onderwerpen gebundeld. Bundel via de inventarisatie of deepdive.</li>}</ul></Card>
          <Card><CardHeader title={`Projecten (${projects.length})`} />
            <ul className="divide-y divide-line text-sm">{projects.map((p) => <li key={p.id} className="flex items-center justify-between px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/projecten/${p.id}`}>{p.number} {p.name}</Link><StatusBadge status={p.status} /></li>)}
              {projects.length === 0 && <li className="px-5 py-4 text-muted">Nog geen projecten in dit programma.</li>}</ul></Card>
        </div>
      );
    }} />
  );
}
