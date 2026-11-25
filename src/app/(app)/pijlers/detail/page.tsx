"use client";
import Link from "next/link";
import { AsyncPage, notFound } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { pillarDetail } from "@/server/queries/overview";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Text } from "@/components/ui/dl";
import { PillarForm } from "@/components/pillar-form";
import { PrintButton } from "@/components/common/print-button";
import { fmtDate, fmtNumber } from "@/lib/format";
import { ExternalLink, Plus } from "lucide-react";
import { OwnerLabel } from "@/components/team/owner-select";
import { OWNER_SPECIAL, QUARTERS } from "@/lib/domain";

export default function PillarPage() {
  return <AsyncPage render={async (sp) => {
    const nr = Number(sp.get("nr"));
    if (!Number.isInteger(nr)) notFound();
    const d = await db((x) => pillarDetail(x, nr));
    if (!d) notFound();
    const { p } = d;
    const owned = d.topics.filter((t) => t.owner_name && !(OWNER_SPECIAL as readonly string[]).includes(t.owner_name)).length;
    return (
      <>
        <PageHeader title={<><span className="font-normal text-muted">Pijler {p.number} · </span>{p.title}</>} description={p.objective}
          crumbs={[{ label: "Dashboard", href: "/" }, { label: `Pijler ${p.number}` }]}
          actions={<><PrintButton /><Dialog trigger="Pijler bewerken" title={`Pijler ${p.number} bewerken`} wide><PillarForm p={p} results={d.results.map((r) => r.text)} /></Dialog></>} />

        <div className="mb-4 h-1.5 rounded-full" style={{ background: `var(--pillar-${p.number})` }} aria-hidden />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader title="Gewenste resultaten" /><CardBody>
            <ul className="list-disc space-y-1 pl-5 text-sm">{d.results.map((r, i) => <li key={i}>{r.text}</li>)}</ul>
          </CardBody></Card>
          <Card><CardHeader title="Meerjarenambitie" /><CardBody className="text-sm whitespace-pre-wrap"><Text value={p.ambition_multi_year} />{p.description && <p className="mt-3 text-muted">{p.description}</p>}</CardBody></Card>
        </div>

        <Card className="mt-4">
          <CardHeader title="Ambitie 2027" description={p.ambition_year ?? "Samenvatting nog niet ingevuld"} />
          <ol className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
            {QUARTERS.map((q, i) => {
              const v = p[`ambition_${q}`];
              return (
                <li key={q} className={`relative rounded-lg border p-4 pt-5 ${v ? "border-line bg-surface-muted/60" : "border-dashed border-line"}`}>
                  <span className="absolute -top-2.5 left-3 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: `var(--pillar-${p.number})` }}>Q{i + 1} 2027</span>
                  {v ? <p className="text-sm whitespace-pre-wrap">{v}</p> : <p className="text-[13px] text-subtle">Nog in te vullen via Pijler bewerken</p>}
                </li>
              );
            })}
          </ol>
        </Card>

        <Card className="mt-4">
          <CardHeader title={`Onderwerpen (${d.topics.length})`} description={`${owned} met eigenaar · onderwerpen worden gaandeweg aangescherpt en aangevuld`}
            actions={<LinkButton size="sm" href={`/onderwerpen/nieuw?pijler=${p.number}`}><Plus className="h-4 w-4" aria-hidden />Onderwerp</LinkButton>} />
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]"><caption className="sr-only">Onderwerpen</caption>
              <thead className="bg-surface-muted text-left text-[12px] text-muted"><tr>
                <th className="px-4 py-2 font-medium">ID</th><th className="px-4 py-2 font-medium">Onderwerp</th><th className="px-4 py-2 font-medium">Eigenaar</th>
                <th className="px-4 py-2 font-medium">Wat valt eronder</th><th className="px-4 py-2 font-medium">KPI&apos;s</th><th className="px-4 py-2 font-medium">Projecten</th></tr></thead>
              <tbody>{d.topics.map((t) => (
                <tr key={t.id} className="border-t border-line align-top">
                  <td className="num px-4 py-2 text-muted">{t.code}</td>
                  <td className="px-4 py-2"><Link href={`/onderwerpen/detail?id=${t.id}`} className="font-medium hover:text-primary hover:underline">{t.title}</Link>
                    {t.description && <p className="line-clamp-2 text-[12px] text-muted">{t.description}</p>}</td>
                  <td className="px-4 py-2"><OwnerLabel name={t.owner_name} empty="–" /></td>
                  <td className="px-4 py-2 text-muted"><span className="line-clamp-2">{t.scope ?? <span className="text-subtle">Nog aan te vullen</span>}</span></td>
                  <td className="num px-4 py-2">{t.kpi_count || <span className="text-subtle">–</span>}</td>
                  <td className="num px-4 py-2">{t.project_count || <span className="text-subtle">–</span>}</td>
                </tr>))}</tbody>
            </table>
          </div>
        </Card>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card><CardHeader title={`KPI's (${d.kpis.length})`} actions={<LinkButton size="sm" href="/kpis"><Plus className="h-4 w-4" aria-hidden />KPI</LinkButton>} />
            {d.kpis.length === 0 ? <p className="px-5 py-4 text-sm text-muted">Nog geen KPI&apos;s gekoppeld.</p> : (
              <ul className="divide-y divide-line text-sm">{d.kpis.map((k) => (
                <li key={k.id} className="px-5 py-2.5">
                  <Link href={`/kpis/detail?id=${k.id}`} className="font-medium hover:text-primary hover:underline">{k.name}</Link>
                  <div className="text-[12px] text-muted">
                    {k.topic && <>{k.topic} · </>}Actueel {k.latest === null ? "onbekend" : fmtNumber(k.latest)}{k.unit ? ` ${k.unit}` : ""} · streef {k.target_value === null ? "nog niet vastgesteld" : fmtNumber(k.target_value)}
                    {k.owner_name && <> · {k.owner_name}</>}
                  </div>
                </li>))}</ul>
            )}
          </Card>
          <Card><CardHeader title={`Projecten & initiatieven (${d.projects.length})`} description="Bijgehouden in Planner" actions={<LinkButton size="sm" href="/projecten"><Plus className="h-4 w-4" aria-hidden />Project</LinkButton>} />
            {d.projects.length === 0 ? <p className="px-5 py-4 text-sm text-muted">Nog geen projecten of initiatieven gekoppeld.</p> : (
              <ul className="divide-y divide-line text-sm">{d.projects.map((j) => (
                <li key={j.id} className="flex items-start justify-between gap-3 px-5 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/projecten/detail?id=${j.id}`} className="font-medium hover:text-primary hover:underline">{j.name}</Link>
                    <div className="text-[12px] text-muted"><OwnerLabel name={j.lead_name} empty="Geen trekker" />{j.end_date ? ` · t/m ${fmtDate(j.end_date)}` : ""}{j.topics.length ? ` · ${j.topics.join(", ")}` : ""}</div>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    {j.planner_url && <a href={j.planner_url} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label={`${j.name} openen in Planner`}><ExternalLink className="h-4 w-4" /></a>}
                    <StatusBadge status={j.status} />
                  </span>
                </li>))}</ul>
            )}
          </Card>
        </div>
      </>
    );
  }} />;
}
