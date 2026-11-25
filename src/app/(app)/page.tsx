"use client";
import Link from "next/link";
import { AsyncPage } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { getSettings } from "@/server/queries/dashboard";
import { pillarSummaries } from "@/server/queries/overview";
import { listProjects } from "@/server/queries/projects";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Card, CardHeader } from "@/components/ui/card";
import { PillarCard } from "@/components/pillar-card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PrintButton } from "@/components/common/print-button";
import { fmtDate } from "@/lib/format";

export default function DashboardPage() {
  return <AsyncPage render={async () => {
    const d = await db(async (x) => {
      const [settings, pillars, projects, kpis] = await Promise.all([
        getSettings(x), pillarSummaries(x), listProjects(x),
        x.one<{ n: number; measured: number }>(`select count(*)::int as n, count(*) filter (where exists (select 1 from kpi_measurements m where m.kpi_id = k.id))::int as measured from kpis k where k.archived_at is null`),
      ]);
      return { settings, pillars, projects, kpis };
    });
    const t = d.pillars.reduce((a, p) => ({ topics: a.topics + p.topics, owner: a.owner + p.topics_with_owner, described: a.described + p.topics_described }), { topics: 0, owner: 0, described: 0 });
    const running = d.projects.filter((p) => p.status === "In uitvoering");
    const open = d.projects.filter((p) => !["Afgerond", "Geannuleerd"].includes(p.status));
    return (
      <>
        <PageHeader title="Strategische pijlers" description={String(d.settings["organisatie.thema"] ?? "")}
          crumbs={[{ label: "Dashboard" }]} actions={<PrintButton />} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Pijlers" value={d.pillars.length} />
          <Stat label="Onderwerpen" value={t.topics} href="/onderwerpen" />
          <Stat label="Met eigenaar" value={`${t.owner} / ${t.topics}`} href="/onderwerpen" />
          <Stat label="Beschreven" value={`${t.described} / ${t.topics}`} sub="omschrijving of inhoud ingevuld" href="/onderwerpen" />
          <Stat label="KPI's" value={d.kpis?.n ?? 0} sub={`${d.kpis?.measured ?? 0} met meting`} href="/kpis" />
          <Stat label="Projecten & initiatieven" value={open.length} sub={`${running.length} in uitvoering`} href="/projecten" />
        </div>
        <section aria-labelledby="pijlers" className="mt-8">
          <h2 id="pijlers" className="sr-only">Pijlers</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{d.pillars.map((p) => <PillarCard key={p.id} p={p} />)}</div>
        </section>
        <Card className="mt-8">
          <CardHeader title="Lopende projecten & initiatieven" description="Het werk zelf wordt bijgehouden in Planner"
            actions={<Link href="/projecten" className="text-[13px] text-primary hover:underline">Alle projecten</Link>} />
          {open.length === 0 ? <EmptyState title="Nog geen projecten of initiatieven" description="Voeg ze toe via Projecten & initiatieven en koppel ze aan pijlers en onderwerpen." /> : (
            <ul className="divide-y divide-line text-sm">
              {open.slice(0, 10).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
                  <Link href={`/projecten/detail?id=${p.id}`} className="font-medium hover:text-primary hover:underline">{p.name}</Link>
                  <span className="flex items-center gap-3 text-[13px] text-muted">
                    <span>Pijler {[p.pillar_number, ...p.secondary_pillars].join(", ")}</span>
                    {p.lead_name && <span>{p.lead_name}</span>}
                    {p.end_date && <span>t/m {fmtDate(p.end_date)}</span>}
                    <StatusBadge status={p.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </>
    );
  }} />;
}
