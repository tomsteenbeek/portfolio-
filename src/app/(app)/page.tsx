"use client";
import Link from "next/link";
import { CalendarClock, ExternalLink, FolderKanban, Target, Table2, UserCheck, UserX } from "lucide-react";
import { AsyncPage } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { getSettings } from "@/server/queries/dashboard";
import { pillarSummaries } from "@/server/queries/overview";
import { listProjects } from "@/server/queries/projects";
import { listTeam } from "@/server/queries/team";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { PillarCard } from "@/components/pillar-card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PrintButton } from "@/components/common/print-button";
import { OwnershipBar, OwnershipLegend, ownershipOf } from "@/components/dashboard/ownership";
import { QuarterMatrix } from "@/components/dashboard/quarter-matrix";
import { TeamLoad } from "@/components/dashboard/team-load";
import { OwnerLabel } from "@/components/team/owner-select";
import { fmtDate } from "@/lib/format";
import { SIMPLE_PROJECT_STATUSES } from "@/server/actions/projects";

const STATUS_COLOR: Record<string, string> = {
  Idee: "var(--own-open)", Gepland: "var(--brand-sky)", "In uitvoering": "var(--brand-primary)", Gepauzeerd: "var(--own-capacity)",
};

function Kpi({ icon: Icon, label, value, sub, href, color }: { icon: typeof Table2; label: string; value: React.ReactNode; sub?: React.ReactNode; href: string; color: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 shadow-card transition-colors hover:border-line-strong">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-medium uppercase tracking-wide text-muted">{label}</span>
        <span className="num block text-[24px] font-semibold leading-tight">{value}</span>
        {sub && <span className="block truncate text-[12px] text-muted">{sub}</span>}
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  return <AsyncPage render={async () => {
    const d = await db(async (x) => {
      const [settings, pillars, projects, team, kpis] = await Promise.all([
        getSettings(x), pillarSummaries(x), listProjects(x), listTeam(x),
        x.one<{ n: number; measured: number }>(`select count(*)::int as n, count(*) filter (where exists (select 1 from kpi_measurements m where m.kpi_id = k.id))::int as measured from kpis k where k.archived_at is null`),
      ]);
      return { settings, pillars, projects, team, kpis };
    });
    const own = d.pillars.map(ownershipOf).reduce((a, c) => ({ person: a.person + c.person, capacity: a.capacity + c.capacity, none: a.none + c.none, open: a.open + c.open }),
      { person: 0, capacity: 0, none: 0, open: 0 });
    const topics = d.pillars.reduce((n, p) => n + p.topics, 0);
    const open = d.projects.filter((p) => !["Afgerond", "Geannuleerd"].includes(p.status));
    const running = open.filter((p) => p.status === "In uitvoering");
    const byStatus = SIMPLE_PROJECT_STATUSES.filter((s) => !["Afgerond", "Geannuleerd"].includes(s))
      .map((s) => ({ s, n: open.filter((p) => p.status === s).length })).filter((x) => x.n > 0);
    const today = new Date().toISOString().slice(0, 10);
    const dated = open.filter((p) => p.end_date).sort((a, b) => a.end_date!.localeCompare(b.end_date!));
    const overdue = dated.filter((p) => p.end_date! < today);
    const upcoming = dated.filter((p) => p.end_date! >= today).slice(0, 8);
    const pct = topics ? Math.round((own.person / topics) * 100) : 0;
    const activeTeam = d.team.filter((m) => m.is_active);

    return (
      <>
        <PageHeader title="Digitale Informatie in één oogopslag" description={String(d.settings["organisatie.thema"] ?? "")}
          crumbs={[{ label: "Dashboard" }]} actions={<PrintButton />} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={Table2} label="Onderwerpen" value={topics} sub={`in ${d.pillars.length} pijlers`} href="/onderwerpen" color="var(--pillar-1)" />
          <Kpi icon={UserCheck} label="Met eigenaar" value={`${pct}%`} sub={`${own.person} van ${topics} onderwerpen`} href="/onderwerpen" color="var(--pillar-6)" />
          <Kpi icon={UserX} label="Geen capaciteit / persoon" value={own.capacity + own.none} sub={`${own.capacity} geen capaciteit · ${own.none} geen persoon`} href="/onderwerpen" color="var(--pillar-5)" />
          <Kpi icon={FolderKanban} label="Projecten & initiatieven" value={open.length} sub={`${running.length} in uitvoering · ${d.kpis?.n ?? 0} KPI's`} href="/projecten" color="var(--pillar-4)" />
        </div>

        <section aria-labelledby="pijlers" className="mt-6">
          <h2 id="pijlers" className="mb-3 text-[15px] font-semibold">De zeven pijlers</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{d.pillars.map((p) => <PillarCard key={p.id} p={p} />)}</div>
        </section>

        <div className="mt-6 grid gap-4 xl:grid-cols-[3fr_2fr]">
          <Card>
            <CardHeader title="Eigenaarschap per pijler" description="Wie is eigenaar van de onderwerpen, en waar is (nog) geen capaciteit?" />
            <div className="space-y-3 px-5 pb-4">
              <OwnershipLegend />
              {d.pillars.map((p) => {
                const c = ownershipOf(p);
                return (
                  <div key={p.id} className="grid grid-cols-[minmax(0,13rem)_1fr_4.5rem] items-center gap-3 text-[13px]">
                    <Link href={`/onderwerpen?pillar=${p.number}`} className="flex min-w-0 items-center gap-2 hover:text-primary hover:underline">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(--pillar-${p.number})` }} aria-hidden />
                      <span className="truncate">{p.number}. {p.short_title ?? p.title}</span>
                    </Link>
                    <OwnershipBar c={c} label={`Pijler ${p.number}`} height="h-4" />
                    <span className="num text-right text-muted">{c.person}/{p.topics}</span>
                  </div>
                );
              })}
              <details className="text-[13px]">
                <summary className="cursor-pointer text-muted hover:text-ink">Toon als tabel</summary>
                <table className="mt-2 w-full"><caption className="sr-only">Eigenaarschap per pijler</caption>
                  <thead className="text-left text-[12px] text-muted"><tr><th className="py-1 font-medium">Pijler</th><th className="font-medium">Teamlid</th><th className="font-medium">Geen capaciteit</th><th className="font-medium">Geen persoon</th><th className="font-medium">Nog niet bepaald</th></tr></thead>
                  <tbody>{d.pillars.map((p) => { const c = ownershipOf(p); return (
                    <tr key={p.id} className="num border-t border-line"><td className="py-1">{p.number}</td><td>{c.person}</td><td>{c.capacity}</td><td>{c.none}</td><td>{c.open}</td></tr>); })}</tbody>
                </table>
              </details>
            </div>
          </Card>
          <Card>
            <CardHeader title="Teambelasting" description={`${activeTeam.length} teamleden · eigenaar van onderwerpen en trekker van open projecten`} />
            {activeTeam.length === 0
              ? <p className="px-5 py-6 text-sm text-muted">Nog geen teamleden. Voeg ze toe onder <Link className="text-primary hover:underline" href="/team">Team</Link>.</p>
              : <TeamLoad team={d.team} />}
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader title="Ambities 2027 per kwartaal" description="Wat moet er per pijler aan het eind van elk kwartaal bereikt zijn? Vul aan via de pijler (Pijler bewerken)." />
          <div className="px-3 pb-4"><QuarterMatrix pillars={d.pillars} /></div>
        </Card>

        <div className="mt-6 grid gap-4 xl:grid-cols-[2fr_3fr]">
          <Card>
            <CardHeader title="Projecten & initiatieven per status" description="Het werk zelf staat op het I&A-bord in Planner"
              actions={<Link href="/projecten" className="text-[13px] text-primary hover:underline">Alle projecten</Link>} />
            {open.length === 0 ? <EmptyState title="Nog geen projecten of initiatieven" description="Voeg ze toe via Projecten & initiatieven." /> : (
              <div className="px-5 pb-5">
                <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded-md" role="img" aria-label={byStatus.map((x) => `${x.s} ${x.n}`).join(", ")}>
                  {byStatus.map((x) => <span key={x.s} title={`${x.s}: ${x.n}`} className="h-full" style={{ width: `${(x.n / open.length) * 100}%`, background: STATUS_COLOR[x.s] }} />)}
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-3">
                  {byStatus.map((x) => (
                    <li key={x.s} className="flex items-center gap-2 rounded-md border border-line px-3 py-2">
                      <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: STATUS_COLOR[x.s] }} aria-hidden />
                      <span className="flex-1 text-[13px]">{x.s}</span><span className="num text-lg font-semibold">{x.n}</span>
                    </li>
                  ))}
                </ul>
                <h3 className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wide text-muted">Per pijler</h3>
                <ul className="space-y-1.5">{d.pillars.map((p) => (
                  <li key={p.id} className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-2 text-[13px]">
                    <span className="num text-muted">{p.number}</span>
                    <span className="h-2.5 rounded-r-[4px]" style={{ width: `${(p.projects_total / Math.max(1, ...d.pillars.map((x) => x.projects_total))) * 100}%`, minWidth: p.projects_total ? 4 : 0, background: `var(--pillar-${p.number})` }}
                      title={`Pijler ${p.number}: ${p.projects_total} projecten`} />
                    <span className="num text-right">{p.projects_total}</span>
                  </li>))}</ul>
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Eerstvolgende einddatums" description="Open projecten en initiatieven, gesorteerd op einddatum" />
            {overdue.length > 0 && (
              <p className="mx-5 mb-2 rounded-md bg-bad-bg px-3 py-2 text-[13px] text-bad">
                <strong className="num">{overdue.length}</strong> open project(en) met een verstreken einddatum (o.a. {overdue.slice(0, 3).map((p) => p.name).join(", ")}). Werk de datum of status bij in Planner of hier.
              </p>
            )}
            {upcoming.length === 0 ? <p className="px-5 py-6 text-sm text-muted">Geen komende einddatums bekend.</p> : (
              <ul className="divide-y divide-line text-sm">
                {upcoming.map((p) => {
                  const late = p.end_date! < today;
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-5 py-2.5">
                      <span className={`flex w-16 shrink-0 flex-col items-center rounded-md border px-1 py-1 text-center ${late ? "border-bad/40 bg-bad-bg text-bad" : "border-line bg-surface-muted"}`}>
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                        <span className="num text-[11px] font-semibold leading-tight">{fmtDate(p.end_date)}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <Link href={`/projecten/detail?id=${p.id}`} className="font-medium hover:text-primary hover:underline">{p.name}</Link>
                        <span className="block text-[12px] text-muted">
                          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: `var(--pillar-${p.pillar_number})` }} aria-hidden />
                          Pijler {p.pillar_number} · <OwnerLabel name={p.lead_name} empty="Geen trekker" />{late && <strong className="ml-1 text-bad">· verlopen</strong>}
                        </span>
                      </span>
                      {p.planner_url && <a href={p.planner_url} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label={`${p.name} openen in Planner`}><ExternalLink className="h-4 w-4" /></a>}
                      <StatusBadge status={p.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-[12px] text-muted"><Target className="h-3.5 w-3.5" aria-hidden />{d.kpis?.n ?? 0} KPI&apos;s, waarvan {d.kpis?.measured ?? 0} met een meting · <Link href="/kpis" className="text-primary hover:underline">naar KPI&apos;s</Link></p>
      </>
    );
  }} />;
}
