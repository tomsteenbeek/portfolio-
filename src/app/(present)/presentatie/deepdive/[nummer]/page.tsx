import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { deepdiveData } from "@/server/queries/deepdive";
import { Walkthrough } from "@/components/deepdive/walkthrough";

export default async function PresentDeepdive({ params, searchParams }: { params: Promise<{ nummer: string }>; searchParams: Promise<{ t?: string }> }) {
  const { nummer } = await params;
  const { t } = await searchParams;
  const d = await db(async (x, user) => ({ data: await deepdiveData(x, Number(nummer)), user }));
  if (!d.data) notFound();
  return (
    <div className="presentation">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-semibold">Pijler {d.data.pillar.number} · {d.data.pillar.title}</h1>
        <Link href={`/deepdive/${nummer}${t ? `?t=${t}` : ""}`} className="text-[15px] text-muted hover:text-ink">Presentatie sluiten</Link>
      </div>
      <Walkthrough pillar={d.data.pillar} topics={d.data.topics} current={t ?? d.data.topics[0]?.id ?? null}
        canEdit={can(d.user.roles, "topics.edit")} canApprove={can(d.user.roles, "topics.approve")} present />
    </div>
  );
}
