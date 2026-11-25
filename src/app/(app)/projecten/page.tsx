"use client";
import { AsyncPage } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { listProjects } from "@/server/queries/projects";
import { lookups } from "@/server/queries/topics";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog } from "@/components/ui/dialog";
import { ProjectForm } from "@/components/projects/project-form";
import { ProjectList } from "@/components/projects/project-list";
import { ExportButtons } from "@/components/common/export-buttons";

export default function ProjectsPage() {
  return <AsyncPage render={async () => {
    const d = await db(async (x) => ({ rows: await listProjects(x), lk: await lookups(x) }));
    return (
      <>
        <PageHeader title="Projecten & initiatieven" crumbs={[{ label: "Overzicht" }, { label: "Projecten & initiatieven" }]}
          description="Lopende projecten en initiatieven, gekoppeld aan pijlers en onderwerpen. Het werk zelf wordt bijgehouden in Planner."
          actions={<><ExportButtons report="portfolio" /><Dialog trigger="Nieuw project / initiatief" triggerVariant="primary" title="Nieuw project of initiatief" wide><ProjectForm lookups={d.lk} /></Dialog></>} />
        <ProjectList rows={d.rows} pillars={d.lk.pillars} />
      </>
    );
  }} />;
}
