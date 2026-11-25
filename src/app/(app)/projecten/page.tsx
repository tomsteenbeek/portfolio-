import Link from "next/link";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { listProjects } from "@/server/queries/projects";
import { lookups } from "@/server/queries/topics";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ProjectForm } from "@/components/projects/project-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PriorityBadge, Rag, StatusBadge, Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { fmtDate, fmtPct } from "@/lib/format";
import { RAG_DIMENSIONS } from "@/lib/domain";

export const metadata = { title: "Projecten" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const d = await db(async (x, user) => ({ rows: await listProjects(x), lk: await lookups(x), user }));
  const rows = sp.status ? d.rows.filter((r) => r.status === sp.status) : d.rows;
  return (
    <>
      <PageHeader title="Projecten" crumbs={[{ label: "Portfolio" }, { label: "Projecten" }]}
        description="Concrete veranderinitiatieven met één primaire pijler. Projecten ontstaan bij voorkeur uit gevalideerde en geprioriteerde onderwerpen."
        actions={<>
          <LinkButton href="/kanban">Kanbanbord</LinkButton>
          <form method="post" action="/api/export/report"><input type="hidden" name="report" value="portfolio" /><button name="format" value="xlsx" className="h-9 rounded-md border border-line-strong bg-surface px-3.5 text-sm hover:bg-surface-muted">Exporteren</button></form>
          {can(d.user.roles, "projects.create") && <Dialog trigger="Nieuw project" triggerVariant="primary" title="Nieuw project" wide><ProjectForm lookups={d.lk} compact /></Dialog>}
        </>} />
      <Card>
        {rows.length === 0 ? <EmptyState title="Nog geen projecten" description="Zet gevalideerde onderwerpen om naar een project via de deepdive of de inventarisatie, of maak direct een project aan." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]"><caption className="sr-only">Projectportfolio</caption>
              <thead className="bg-surface-muted text-left text-[12px] text-muted"><tr>{["Nr.", "Project", "Pijler", "Programma", "Projectleider", "Prioriteit", "Status", "Periode", "Voortgang", "Stoplichten"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="num px-3 py-2 text-muted">{r.number}</td>
                  <td className="px-3 py-2"><Link className="font-medium hover:text-primary hover:underline" href={`/projecten/${r.id}`}>{r.name}</Link>{r.blocked_by.length > 0 && <div className="text-[12px] text-warn">Wacht op {r.blocked_by.join(", ")}</div>}</td>
                  <td className="px-3 py-2 whitespace-nowrap">Pijler {r.pillar_number}</td>
                  <td className="px-3 py-2">{r.program_name ?? "—"}</td>
                  <td className="px-3 py-2">{r.leader_name ?? <span className="text-subtle">—</span>}</td>
                  <td className="px-3 py-2"><PriorityBadge category={r.priority_category} /></td>
                  <td className="px-3 py-2"><StatusBadge status={r.status} />{r.planning_status === "Vastgesteld" && <Badge tone="primary" className="ml-1">Vastgesteld</Badge>}</td>
                  <td className="num px-3 py-2 whitespace-nowrap">{fmtDate(r.start_date)} – {fmtDate(r.end_date)}</td>
                  <td className="num px-3 py-2">{fmtPct(r.progress_pct, "—")}</td>
                  <td className="px-3 py-2"><div className="grid grid-cols-3 gap-x-2 gap-y-0.5">{RAG_DIMENSIONS.map((g) => <Rag key={g.key} label={g.label} value={r[g.key as keyof typeof r] as string | null} />)}</div></td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
