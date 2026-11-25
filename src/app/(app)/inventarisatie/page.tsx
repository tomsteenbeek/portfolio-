"use client";
import { AsyncPage, spObject } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { listTopics, lookups } from "@/server/queries/topics";
import { PageHeader } from "@/components/ui/page-header";
import { TopicTable } from "@/components/topics/topic-table";

export default function InventoryPage() {
  return <AsyncPage render={async (__sp) => {
    const searchParams = Promise.resolve(spObject(__sp));

  const sp = await searchParams;
  const { rows, lk, views, canEdit } = await db(async (d, user) => ({
    rows: await listTopics(d, { includeArchived: true }),
    lk: await lookups(d),
    views: await d.query<{ id: string; name: string; config: never }>(`select id, name, config from saved_views where page = 'inventarisatie' order by name`),
    canEdit: can(user.roles, "topics.edit"),
  }));
  return (
    <>
      <PageHeader
        title="Totale inventarisatie"
        description="Alle werkzaamheden, ambities, verplichtingen en verbeterinitiatieven. Onderwerpen zijn géén projecten: bundel ze pas na validatie tot programma's of projecten."
        crumbs={[{ label: "Portfolio" }, { label: "Totale inventarisatie" }]}
      />
      <TopicTable
        rows={rows}
        lookups={lk}
        canEdit={canEdit}
        views={views}
        initial={{ q: sp.q, status: sp.status, pillar: sp.pillar, flag: sp.flag, source: sp.source, priority: sp.priority, program: sp.program }}
      />
    </>
  );

  }} />;
}
