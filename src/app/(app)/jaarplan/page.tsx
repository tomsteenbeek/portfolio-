"use client";
import { AsyncPage, spObject } from "@/components/async-page";
import Link from "next/link";
import { ExportButtons } from "@/components/common/export-buttons";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { getPlan } from "@/server/queries/annual-plan";
import { getSettings } from "@/server/queries/dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog } from "@/components/ui/dialog";
import { AddItemForm, NewPlanForm, RemoveItem, SectionsForm, StatusAndVersion } from "@/components/annual-plan/plan-client";
import { ANNUAL_PLAN_SECTIONS } from "@/lib/annual-plan";
import { fmtDateTime, fmtEuro, fmtHours } from "@/lib/format";
import { PrintButton } from "@/components/common/print-button";

export default function AnnualPlanPage() {
  return <AsyncPage render={async (__sp) => {
    const searchParams = Promise.resolve(spObject(__sp));

  const sp = await searchParams;
  const d = await db(async (x, user) => {
    const s = await getSettings(x);
    const year = Number(sp.jaar ?? s["jaarplan.actief_jaar"] ?? 2027);
    const fin = can(user.roles, "finance.view");
    return { year, fin, user, ...(await getPlan(x, year, fin)) };
  });
  const edit = can(d.user.roles, "annualplan.edit");
  const yearNav = (
    <nav aria-label="Jaar" className="flex flex-wrap gap-1 no-print">
      {d.years.map((y) => <Link key={y.year} href={`/jaarplan?jaar=${y.year}`} aria-current={y.year === d.year ? "page" : undefined}
        className={`rounded-md border px-3 py-1.5 text-sm ${y.year === d.year ? "border-primary bg-primary-soft font-medium text-primary" : "border-line bg-surface hover:bg-surface-muted"}`}>{y.year}</Link>)}
      {edit && <Dialog trigger="Nieuw jaar" title="Nieuw jaarplan"><NewPlanForm defaultYear={(d.years.at(-1)?.year ?? d.year) + 1} /></Dialog>}
    </nav>
  );
  if (!d.plan) {
    return (<><PageHeader title={`Jaarplan ${d.year}`} crumbs={[{ label: "Strategie" }, { label: "Jaarplan" }]} actions={yearNav} />
      <Card><EmptyState title={`Er is nog geen jaarplan voor ${d.year}`} action={edit ? <NewPlanForm defaultYear={d.year} /> : undefined} /></Card></>);
  }
  const { plan } = d;
  const hours = d.items.reduce((s, i) => s + (i.hours ?? 0), 0);
  const hoursKnown = d.items.filter((i) => i.hours !== null).length;
  const budget = d.items.reduce((s, i) => s + (i.budget ?? 0), 0);
  const section = (k: string) => plan.sections[k] ? <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{plan.sections[k]}</p> : <p className="text-sm text-subtle">Nog niet ingevuld.</p>;
  const b = (kind: string) => d.budgets ? d.budgets.filter((x) => x.kind === kind).reduce((s, x) => s + x.total, 0) : null;
  return (
    <>
      <PageHeader title={plan.title} description={plan.theme ?? undefined} crumbs={[{ label: "Strategie" }, { label: "Jaarplan" }, { label: String(plan.year) }]}
        meta={<><StatusBadge status={plan.status} /><Badge>Laatst gewijzigd {fmtDateTime(plan.updated_at)}</Badge><Badge>{d.versions.length} versie(s)</Badge></>}
        actions={<>{yearNav}<PrintButton /><ExportButtons report="jaarplan" year={plan.year} />
          {edit && <Link href={sp.bewerken ? `/jaarplan?jaar=${plan.year}` : `/jaarplan?jaar=${plan.year}&bewerken=1`} className="inline-flex h-9 items-center rounded-md bg-primary px-3.5 text-sm text-white no-print">{sp.bewerken ? "Klaar met bewerken" : "Teksten bewerken"}</Link>}</>} />
      {edit && <Card className="mb-4 no-print"><CardBody><StatusAndVersion id={plan.id} status={plan.status} /></CardBody></Card>}
      {sp.bewerken && edit ? <Card><CardBody><SectionsForm plan={plan} /></CardBody></Card> : (
        <div className="space-y-4">
          <Card><CardHeader title="1. Managementsamenvatting" /><CardBody>{section("managementsamenvatting")}</CardBody></Card>
          <Card><CardHeader title="2. Organisatorische context" /><CardBody>{section("context")}</CardBody></Card>
          <Card><CardHeader title="3. Strategische doelstellingen" /><CardBody>{section("doelstellingen")}</CardBody></Card>
          <Card><CardHeader title="4. Zeven strategische pijlers en gewenste resultaten" /><CardBody className="space-y-4">
            {section("resultaten")}
            <div className="grid gap-4 md:grid-cols-2">{d.pillars.map((p) => (
              <div key={p.id} className="rounded-md border border-line p-3">
                <h3 className="font-semibold"><Link href={`/pijlers/detail?nr=${p.number}`} className="hover:underline">Pijler {p.number} · {p.title}</Link></h3>
                <p className="mt-1 text-[13px] text-muted">{p.objective}</p>
                {p.ambition_year && <p className="mt-1 text-[13px]"><strong>Ambitie {plan.year}:</strong> {p.ambition_year}</p>}
                <ul className="mt-1.5 list-disc pl-5 text-[13px]">{p.results.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </div>))}</div>
          </CardBody></Card>
          <Card><CardHeader title="5. Geselecteerde programma's, projecten en initiatieven" description={`${d.items.length} initiatieven`} /><CardBody className="space-y-4">
            {d.items.length === 0 ? <p className="text-sm text-muted">Nog geen initiatieven geselecteerd. Voeg initiatieven toe vanuit het geprioriteerde portfolio.</p> : (
              <table className="w-full text-[13px]"><caption className="sr-only">Initiatieven in jaarplan</caption>
                <thead className="text-left text-[12px] text-muted"><tr><th className="py-1">Initiatief</th><th>Type</th><th>Pijler</th><th>Prioriteit</th><th>Capaciteit</th>{d.fin && <th>Budget</th>}<th /></tr></thead>
                <tbody>{d.items.map((i) => (
                  <tr key={i.id} className="border-t border-line">
                    <td className="py-1.5"><Link className="hover:underline" href={i.kind === "Project" ? `/projecten/detail?id=${i.ref_id}` : i.kind === "Onderwerp" ? `/onderwerpen/detail?id=${i.ref_id}` : "/jaarplan"}>{i.label}</Link>{i.flags && <Badge tone="accent" className="ml-1">Verplicht</Badge>}{i.note && <div className="text-[12px] text-muted">{i.note}</div>}</td>
                    <td>{i.kind}</td><td>{i.pillar ? `Pijler ${i.pillar}` : "—"}</td><td><PriorityBadge category={i.priority} /></td>
                    <td className="num">{fmtHours(i.hours, "Onbekend")}</td>{d.fin && <td className="num">{fmtEuro(i.budget, "Onbekend")}</td>}
                    <td className="text-right">{edit && <RemoveItem id={i.id} />}</td>
                  </tr>))}</tbody>
              </table>
            )}
            {edit && <div className="no-print"><AddItemForm planId={plan.id} candidates={d.candidates} /></div>}
          </CardBody></Card>
          <Card><CardHeader title="6. Reguliere werkzaamheden" /><CardBody className="space-y-2">
            {section("regulier")}
            <p className="text-sm">Basispakket: {d.recurring?.n ?? 0} structurele werkzaamheden, {fmtHours(d.recurring?.hours ?? null, "uren nog niet geraamd")} per jaar (raming bij {d.recurring?.known ?? 0}).</p>
          </CardBody></Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader title="7. Capaciteitsbehoefte" /><CardBody className="space-y-3">
              {section("capaciteit")}
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Initiatieven" value={hoursKnown ? fmtHours(hours) : "Onbekend"} unknown={!hoursKnown} sub={`raming bij ${hoursKnown}/${d.items.length}`} />
                <Stat label="Regulier" value={fmtHours(d.recurring?.hours ?? null, "Onbekend")} unknown={d.recurring?.hours == null} />
                <Stat label="Beschikbaar" value={fmtHours(d.capacity?.available ?? null, "Onbekend")} unknown={d.capacity?.available == null} />
              </div>
            </CardBody></Card>
            <Card><CardHeader title="8. Financiële behoefte" /><CardBody className="space-y-3">
              {section("financien")}
              {d.fin ? <div className="grid grid-cols-3 gap-2">
                <Stat label="Initiatieven" value={d.items.some((i) => i.budget !== null) ? fmtEuro(budget) : "Onbekend"} unknown={!d.items.some((i) => i.budget !== null)} />
                <Stat label="Benodigd (begroting)" value={fmtEuro(b("Benodigd") || null, "Onbekend")} unknown={!b("Benodigd")} />
                <Stat label="Beschikbaar" value={fmtEuro(b("Beschikbaar") || null, "Onbekend")} unknown={!b("Beschikbaar")} />
              </div> : <p className="text-sm text-muted">Financiële cijfers zijn afgeschermd.</p>}
            </CardBody></Card>
          </div>
          <Card><CardHeader title="9. Belangrijkste risico's" /><CardBody className="space-y-2">
            {section("risicos")}
            <ul className="text-sm">{d.risks.map((r) => <li key={r.id}>{r.number} {r.title} <span className="text-muted">({r.category}{r.score ? `, score ${r.score}` : ""})</span></li>)}{!d.risks.length && <li className="text-muted">Geen open risico&apos;s geregistreerd.</li>}</ul>
          </CardBody></Card>
          <Card><CardHeader title="10. Benodigde besluitvorming" /><CardBody className="space-y-2">
            {section("besluitvorming")}
            <ul className="text-sm">{d.decisions.map((x) => <li key={x.id}>{x.number} {x.subject}{x.decision_body ? <span className="text-muted"> – {x.decision_body}</span> : null}</li>)}{!d.decisions.length && <li className="text-muted">Geen openstaande besluiten.</li>}</ul>
          </CardBody></Card>
          <Card className="no-print"><CardHeader title="Versies" /><ul className="divide-y divide-line text-sm">
            {d.versions.map((v) => <li key={v.id} className="flex justify-between px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/jaarplan/versie?id=${v.id}`}>Versie {v.version} – {v.status}{v.note ? `: ${v.note}` : ""}</Link><span className="text-muted">{fmtDateTime(v.created_at)} · {v.by_name}</span></li>)}
            {!d.versions.length && <li className="px-5 py-3 text-muted">Nog geen versies. Een versie wordt vastgelegd bij iedere statuswijziging of handmatig.</li>}</ul></Card>
          <p className="text-[12px] text-subtle">Secties zonder tekst worden niet automatisch gevuld. Overzichten (pijlers, initiatieven, risico&apos;s, besluiten) zijn live samengesteld; een versie legt de stand vast.</p>
        </div>
      )}
    </>
  );

  }} />;
}
