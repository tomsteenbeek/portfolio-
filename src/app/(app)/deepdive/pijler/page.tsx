"use client";
import { AsyncPage, notFound, spObject } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { deepdiveData } from "@/server/queries/deepdive";
import { PageHeader } from "@/components/ui/page-header";
import { Walkthrough } from "@/components/deepdive/walkthrough";
import { MaturityGap } from "@/components/maturity-gap";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export default function DeepdivePillar() {
  return <AsyncPage render={async (__sp) => {
    const searchParams = Promise.resolve(spObject(__sp));
    const params = Promise.resolve({ id: __sp.get("id") ?? "", nummer: __sp.get("nr") ?? "" });

  const { nummer } = await params;
  const { t } = await searchParams;
  const d = await db(async (x, user) => ({ data: await deepdiveData(x, Number(nummer)), user }));
  if (!d.data) notFound();
  const { pillar, topics } = d.data;
  return (
    <>
      <PageHeader title={`Deepdive: ${pillar.title}`} description={pillar.objective}
        crumbs={[{ label: "Portfolio" }, { label: "Deepdive", href: "/deepdive" }, { label: `Pijler ${pillar.number}` }]} />
      <Walkthrough pillar={pillar} topics={topics} current={t ?? topics[0]?.id ?? null} canEdit={can(d.user.roles, "topics.edit")} canApprove={can(d.user.roles, "topics.approve")} />
      <Card className="mt-6"><CardHeader title="Maturity gap-overzicht" /><CardBody>
        <MaturityGap rows={topics.map((x) => ({ id: x.id, code: x.code, title: x.title, current: x.maturity_current, target: x.maturity_target }))} />
      </CardBody></Card>
    </>
  );

  }} />;
}
