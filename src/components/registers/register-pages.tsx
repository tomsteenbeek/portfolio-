"use client";
import Link from "next/link";
import { AsyncPage, notFound } from "@/components/async-page";
import { z } from "zod";
import type { ReactNode } from "react";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { getRegister } from "@/lib/registers";
import { getRecord, listRecords, refOptions } from "@/server/queries/registers";
import { auditFor } from "@/server/queries/topics";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { RegisterForm } from "./register-form";
import { RegisterTable } from "./register-table";
import { ArchiveButton } from "./archive-button";
import { History } from "@/components/common/history";
import { Badge } from "@/components/ui/badge";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { Db } from "@/lib/db";

type ListProps = Parameters<typeof loadRegisterListPage>[0];
type DetailProps = Parameters<typeof loadRegisterDetailPage>[0];

/** Zelfladende registerschermen (gegevens worden in de browser opgehaald). */
export function RegisterListPage(props: ListProps) {
  return <AsyncPage render={() => loadRegisterListPage(props)} />;
}
export function RegisterDetailPage(props: DetailProps) {
  return <AsyncPage render={() => loadRegisterDetailPage(props)} />;
}

async function loadRegisterListPage({ registerKey, above, filter, actions }: {
  registerKey: string; above?: (d: Db, u: CurrentUser) => Promise<ReactNode>; filter?: Record<string, string>; actions?: ReactNode;
}) {
  const def = getRegister(registerKey);
  const data = await db(async (d, user) => {
    if (def.viewPerm && !can(user.roles, def.viewPerm)) return null;
    return { rows: await listRecords(d, def), refs: await refOptions(d, def), user, extra: above ? await above(d, user) : null };
  });
  if (!data) return <p className="text-sm text-muted">U heeft geen toegang tot dit onderdeel.</p>;
  const canCreate = can(data.user.roles, def.createPerm ?? def.editPerm);
  return (
    <>
      <PageHeader title={def.title} description={def.description} crumbs={[{ label: def.group }, { label: def.title }]}
        actions={<>{actions}{canCreate && <Dialog trigger={`Nieuw ${def.singular}`} triggerVariant="primary" title={`Nieuw ${def.singular}`} wide><RegisterForm def={def} refs={data.refs} /></Dialog>}</>} />
      {data.extra}
      <Card className="mt-4"><RegisterTable def={def} rows={data.rows} initialFilter={filter} /></Card>
    </>
  );
}

async function loadRegisterDetailPage({ registerKey, id, extra }: {
  registerKey: string; id: string; extra?: (d: Db, record: Record<string, unknown>, user: CurrentUser) => Promise<ReactNode>;
}) {
  const def = getRegister(registerKey);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const data = await db(async (d, user) => {
    const record = await getRecord(d, def, id);
    if (!record) return null;
    return {
      record, user, refs: await refOptions(d, def),
      history: can(user.roles, "audit.view") ? await auditFor(d, def.table, [id], 40) : [],
      extra: extra ? await extra(d, record, user) : null,
    };
  });
  if (!data) notFound();
  const { record, user } = data;
  const canEdit = can(user.roles, def.editPerm);
  const title = String(record[def.titleField] ?? "");
  return (
    <>
      <PageHeader
        title={<>{def.numberField && <span className="num font-normal text-muted">{String(record[def.numberField])} </span>}{title}</>}
        crumbs={[{ label: def.group }, { label: def.title, href: def.path }, { label: title.length > 40 ? title.slice(0, 40) + "…" : title }]}
        meta={record.archived_at ? <Badge tone="neutral">Gearchiveerd</Badge> : undefined}
        actions={canEdit && def.archivable ? <ArchiveButton registerKey={def.key} id={id} archived={Boolean(record.archived_at)} /> : undefined}
      />
      {data.extra}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card><CardHeader title="Gegevens" description={canEdit ? undefined : "Alleen-lezen"} /><CardBody><RegisterForm def={def} record={record} refs={data.refs} disabled={!canEdit} /></CardBody></Card>
        <Card><CardHeader title="Wijzigingshistorie" /><CardBody><History entries={data.history} allowed={can(user.roles, "audit.view")} /></CardBody></Card>
      </div>
      <p className="mt-4"><Link href={def.path} className="text-[13px] text-primary hover:underline">← Terug naar {def.title.toLowerCase()}</Link></p>
    </>
  );
}
