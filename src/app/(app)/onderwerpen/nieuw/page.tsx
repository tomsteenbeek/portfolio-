"use client";
import { AsyncPage } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { lookups } from "@/server/queries/topics";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { TopicForm } from "@/components/topics/topic-form";

export default function NewTopic() {
  return <AsyncPage render={async (sp) => {
    const lk = await db((d) => lookups(d));
    const def = lk.pillars.find((p) => String(p.number) === sp.get("pijler"))?.id;
    return (
      <>
        <PageHeader title="Nieuw onderwerp" crumbs={[{ label: "Onderwerpen", href: "/onderwerpen" }, { label: "Nieuw" }]}
          description="Het ID wordt automatisch toegekend binnen de pijler. Alleen titel en pijler zijn nodig; de rest vul je later aan." />
        <Card><CardBody><TopicForm lookups={lk} defaultPillar={def} /></CardBody></Card>
      </>
    );
  }} />;
}
