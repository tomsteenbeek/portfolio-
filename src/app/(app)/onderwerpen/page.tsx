"use client";
import { AsyncPage } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { listTopics, lookups } from "@/server/queries/topics";
import { PageHeader } from "@/components/ui/page-header";
import { TopicTable } from "@/components/topics/topic-table";

export default function TopicsPage() {
  return <AsyncPage render={async (sp) => {
    const d = await db(async (x) => ({ rows: await listTopics(x), lk: await lookups(x) }));
    return (
      <>
        <PageHeader title="Onderwerpen" crumbs={[{ label: "Overzicht" }, { label: "Onderwerpen" }]}
          description="Alle onderwerpen per pijler. Dit is werk in uitvoering: vul per onderwerp gaandeweg aan wat eronder valt, wat het doel is en wie eigenaar is." />
        <TopicTable rows={d.rows} lookups={d.lk} initialPillar={sp.get("pillar") ?? undefined} initialQ={sp.get("q") ?? undefined} />
      </>
    );
  }} />;
}
