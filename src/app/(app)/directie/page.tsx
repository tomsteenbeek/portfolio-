import Link from "next/link";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { dashboardCharts, dashboardKpis, getSettings, pillarCards } from "@/server/queries/dashboard";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge, Maturity, StatusBadge } from "@/components/ui/badge";
import { PrintButton } from "@/components/common/print-button";
import { fmtDate, fmtEuro, fmtHours, fmtPct } from "@/lib/format";

export const metadata = { title: "Directieweergave" };

/** Directieweergave: resultaten, risico's, investeringen en besluitvorming – minder operationeel detail. */
export default async function BoardPage() {
  const d = await db(async (x, user) => {
    const s = await getSettings(x);
    const year = Number(s["jaarplan.actief_jaar"] ?? 2027);
    const fin = can(user.roles, "finance.view");
    return {
      s, year, fin, kpis: await dashboardKpis(x, year, fin), pillars: await pillarCards(x, year, fin), charts: await dashboardCharts(x, year),
      plan: await x.one<{ status: string; title: string }>(`select status, title from annual_plans where year = $1`, [year]),
      kpiList: await x.query<{ id: string; name: string; unit: string | null; target_value: number | null; latest: number | null }>(
        `select k.id, k.name, k.unit, k.target_value, (select value from kpi_measurements m where m.kpi_id = k.id order by measured_on desc limit 1) as latest from kpis k where archived_at is null order by name limit 12`),
      postponed: await x.query<{ id: string; number: string; subject: string; outcome: string; rationale: string | null }>(
        `select id, number, subject, outcome, rationale from decisions where outcome in ('Uitgesteld','Afgewezen') and archived_at is null order by decision_date desc nulls last limit 8`),
    };
  });
  const k = d.kpis;
  const shortage = k.required_hours !== null && k.available_hours !== null ? k.required_hours - k.available_hours : null;
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="text-[13px] font-semibold uppercase tracking-wider text-primary">Directierapportage {d.year}</div>
          <h1 className="mt-1 text-3xl font-semibold leading-tight">Digitale Informatie</h1>
          <p className="mt-2 max-w-3xl text-[17px] text-muted">{String(d.s["organisatie.thema"] ?? "")}</p>
          {d.plan && <p className="mt-2 text-sm">{d.plan.title}: <StatusBadge status={d.plan.status} /></p>}
        </div>
        <div className="flex gap-2 no-print"><PrintButton label="Rapport afdrukken / PDF" />
          <form method="post" action="/api/export/report"><input type="hidden" name="report" value="directie" /><button name="format" value="xlsx" className="h-9 rounded-md border border-line-strong bg-surface px-3.5 text-sm hover:bg-surface-muted">Excel</button></form></div>
      </div>
      <section aria-labelledby="kern" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <h2 id="kern" className="sr-only">Kerncijfers</h2>
        <Stat label="Gevalideerde initiatieven" value={`${k.validated} / ${k.topics}`} />
        <Stat label="Projecten in uitvoering" value={k.active_projects} sub={`${k.high_risk_projects} met hoog risico`} />
        <Stat label="Capaciteitstekort" value={shortage === null ? "Nog niet bepaald" : fmtHours(Math.max(0, shortage))} unknown={shortage === null} tone={shortage && shortage > 0 ? "bad" : undefined} />
        <Stat label="Investering benodigd / beschikbaar" value={d.fin ? <span className="text-[17px]">{fmtEuro(k.budget?.required, "?")} / {fmtEuro(k.budget?.available, "?")}</span> : "Afgeschermd"} unknown={!d.fin} />
      </section>
      <section className="mt-8" aria-labelledby="res">
        <h2 id="res" className="mb-3 text-lg font-semibold">Resultaten per strategische pijler</h2>
        <Card><table className="w-full text-sm"><caption className="sr-only">Pijlers</caption>
          <thead className="bg-surface-muted text-left text-[12px] text-muted"><tr>{["Pijler", "Volwassenheid", "Voortgang", "Projecten", "Risico", "Laatste update"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{d.pillars.map((p) => (
            <tr key={p.id} className="border-t border-line">
              <td className="px-4 py-3"><Link href={`/pijlers/${p.number}`} className="font-medium hover:underline">{p.number}. {p.title}</Link></td>
              <td className="px-4"><Maturity level={p.maturity_current} /></td>
              <td className="num px-4">{fmtPct(p.progress, "Onbekend")}</td>
              <td className="num px-4">{p.active_projects} actief</td>
              <td className="px-4">{p.max_risk === null ? <span className="text-subtle">Geen open</span> : <Badge tone={p.max_risk >= 15 ? "bad" : p.max_risk >= 8 ? "warn" : "ok"}>{p.max_risk >= 15 ? "Hoog" : p.max_risk >= 8 ? "Midden" : "Laag"}</Badge>}</td>
              <td className="px-4 text-muted">{fmtDate(p.last_update)}</td>
            </tr>))}</tbody></table></Card>
      </section>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card><CardHeader title="Belangrijkste risico's" /><CardBody>
          {d.charts.topRisks.length === 0 ? <p className="text-sm text-muted">Nog geen risico&apos;s geregistreerd.</p> : <ul className="space-y-2 text-sm">{d.charts.topRisks.map((r) => <li key={r.id} className="flex justify-between gap-2"><span>{r.title}</span><Badge tone={r.score >= 15 ? "bad" : "warn"}>{r.score}</Badge></li>)}</ul>}
        </CardBody></Card>
        <Card><CardHeader title="Besluitvorming gevraagd" /><CardBody>
          {d.charts.needsDecision.length === 0 ? <p className="text-sm text-muted">Geen openstaande besluiten.</p> : <ul className="space-y-1.5 text-sm">{d.charts.needsDecision.map((x) => <li key={x.id}><Link className="hover:underline" href={x.href}>{x.label}</Link></li>)}</ul>}
        </CardBody></Card>
        <Card><CardHeader title="Noodzakelijk, onvoldoende middelen" /><CardBody>
          {d.charts.insufficient.length === 0 ? <p className="text-sm text-muted">Nog niet in beeld (haalbaarheid nog niet beoordeeld).</p> : <ul className="space-y-1.5 text-sm">{d.charts.insufficient.map((t) => <li key={t.id}>{t.code} {t.title} <span className="text-bad">– {t.reasons.join(", ").toLowerCase()}</span></li>)}</ul>}
        </CardBody></Card>
        <Card><CardHeader title="Bewust uitgesteld of afgewezen" /><CardBody>
          {d.postponed.length === 0 ? <p className="text-sm text-muted">Geen.</p> : <ul className="space-y-1.5 text-sm">{d.postponed.map((x) => <li key={x.id}><StatusBadge status={x.outcome} /> {x.subject}{x.rationale && <span className="text-muted"> – {x.rationale}</span>}</li>)}</ul>}
        </CardBody></Card>
        <Card className="md:col-span-2"><CardHeader title="KPI's" /><CardBody>
          <ul className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">{d.kpiList.map((x) => <li key={x.id} className="flex justify-between gap-2"><span>{x.name}</span><span className="num text-muted">{x.latest === null ? "onbekend" : `${x.latest}${x.unit ? ` ${x.unit}` : ""}`} / {x.target_value ?? "–"}</span></li>)}</ul>
        </CardBody></Card>
      </div>
      <p className="mt-6 text-[12px] text-subtle">Onbekende waarden zijn nog niet vastgesteld; zij worden niet als nul weergegeven.</p>
    </div>
  );
}
