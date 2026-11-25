import Link from "next/link";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { activeModel, listSessions, matrixData } from "@/server/queries/priority";
import { getSettings } from "@/server/queries/dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TabLinks } from "@/components/ui/tabs";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog } from "@/components/ui/dialog";
import { SessionForm } from "@/components/priority/session-form";
import { RubricTable } from "@/components/priority/score-input";
import { PriorityFeasibilityMatrix } from "@/components/priority/matrix";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Prioritering" };

export default async function PriorityPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "sessies" } = await searchParams;
  const d = await db(async (x, user) => ({
    user,
    sessions: await listSessions(x),
    model: await activeModel(x),
    matrix: tab === "matrix" ? await matrixData(x) : [],
    settings: await getSettings(x),
    topics: await x.query<{ id: string; code: string; title: string; pillar_number: number; status: string }>(
      `select t.id, t.code, t.title, p.number as pillar_number, t.status from topics t join pillars p on p.id = t.pillar_id
        where t.archived_at is null and t.status not in ('Samengevoegd','Niet relevant','Gesplitst') order by p.number, string_to_array(t.code,'.')::int[]`),
    users: await x.query<{ id: string; display_name: string }>(
      `select distinct u.id, u.display_name from users u join user_roles ur on ur.user_id = u.id join roles r on r.id = ur.role_id
        where u.is_active and r.code in ('medewerker','teamleider','projectleider') order by u.display_name`),
    projects: await x.query<{ id: string; number: string; name: string }>(`select id, number, name from projects where archived_at is null and status not in ('Afgerond','Geannuleerd') order by number`),
  }));
  const canManage = can(d.user.roles, "priority.sessions");
  return (
    <>
      <PageHeader title="Gezamenlijke prioritering"
        description="Beoordeel inhoudelijke prioriteit eerst, onafhankelijk van capaciteit. Haalbaarheid wordt apart beoordeeld."
        crumbs={[{ label: "Portfolio" }, { label: "Prioritering" }]}
        actions={canManage ? (
          <Dialog trigger="Nieuwe sessie" triggerVariant="primary" title="Prioriteringssessie aanmaken" wide>
            <SessionForm topics={d.topics} users={d.users} projects={d.projects} />
          </Dialog>
        ) : undefined}
      />
      <TabLinks base="/prioritering" active={tab} tabs={[{ key: "sessies", label: "Sessies", count: d.sessions.length }, { key: "matrix", label: "Prioriteit vs haalbaarheid" }, { key: "model", label: `Model (versie ${d.model?.version ?? "?"})` }]} />
      {tab === "sessies" && (
        <Card>
          {d.sessions.length === 0 ? (
            <EmptyState title="Nog geen prioriteringssessies" description={canManage ? "Maak een sessie aan, selecteer onderwerpen en deelnemers en open de sessie voor beoordeling." : "De teamleider maakt sessies aan en nodigt deelnemers uit."} />
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">Prioriteringssessies</caption>
              <thead className="bg-surface-muted text-left text-[12px] text-muted"><tr>{["Sessie", "Status", "Periode", "Model", "Items", "Deelnemers", "Beoordelingen", ""].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {d.sessions.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="px-4 py-2.5"><Link className="font-medium text-primary hover:underline" href={`/prioritering/${s.id}`}>{s.name}</Link>{s.is_member && <Badge tone="info" className="ml-2">Deelnemer</Badge>}</td>
                    <td className="px-4"><StatusBadge status={s.status} /></td>
                    <td className="px-4 num">{fmtDate(s.start_date)} – {fmtDate(s.end_date)}</td>
                    <td className="px-4 num">v{s.version}</td><td className="px-4 num">{s.items}</td><td className="px-4 num">{s.members}</td>
                    <td className="px-4 num">{s.assessments} / {s.items * s.members}</td>
                    <td className="px-4 text-right"><Link className="text-[13px] text-primary hover:underline" href={`/prioritering/${s.id}`}>Openen</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
      {tab === "matrix" && (
        <Card><CardHeader title="Prioriteit versus haalbaarheid" description="Klik op een punt om het initiatief te openen. Verplichte/urgente initiatieven vallen nooit in 'uitstellen'." />
          <CardBody><PriorityFeasibilityMatrix points={d.matrix} pT={Number(d.settings["prioriteit.drempel_matrix"] ?? 60)} fT={Number(d.settings["haalbaarheid.drempel"] ?? 50)} /></CardBody></Card>
      )}
      {tab === "model" && d.model && (
        <Card><CardHeader title={`Gewogen prioriteringsmodel – versie ${d.model.version}`}
          description="PriorityScore = Σ (score / 5 × gewicht). P1 ≥ 80 · P2 60–<80 · P3 40–<60 · P4 < 40 (op de ongeronde score)."
          actions={can(d.user.roles, "priority.model") ? <Link href="/beheer/prioriteringsmodel" className="text-[13px] text-primary hover:underline">Model beheren</Link> : undefined} />
          <CardBody><RubricTable criteria={d.model.criteria} /></CardBody></Card>
      )}
    </>
  );
}
