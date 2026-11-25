"use client";
import { AsyncPage } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { getSettings, pillarCards } from "@/server/queries/dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { PillarCard } from "@/components/pillar-card";

export default function PillarsPage() {
  return <AsyncPage render={async () => {

  const d = await db(async (x, user) => {
    const s = await getSettings(x);
    const fin = can(user.roles, "finance.view");
    return { pillars: await pillarCards(x, Number(s["jaarplan.actief_jaar"] ?? 2027), fin), fin, theme: String(s["organisatie.thema"] ?? "") };
  });
  return (
    <>
      <PageHeader title="Strategische pijlers" description={d.theme} crumbs={[{ label: "Strategie" }, { label: "Strategische pijlers" }]} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{d.pillars.map((p) => <PillarCard key={p.id} p={p} canFinance={d.fin} />)}</div>
    </>
  );

  }} />;
}
