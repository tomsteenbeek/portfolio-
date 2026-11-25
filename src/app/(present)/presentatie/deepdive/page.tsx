"use client";
import { AsyncPage, notFound, spObject } from "@/components/async-page";
import Link from "next/link";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { deepdiveData } from "@/server/queries/deepdive";
import { Walkthrough } from "@/components/deepdive/walkthrough";

export default function PresentDeepdive() {
  return <AsyncPage render={async (__sp) => {
    const searchParams = Promise.resolve(spObject(__sp));
    const params = Promise.resolve({ id: __sp.get("id") ?? "", nummer: __sp.get("nr") ?? "" });

  const { nummer } = await params;
  const { t } = await searchParams;
  const d = await db(async (x, user) => ({ data: await deepdiveData(x, Number(nummer)), user }));
  if (!d.data) notFound();
  return (
    <div className="presentation">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-semibold">Pijler {d.data.pillar.number} · {d.data.pillar.title}</h1>
        <Link href={`/deepdive/pijler?nr=${nummer}${t ? `&t=${t}` : ""}`} className="text-[15px] text-muted hover:text-ink">Presentatie sluiten</Link>
      </div>
      <Walkthrough pillar={d.data.pillar} topics={d.data.topics} current={t ?? d.data.topics[0]?.id ?? null}
        canEdit={can(d.user.roles, "topics.edit")} canApprove={can(d.user.roles, "topics.approve")} present />
    </div>
  );

  }} />;
}
