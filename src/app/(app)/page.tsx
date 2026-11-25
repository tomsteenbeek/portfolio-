import Link from "next/link";
import { AlertTriangle, Clock, Gavel, Printer, ShieldAlert } from "lucide-react";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { dashboardCharts, dashboardKpis, getSettings, pillarCards } from "@/server/queries/dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PillarCard } from "@/components/pillar-card";
import { PairBars, SimpleBars } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { fmtDate, fmtEuro, fmtHours, fmtInt } from "@/lib/format";

export const metadata = { title: "Managementdashboard" };

export default async function DashboardPage() {
  const data = await db(async (d, user) => {
    const settings = await getSettings(d);
    const year = Number(settings["jaarplan.actief_jaar"] ?? 2027);
    const fin = can(user.roles, "finance.view");
    const [kpis, pillars, charts] = await Promise.all([dashboardKpis(d, year, fin), pillarCards(d, year, fin), dashboardCharts(d, year)]);
    return { settings, year, fin, kpis, pillars, charts };
  });
  const { kpis, pillars, charts, year, fin } = data;
  const shortage = kpis.required_hours !== null && kpis.available_hours !== null ? kpis.required_hours - kpis.available_hours : null;

  return (
    <>
      <PageHeader
        title="Managementdashboard"
        description={String(data.settings["organisatie.thema"] ?? "")}
        crumbs={[{ label: "Strategie" }, { label: "Managementdashboard" }]}
        actions={<>
          <LinkButton href="/directie" variant="secondary">Directieweergave</LinkButton>
          <LinkButton href="/directie?print=1" variant="ghost"><Printer className="h-4 w-4" aria-hidden />Rapportage</LinkButton>
        </>}
      />

      <h2 className="sr-only">Kerncijfers {year}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Stat label="Strategische pijlers" value={kpis.pillars} href="/pijlers" />
        <Stat label="Onderwerpen" value={kpis.topics} sub={`${kpis.to_validate} te valideren`} href="/inventarisatie" />
        <Stat label="Gevalideerd" value={kpis.validated} sub="initiatieven" href="/inventarisatie?status=Gevalideerd" />
        <Stat label="Actieve projecten" value={kpis.active_projects} sub={`${kpis.projects_total} lopend in portfolio`} href="/projecten" />
        <Stat label="Projecten hoog risico" value={kpis.high_risk_projects} tone={kpis.high_risk_projects ? "bad" : undefined} href="/risicos" />
        <Stat label="Openstaande besluiten" value={kpis.open_decisions} tone={kpis.open_decisions ? "warn" : undefined} href="/besluiten" />
        <Stat label={`Benodigde capaciteit ${year}`} value={fmtHours(kpis.required_hours, "Nog niet geraamd")} unknown={kpis.required_hours === null}
              sub={`Raming bij ${kpis.topics_with_hours} onderwerpen, ${kpis.recurring_with_hours}/${kpis.recurring_total} werkzaamheden`} href="/capaciteit" />
        <Stat label={`Beschikbare capaciteit ${year}`} value={fmtHours(kpis.available_hours, "Nog niet vastgesteld")} unknown={kpis.available_hours === null} href="/capaciteit" />
        <Stat label="Capaciteitstekort" value={shortage === null ? "Onbekend" : fmtHours(shortage)} unknown={shortage === null}
              tone={shortage !== null && shortage > 0 ? "bad" : shortage !== null ? "ok" : undefined}
              sub={shortage === null ? "Vereist raming én beschikbaarheid" : shortage > 0 ? "tekort" : "overschot"} href="/capaciteit" />
        <Stat label={`Benodigd budget ${year}`} value={fin ? fmtEuro(kpis.budget?.required, "Nog niet geraamd") : "Afgeschermd"} unknown={!fin || kpis.budget?.required == null} />
        <Stat label={`Beschikbaar budget ${year}`} value={fin ? fmtEuro(kpis.budget?.available, "Nog niet vastgesteld") : "Afgeschermd"} unknown={!fin || kpis.budget?.available == null} />
        <Stat label="Verplicht / urgent" value={kpis.protected_topics} sub="onderwerpen met markering" href="/inventarisatie?flag=1" />
      </div>

      <section aria-labelledby="pijlers-titel" className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="pijlers-titel" className="text-lg font-semibold">Strategische pijlers</h2>
          <Link href="/pijlers" className="text-[13px] text-primary hover:underline">Alle pijlers</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pillars.map((p) => <PillarCard key={p.id} p={p} canFinance={fin} />)}
        </div>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card><CardHeader title="Onderwerpen per status" description="Validatievoortgang van de inventarisatie" />
          <CardBody><SimpleBars data={charts.topicStatus} caption="Onderwerpen per status" horizontal height={190} /></CardBody></Card>
        <Card><CardHeader title="Projecten per prioriteit" description="Lopende projecten" />
          <CardBody><SimpleBars data={charts.byPriority} caption="Projecten per prioriteit" emptyText="Nog geen geprioriteerde projecten" /></CardBody></Card>
        <Card><CardHeader title="Projecten per status" />
          <CardBody><SimpleBars data={charts.byStatus} caption="Projecten per status" horizontal emptyText="Nog geen projecten aangemaakt" /></CardBody></Card>
        <Card><CardHeader title="Voortgang per pijler" description="Gemiddelde voortgang van projecten (%)" />
          <CardBody><SimpleBars data={charts.byPillarProgress} unit="%" caption="Voortgang per pijler" horizontal emptyText="Voortgang nog onbekend: er lopen nog geen projecten" /></CardBody></Card>
        <Card><CardHeader title={`Geplande projecten per kwartaal ${year}`} />
          <CardBody><SimpleBars data={charts.byQuarter} caption="Projecten per kwartaal" emptyText="Nog geen projecten met planning" /></CardBody></Card>
        <Card><CardHeader title={`Capaciteit per discipline ${year}`} description="Gepland vs beschikbaar (uren)" />
          <CardBody><PairBars data={charts.capacity} aLabel="Gepland" bLabel="Beschikbaar" unit=" uur" caption="Capaciteit per discipline" emptyText="Nog geen capaciteitsplanning vastgelegd" /></CardBody></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Belangrijkste risico's" actions={<Link href="/risicos" className="text-[13px] text-primary hover:underline">Risicoregister</Link>} />
          {charts.topRisks.length === 0 ? <EmptyState icon={<ShieldAlert className="h-8 w-8" />} title="Nog geen risico's geregistreerd" /> : (
            <ul className="divide-y divide-line">
              {charts.topRisks.map((r) => (
                <li key={r.id}><Link href={`/risicos/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-surface-muted">
                  <span className="min-w-0"><span className="text-[12px] text-muted">{r.number} · {r.category}{r.pillar ? ` · Pijler ${r.pillar}` : ""}</span><span className="block truncate text-sm">{r.title}</span></span>
                  <Badge tone={r.score >= 15 ? "bad" : r.score >= 8 ? "warn" : "ok"}>Score {r.score}</Badge>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Aankomende deadlines" />
          {charts.deadlines.length === 0 ? <EmptyState icon={<Clock className="h-8 w-8" />} title="Geen aankomende deadlines" description="Wettelijke deadlines en mijlpalen verschijnen hier zodra ze zijn vastgelegd." /> : (
            <ul className="divide-y divide-line">
              {charts.deadlines.map((d, i) => (
                <li key={i}><Link href={d.href} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-surface-muted">
                  <span className="min-w-0"><span className="text-[12px] text-muted">{d.kind}</span><span className="block truncate text-sm">{d.title}</span></span>
                  <span className="num shrink-0 text-[13px]">{fmtDate(d.date)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Besluitvorming vereist" />
          {charts.needsDecision.length === 0 ? <EmptyState icon={<Gavel className="h-8 w-8" />} title="Geen openstaande besluiten" /> : (
            <ul className="divide-y divide-line">
              {charts.needsDecision.map((d) => (
                <li key={d.id}><Link href={d.href} className="block px-5 py-2.5 hover:bg-surface-muted">
                  <span className="text-[12px] text-muted">{d.kind}</span><span className="block truncate text-sm">{d.label}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Noodzakelijk, maar onvoldoende middelen" description="P1/P2 of verplicht, met blokkerend tekort aan mensen, expertise of budget" />
          {charts.insufficient.length === 0 ? <EmptyState icon={<AlertTriangle className="h-8 w-8" />} title="Nog niets gesignaleerd" description="Vul haalbaarheidsbeoordelingen in via Prioritering → Haalbaarheid." /> : (
            <ul className="divide-y divide-line">
              {charts.insufficient.map((t) => (
                <li key={t.id}><Link href={`/onderwerpen/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-surface-muted">
                  <span className="min-w-0 truncate text-sm">{t.code} {t.title}</span>
                  <span className="flex shrink-0 gap-1">{t.flags && <Badge tone="accent">Verplicht</Badge>}{t.reasons.map((r) => <Badge key={r} tone="bad">{r}</Badge>)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <p className="mt-6 text-[12px] text-subtle">
        Cijfers worden live berekend uit de database. Ontbrekende gegevens worden als onbekend getoond, nooit als nul. Aantal geregistreerde onderwerpen: {fmtInt(kpis.topics)}.
      </p>
    </>
  );
}
