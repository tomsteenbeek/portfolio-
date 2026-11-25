import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ANNUAL_PLAN_SECTIONS } from "@/lib/annual-plan";
import { fmtDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/badge";
import { PrintButton } from "@/components/common/print-button";

export default async function VersionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const v = await db((x) => x.one<{ version: number; status: string; note: string | null; created_at: string; snapshot: { plan: { year: number; title: string; theme: string | null; sections: Record<string, string> }; items: { label: string; kind: string; priority: string | null; note: string | null }[] } }>(
    `select version, status, note, created_at, snapshot from annual_plan_versions where id = $1`, [id]));
  if (!v) notFound();
  const p = v.snapshot.plan;
  return (
    <>
      <PageHeader title={`${p.title} – versie ${v.version}`} description={v.note ?? undefined} meta={<><StatusBadge status={v.status} /><span className="text-[13px] text-muted">Vastgelegd {fmtDateTime(v.created_at)}</span></>}
        crumbs={[{ label: "Strategie" }, { label: "Jaarplan", href: `/jaarplan?jaar=${p.year}` }, { label: `Versie ${v.version}` }]} actions={<PrintButton />} />
      <div className="space-y-4">
        {ANNUAL_PLAN_SECTIONS.map((s) => <Card key={s.key}><CardHeader title={s.label} /><CardBody><p className="whitespace-pre-wrap text-sm">{p.sections?.[s.key] ?? <span className="text-subtle">Niet ingevuld</span>}</p></CardBody></Card>)}
        <Card><CardHeader title="Geselecteerde initiatieven" /><CardBody><ul className="text-sm">{v.snapshot.items.map((i, k) => <li key={k}>[{i.kind}] {i.label}{i.priority ? ` (${i.priority})` : ""}{i.note ? ` – ${i.note}` : ""}</li>)}</ul></CardBody></Card>
      </div>
    </>
  );
}
