"use client";
import { refreshData } from "@/lib/refresh";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ProjectRow } from "@/server/queries/projects";
import { PROJECT_STATUSES } from "@/lib/domain";
import { PriorityBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { setProjectStatus } from "@/server/actions/projects";
import { cn } from "@/components/ui/cn";
import { fmtPct } from "@/lib/format";

/** Kanban met drag-and-drop én toetsenbordalternatief (statusmenu per kaart). */
export function Kanban({ rows, hidden = ["Geannuleerd"] }: { rows: ProjectRow[]; hidden?: string[] }) {
  const [items, setItems] = useState(rows);
  const [over, setOver] = useState<string | null>(null);
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const move = (id: string, status: string) => {
    const prev = items;
    setItems(items.map((i) => (i.id === id ? { ...i, status } : i)));
    start(async () => {
      const r = await setProjectStatus(id, status);
      toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error);
      if (!r.ok) setItems(prev); else refreshData();
    });
  };
  const cols = PROJECT_STATUSES.filter((s) => !hidden.includes(s));
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {cols.map((s) => {
        const list = items.filter((i) => i.status === s);
        return (
          <section key={s} aria-label={s} className={cn("flex w-64 shrink-0 flex-col rounded-lg border border-line bg-surface-muted", over === s && "border-primary bg-primary-soft")}
            onDragOver={(e) => { e.preventDefault(); setOver(s); }} onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/plain"); if (id && items.find((i) => i.id === id)?.status !== s) move(id, s); }}>
            <h2 className="flex items-center justify-between px-3 py-2 text-[13px] font-semibold">{s}<span className="num rounded bg-surface px-1.5 text-[12px] font-normal text-muted">{list.length}</span></h2>
            <ul className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
              {list.map((p) => (
                <li key={p.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                  className="cursor-grab rounded-md border border-line bg-surface p-2.5 text-[13px] shadow-card active:cursor-grabbing">
                  <div className="flex items-start justify-between gap-2"><span className="num text-[12px] text-muted">{p.number} · Pijler {p.pillar_number}</span><PriorityBadge category={p.priority_category} /></div>
                  <Link href={`/projecten/detail?id=${p.id}`} className="mt-0.5 block font-medium hover:text-primary hover:underline">{p.name}</Link>
                  <div className="mt-1 text-[12px] text-muted">{p.leader_name ?? "Geen projectleider"}{p.progress_pct !== null ? ` · ${fmtPct(p.progress_pct)}` : ""}</div>
                  {p.blocked_by.length > 0 && <div className="mt-1 text-[12px] text-warn">Wacht op {p.blocked_by.join(", ")}</div>}
                  <label className="sr-only" htmlFor={`k-${p.id}`}>Status van {p.name}</label>
                  <select id={`k-${p.id}`} className="mt-2 w-full rounded border border-line bg-surface px-1 py-0.5 text-[12px]" value={p.status} onChange={(e) => move(p.id, e.target.value)}>
                    {PROJECT_STATUSES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
