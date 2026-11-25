import { db, requirePermission } from "@/lib/auth/current-user";
import { lookups } from "@/server/queries/topics";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { TopicForm } from "@/components/topics/topic-form";

export const metadata = { title: "Nieuw onderwerp" };

export default async function NewTopic({ searchParams }: { searchParams: Promise<{ pijler?: string }> }) {
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
}
