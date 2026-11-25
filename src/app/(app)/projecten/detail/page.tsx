"use client";
import Link from "next/link";
import { z } from "zod";
import { ExternalLink } from "lucide-react";
import { AsyncPage, notFound } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { getProject } from "@/server/queries/projects";
import { lookups } from "@/server/queries/topics";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { DescriptionList, Text } from "@/components/ui/dl";
import { ProjectForm } from "@/components/projects/project-form";
import { ArchiveProject } from "@/components/projects/archive-project";
import { buttonClasses } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";

export default function ProjectPage() {
  return <AsyncPage render={async (sp) => {
    const id = sp.get("id") ?? "";
    if (!z.string().uuid().safeParse(id).success) notFound();
    const d = await db(async (x) => ({ p: await getProject(x, id), lk: await lookups(x) }));
    if (!d.p) notFound();
    const p = d.p;
    return (
      <>
        <PageHeader title={p.name} description={p.description ?? undefined} meta={<StatusBadge status={p.status} />}
          crumbs={[{ label: "Projecten & initiatieven", href: "/projecten" }, { label: p.name.length > 40 ? p.name.slice(0, 40) + "…" : p.name }]}
          actions={<>{p.planner_url && <a href={p.planner_url} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary")}>Openen in Planner<ExternalLink className="h-4 w-4" aria-hidden /></a>}<ArchiveProject id={p.id} /></>} />
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="space-y-4">
            <Card><CardHeader title="Kenmerken" /><CardBody>
              <DescriptionList cols={1} items={[
                { label: "Hoofdpijler", value: <Link className="text-primary hover:underline" href={`/pijlers/detail?nr=${p.pillar_number}`}>{p.pillar_number}. {p.pillar_title}</Link> },
                { label: "Draagt ook bij aan", value: p.secondary_pillars.length ? p.secondary_pillars.map((n) => `Pijler ${n}`).join(", ") : <Text value={null} empty="–" /> },
                { label: "Trekker", value: <Text value={p.lead_name} empty="Nog niet bepaald" /> },
                { label: "Periode", value: `${fmtDate(p.start_date, "?")} – ${fmtDate(p.end_date, "?")}` },
              ]} />
            </CardBody></Card>
            <Card><CardHeader title={`Onderwerpen (${p.topics.length})`} />
              {p.topics.length === 0 ? <p className="px-5 py-4 text-sm text-muted">Nog niet gekoppeld.</p> : (
                <ul className="divide-y divide-line text-sm">{p.topics.map((t) => <li key={t.id} className="px-5 py-2"><Link className="hover:text-primary hover:underline" href={`/onderwerpen/detail?id=${t.id}`}><span className="num text-muted">{t.code}</span> {t.title}</Link></li>)}</ul>
              )}
            </Card>
          </div>
          <Card><CardHeader title="Bewerken" /><CardBody><ProjectForm p={p} lookups={d.lk} /></CardBody></Card>
        </div>
      </>
    );
  }} />;
}
