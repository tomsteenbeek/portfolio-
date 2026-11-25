"use client";
import { AsyncPage, spObject } from "@/components/async-page";
import { db, requirePermission } from "@/lib/auth/current-user";
import { lookups } from "@/server/queries/topics";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { TopicForm } from "@/components/topics/topic-form";

export default function NewTopic() {
  return <AsyncPage render={async (__sp) => {
    const searchParams = Promise.resolve(spObject(__sp));

  await requirePermission("topics.edit");
  const sp = await searchParams;
  const lk = await db((d) => lookups(d));
  const def = lk.pillars.find((p) => String(p.number) === sp.pijler)?.id;
  return (
    <>
      <PageHeader title="Nieuw onderwerp" crumbs={[{ label: "Portfolio" }, { label: "Totale inventarisatie", href: "/inventarisatie" }, { label: "Nieuw" }]}
        description="Het ID wordt automatisch toegekend binnen de gekozen pijler. Nieuwe onderwerpen starten met status 'Te valideren'." />
      <Card><CardBody><TopicForm lookups={lk} defaultPillar={def} /></CardBody></Card>
    </>
  );

  }} />;
}
