"use client";
import { AsyncPage, spObject } from "@/components/async-page";
import { db, requirePermission } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { BundleForms } from "@/components/deepdive/bundle-forms";
import { EmptyState } from "@/components/ui/empty-state";
import { z } from "zod";

export default function BundlePage() {
  return <AsyncPage render={async (__sp) => {
    const searchParams = Promise.resolve(spObject(__sp));

  await requirePermission("topics.edit");
  const sp = await searchParams;
  const ids = (sp.ids ?? "").split(",").filter((x) => z.string().uuid().safeParse(x).success);
  const d = await db(async (x) => ({
    topics: await x.query<{ id: string; code: string; title: string }>(`select id, code, title from topics where id = any($1::uuid[]) order by string_to_array(code,'.')::int[]`, [ids]),
    programs: await x.query<{ id: string; name: string }>(`select id, name from programs where archived_at is null order by code`),
  }));
  return (
    <>
      <PageHeader title="Onderwerpen bundelen, samenvoegen of omzetten"
        crumbs={[{ label: "Portfolio" }, { label: "Deepdive", href: sp.terug ? `/deepdive/pijler?nr=${sp.terug}` : "/deepdive" }, { label: "Bundelen" }]}
        description={`${d.topics.length} onderwerp(en) geselecteerd. Voorkom dat ieder onderwerp automatisch een afzonderlijk project wordt.`} />
      {d.topics.length === 0 ? <EmptyState title="Geen onderwerpen geselecteerd" description="Selecteer onderwerpen in de inventarisatie of deepdive." /> : (
        <>
          <ul className="mb-4 flex flex-wrap gap-2 text-[13px]">{d.topics.map((t) => <li key={t.id} className="rounded border border-line bg-surface px-2 py-1"><span className="num text-muted">{t.code}</span> {t.title}</li>)}</ul>
          <BundleForms topics={d.topics} programs={d.programs} />
        </>
      )}
    </>
  );

  }} />;
}
