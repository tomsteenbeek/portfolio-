"use client";
import { AsyncPage } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { listProjects } from "@/server/queries/projects";
import { PageHeader } from "@/components/ui/page-header";
import { Kanban } from "@/components/projects/kanban";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";

export default function KanbanPage() {
  return <AsyncPage render={async () => {

  const rows = await db((x) => listProjects(x));
  return (
    <>
      <PageHeader title="Kanbanbord" crumbs={[{ label: "Portfolio" }, { label: "Kanbanbord" }]}
        description="Sleep projecten tussen statussen, of gebruik het statusmenu op de kaart. Wijzigingen worden gelogd; rechten worden per project gecontroleerd."
        actions={<LinkButton href="/projecten">Tabelweergave</LinkButton>} />
      {rows.length === 0 ? <Card><EmptyState title="Nog geen projecten" description="Projecten verschijnen hier zodra ze zijn aangemaakt." /></Card> : <Kanban rows={rows} />}
    </>
  );

  }} />;
}
