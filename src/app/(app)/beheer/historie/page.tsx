"use client";
import { AsyncPage, spObject } from "@/components/async-page";
import Link from "next/link";
import { db, requirePermission } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { History } from "@/components/common/history";
import { LinkButton } from "@/components/ui/button";

const TABLES: Record<string, string> = { topics: "Onderwerpen", projects: "Projecten", priority_decisions: "Prioriteringsbesluiten", priority_assessments: "Beoordelingen",
  decisions: "Besluiten", risks: "Risico's", user_roles: "Autorisaties", users: "Gebruikers", settings: "Instellingen", annual_plans: "Jaarplan", priority_criteria: "Prioriteringsmodel",
  pillars: "Pijlers", staffing_positions: "Formatie", topic_assessments: "Deepdive-beoordelingen" };

export default function AuditPage() {
  return <AsyncPage render={async (__sp) => {
    const searchParams = Promise.resolve(spObject(__sp));

  await requirePermission("audit.view");
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.pagina ?? 0) || 0);
  const table = sp.tabel && TABLES[sp.tabel] ? sp.tabel : null;
  const rows = await db((x) => x.query<{ id: number; table_name: string; record_id: string; action: string; changed_fields: string[] | null; changed_at: string; by_name: string | null; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null }>(
    `select a.id, a.table_name, a.record_id, a.action, a.changed_fields, a.changed_at, u.display_name as by_name, a.old_data, a.new_data
       from audit_logs a left join users u on u.id = a.changed_by where ($1::text is null or a.table_name = $1) order by a.id desc limit 51 offset $2`, [table, page * 50]));
  return (
    <>
      <PageHeader title="Wijzigingshistorie" crumbs={[{ label: "Beheer" }, { label: "Wijzigingshistorie" }]}
        description="Auditlog van statuswijzigingen, prioriteringsbesluiten, beoordelingen en autorisatiewijzigingen. De log is niet wijzigbaar via de applicatie." />
      <nav aria-label="Filter op tabel" className="mb-3 flex flex-wrap gap-1 text-[13px]">
        <Link href="/beheer/historie" className={`rounded border px-2 py-1 ${!table ? "border-primary text-primary" : "border-line"}`}>Alles</Link>
        {Object.entries(TABLES).map(([k, v]) => <Link key={k} href={`/beheer/historie?tabel=${k}`} className={`rounded border px-2 py-1 ${table === k ? "border-primary text-primary" : "border-line"}`}>{v}</Link>)}
      </nav>
      <Card className="p-5"><History entries={rows.slice(0, 50)} allowed /></Card>
      <div className="mt-3 flex gap-2">
        {page > 0 && <LinkButton size="sm" href={`/beheer/historie?${table ? `tabel=${table}&` : ""}pagina=${page - 1}`}>Nieuwer</LinkButton>}
        {rows.length > 50 && <LinkButton size="sm" href={`/beheer/historie?${table ? `tabel=${table}&` : ""}pagina=${page + 1}`}>Ouder</LinkButton>}
      </div>
    </>
  );

  }} />;
}
