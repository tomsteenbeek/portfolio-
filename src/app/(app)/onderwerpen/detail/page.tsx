"use client";
import Link from "next/link";
import { z } from "zod";
import { ExternalLink, Plus } from "lucide-react";
import { AsyncPage, notFound } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { auditFor, getTopic, lookups } from "@/server/queries/topics";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TabLinks } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { LinkButton } from "@/components/ui/button";
import { TopicForm } from "@/components/topics/topic-form";
import { ProjectForm } from "@/components/projects/project-form";
import { Comments } from "@/components/common/comments";
import { History } from "@/components/common/history";
import { fmtDate, fmtDateTime, fmtNumber } from "@/lib/format";

export default function TopicPage() {
  return <AsyncPage render={async (sp) => {
    const id = sp.get("id") ?? "";
    const tab = sp.get("tab") ?? "overzicht";
    if (!z.string().uuid().safeParse(id).success) notFound();
    const d = await db(async (x) => {
      const t = await getTopic(x, id);
      if (!t) return null;
      return { ...t, lk: await lookups(x), history: tab === "historie" ? await auditFor(x, "topics", [id], 60) : [] };
    });
    if (!d) notFound();
    const { topic: t } = d;
    const base = `/onderwerpen/detail?id=${id}`;
    const block = (title: string, value: string | null, empty = "Nog aan te vullen") => (
      <div><h3 className="text-[12px] font-medium uppercase tracking-wide text-muted">{title}</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm">{value ? value : <span className="text-subtle">{empty}</span>}</p></div>
    );
    return (
      <>
        <PageHeader title={<><span className="num font-normal text-muted">{t.code}</span> {t.title}</>}
          crumbs={[{ label: "Onderwerpen", href: "/onderwerpen" }, { label: `Pijler ${t.pillar_number}`, href: `/pijlers/detail?nr=${t.pillar_number}` }, { label: t.code }]}
          meta={<span className="text-[13px] text-muted">Eigenaar: <strong className="text-ink">{t.owner_name ?? "nog niet bepaald"}</strong> · bijgewerkt {fmtDateTime(t.updated_at)}</span>}
          actions={<LinkButton href={`${base}&tab=bewerken`} variant="primary">Aanvullen / bewerken</LinkButton>} />
        <TabLinks base={base} active={tab} tabs={[{ key: "overzicht", label: "Overzicht" }, { key: "bewerken", label: "Bewerken" },
          { key: "opmerkingen", label: "Opmerkingen", count: d.comments.length }, { key: "historie", label: "Historie" }]} />

        {tab === "overzicht" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
            <Card><CardBody className="space-y-5">
              {block("Omschrijving", t.description)}
              {block("Wat valt eronder", t.scope)}
              {block("Doel / beoogd resultaat", t.intended_result)}
              {block("Aandachtspunten en open vragen", t.remarks, "Geen")}
              <p className="text-[13px] text-muted">Pijler: <Link className="text-primary hover:underline" href={`/pijlers/detail?nr=${t.pillar_number}`}>{t.pillar_number}. {t.pillar_title}</Link></p>
            </CardBody></Card>
            <div className="space-y-4">
              <Card><CardHeader title={`KPI's (${d.kpis.length})`} actions={<LinkButton size="sm" href="/kpis"><Plus className="h-4 w-4" aria-hidden />KPI</LinkButton>} />
                {d.kpis.length === 0 ? <p className="px-5 py-4 text-sm text-muted">Nog geen KPI gekoppeld. Maak een KPI aan en kies dit onderwerp.</p> : (
                  <ul className="divide-y divide-line text-sm">{d.kpis.map((k) => (
                    <li key={k.id} className="px-5 py-2.5"><Link className="font-medium hover:text-primary hover:underline" href={`/kpis/detail?id=${k.id}`}>{k.name}</Link>
                      <div className="text-[12px] text-muted">Actueel {k.latest === null ? "onbekend" : fmtNumber(k.latest)}{k.unit ? ` ${k.unit}` : ""} · streef {k.target_value === null ? "–" : fmtNumber(k.target_value)}{k.owner_name ? ` · ${k.owner_name}` : ""}</div></li>))}</ul>
                )}
              </Card>
              <Card><CardHeader title={`Projecten & initiatieven (${d.projects.length})`}
                actions={<Dialog trigger={<><Plus className="h-4 w-4" aria-hidden />Project</>} triggerSize="sm" title="Nieuw project of initiatief" wide><ProjectForm lookups={d.lk} defaultTopic={id} /></Dialog>} />
                {d.projects.length === 0 ? <p className="px-5 py-4 text-sm text-muted">Nog geen projecten of initiatieven gekoppeld.</p> : (
                  <ul className="divide-y divide-line text-sm">{d.projects.map((j) => (
                    <li key={j.id} className="flex items-start justify-between gap-2 px-5 py-2.5">
                      <div><Link className="font-medium hover:text-primary hover:underline" href={`/projecten/detail?id=${j.id}`}>{j.name}</Link>
                        <div className="text-[12px] text-muted">{j.lead_name ?? "Geen trekker"}{j.end_date ? ` · t/m ${fmtDate(j.end_date)}` : ""}</div></div>
                      <span className="flex items-center gap-2">{j.planner_url && <a href={j.planner_url} target="_blank" rel="noopener noreferrer" aria-label="Openen in Planner" className="text-primary"><ExternalLink className="h-4 w-4" /></a>}<StatusBadge status={j.status} /></span>
                    </li>))}</ul>
                )}
              </Card>
            </div>
          </div>
        )}
        {tab === "bewerken" && <Card><CardBody><TopicForm topic={t} lookups={d.lk} /></CardBody></Card>}
        {tab === "opmerkingen" && <Card><CardBody><Comments entityType="topic" entityId={id} comments={d.comments} canAdd /></CardBody></Card>}
        {tab === "historie" && <Card><CardHeader title="Wijzigingshistorie" /><CardBody><History entries={d.history} allowed /></CardBody></Card>}
      </>
    );
  }} />;
}
