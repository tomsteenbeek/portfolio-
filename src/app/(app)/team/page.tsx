"use client";
import Link from "next/link";
import { AsyncPage } from "@/components/async-page";
import { db } from "@/lib/auth/current-user";
import { listTeam } from "@/server/queries/team";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MemberForm, ToggleActive } from "@/components/team/member-form";
import { OWNER_NO_CAPACITY, OWNER_NO_PERSON } from "@/lib/domain";

export default function TeamPage() {
  return <AsyncPage render={async () => {
    const d = await db(async (x) => {
      const [team, special] = await Promise.all([
        listTeam(x),
        x.one<{ cap: number; none: number; open: number }>(
          `select count(*) filter (where owner_name = $2)::int as cap, count(*) filter (where owner_name = $1)::int as none,
                  count(*) filter (where coalesce(owner_name,'') = '')::int as open
             from topics where archived_at is null and status not in ('Samengevoegd','Gesplitst')`, [OWNER_NO_PERSON, OWNER_NO_CAPACITY]),
      ]);
      return { team, special };
    });
    const groups = [
      { title: "Team", rows: d.team.filter((m) => m.is_active && m.kind === "Vast") },
      { title: "Inhuur", rows: d.team.filter((m) => m.is_active && m.kind === "Inhuur") },
      { title: "Inactief", rows: d.team.filter((m) => !m.is_active) },
    ].filter((g) => g.rows.length);
    const max = Math.max(1, ...d.team.map((m) => m.topics));
    return (
      <>
        <PageHeader title="Team" crumbs={[{ label: "Overzicht" }, { label: "Team" }]}
          description="Teamleden die je als eigenaar van een onderwerp of KPI, of als trekker van een project kunt kiezen."
          actions={<Dialog trigger="Teamlid toevoegen" triggerVariant="primary" title="Teamlid toevoegen" wide><MemberForm /></Dialog>} />
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          {[{ l: OWNER_NO_CAPACITY, n: d.special?.cap ?? 0 }, { l: OWNER_NO_PERSON, n: d.special?.none ?? 0 }, { l: "Eigenaar nog niet bepaald", n: d.special?.open ?? 0 }].map((x) => (
            <Link key={x.l} href={`/onderwerpen`} className="rounded-lg border border-line bg-surface px-4 py-3 shadow-card hover:border-line-strong">
              <div className="text-[12px] text-muted">{x.l}</div><div className="num text-[22px] font-semibold">{x.n}</div><div className="text-[12px] text-muted">onderwerpen</div>
            </Link>
          ))}
        </div>
        {d.team.length === 0 ? <Card><EmptyState title="Nog geen teamleden" description="Voeg teamleden toe; daarna kun je ze kiezen als eigenaar of trekker." /></Card> :
          groups.map((g) => (
            <Card key={g.title} className="mb-4">
              <CardHeader title={`${g.title} (${g.rows.length})`} />
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]"><caption className="sr-only">{g.title}</caption>
                  <thead className="bg-surface-muted text-left text-[12px] text-muted"><tr>
                    <th className="px-4 py-2 font-medium">Naam</th><th className="px-4 py-2 font-medium">Functie / rol</th>
                    <th className="w-64 px-4 py-2 font-medium">Eigenaar van onderwerpen</th><th className="px-4 py-2 font-medium">Projecten (trekker)</th>
                    <th className="px-4 py-2 font-medium">KPI&apos;s</th><th className="px-4 py-2"><span className="sr-only">Acties</span></th></tr></thead>
                  <tbody>{g.rows.map((m) => (
                    <tr key={m.id} className="border-t border-line align-middle">
                      <td className="px-4 py-2 font-medium"><Link href={`/onderwerpen?q=${encodeURIComponent(m.name)}`} className="hover:text-primary hover:underline">{m.name}</Link>
                        {m.kind === "Inhuur" && <Badge className="ml-2">Inhuur</Badge>}</td>
                      <td className="px-4 py-2 text-muted">{m.function_title ?? "–"}</td>
                      <td className="px-4 py-2"><span className="flex items-center gap-2">
                        <span className="block h-2.5 w-40" aria-hidden><span className="block h-full rounded-r-[4px] bg-[var(--chart-1)]" style={{ width: `${(m.topics / max) * 100}%`, minWidth: m.topics ? 4 : 0 }} /></span>
                        <span className="num">{m.topics}</span></span></td>
                      <td className="num px-4 py-2">{m.projects}{m.projects_running ? <span className="text-muted"> ({m.projects_running} lopend)</span> : ""}</td>
                      <td className="num px-4 py-2">{m.kpis}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Dialog trigger="Bewerken" triggerSize="sm" triggerVariant="ghost" title={`${m.name} bewerken`} wide><MemberForm m={m} /></Dialog>
                        <ToggleActive m={m} />
                      </td>
                    </tr>))}</tbody>
                </table>
              </div>
            </Card>
          ))}
      </>
    );
  }} />;
}
