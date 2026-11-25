"use client";
import { AsyncPage, notFound, spObject } from "@/components/async-page";
import Link from "next/link";
import { z } from "zod";
import { db } from "@/lib/auth/current-user";
import { getSession } from "@/server/queries/priority";
import { AssessPanel } from "@/components/priority/session-client";
import { Results } from "@/components/priority/results";
import { StatusBadge } from "@/components/ui/badge";

export default function PresentSession() {
  return <AsyncPage render={async (__sp) => {
    const searchParams = Promise.resolve(spObject(__sp));
    const params = Promise.resolve({ id: __sp.get("id") ?? "", nummer: __sp.get("nr") ?? "" });

  const { id } = await params;
  const { tab = "beoordelen" } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const d = await db(async (x, user) => ({ data: await getSession(x, id), user }));
  if (!d.data) notFound();
  const s = d.data.session;
  const visible = !s.hide_individual || s.status === "Bespreking" || s.status === "Afgerond";
  return (
    <div className="presentation mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><div className="text-sm text-muted">Prioriteringssessie</div><h1 className="font-semibold">{s.name}</h1><StatusBadge status={s.status} /></div>
        <nav className="flex gap-3 text-[15px]">
          <Link className={tab === "beoordelen" ? "font-semibold text-primary" : "text-muted"} href={`?tab=beoordelen`}>Beoordelen</Link>
          <Link className={tab === "resultaten" ? "font-semibold text-primary" : "text-muted"} href={`?tab=resultaten`}>Resultaten</Link>
          <Link className="text-muted" href={`/prioritering/sessie?id=${id}`}>Presentatie sluiten</Link>
        </nav>
      </div>
      {tab === "resultaten" ? <Results data={d.data} visible={visible} large /> : <AssessPanel data={d.data} userId={d.user.id} isMember={d.data.members.some((m) => m.user_id === d.user.id)} present />}
    </div>
  );

  }} />;
}
