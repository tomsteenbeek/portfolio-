"use client";
import { refreshData } from "@/lib/refresh";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { setProjectDates } from "@/server/actions/projects";
import { inputClass } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { PriorityBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/format";

export type GanttProject = {
  id: string; number: string; name: string; pillar_number: number; pillar_title: string; program_id: string | null; program_name: string | null;
  status: string; priority_category: string | null; leader_id: string | null; leader_name: string | null; disciplines: string[];
  start_date: string | null; end_date: string | null; planning_status: string; can_edit: boolean;
  deps: { number: string; end_date: string | null; kind: string }[]; milestones: { title: string; due_date: string; legal: boolean }[];
};
export type Deadline = { label: string; date: string; href: string };

const toMonth = (d: string) => { const [y, m] = d.split("-").map(Number); return y * 12 + (m - 1); };
const fromMonth = (m: number, end = false) => {
  const y = Math.floor(m / 12), mo = (m % 12) + 1;
  if (!end) return `${y}-${String(mo).padStart(2, "0")}-01`;
  const last = new Date(y, mo, 0).getDate();
  return `${y}-${String(mo).padStart(2, "0")}-${last}`;
};
const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function Gantt({ projects, deadlines, from, to, pillars, disciplines }: {
  projects: GanttProject[]; deadlines: Deadline[]; from: number; to: number; pillars: { number: number; title: string }[]; disciplines: string[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState(projects);
  const [f, setF] = useState({ pillar: "", discipline: "", priority: "", status: "", leader: "", program: "", year: "" });
  const [months, setMonths] = useState(false);
  const [drag, setDrag] = useState<{ id: string; mode: "move" | "end"; x0: number; s0: number; e0: number; ds: number } | null>(null);
  const track = useRef<HTMLDivElement>(null);

  const y0 = f.year ? Number(f.year) : from;
  const y1 = f.year ? Number(f.year) : to;
  const start = y0 * 12, span = (y1 - y0 + 1) * 12;
  const pct = (m: number) => ((m - start) / span) * 100;

  const filtered = useMemo(() => items.filter((p) =>
    (!f.pillar || String(p.pillar_number) === f.pillar) && (!f.priority || p.priority_category === f.priority) && (!f.status || p.status === f.status) &&
    (!f.leader || p.leader_id === f.leader) && (!f.program || p.program_id === f.program) && (!f.discipline || p.disciplines.includes(f.discipline))), [items, f]);
  const planned = filtered.filter((p) => p.start_date && p.end_date);
  const unplanned = filtered.filter((p) => !p.start_date || !p.end_date);
  const groups = useMemo(() => {
    const m = new Map<string, GanttProject[]>();
    for (const p of planned) { const k = `Pijler ${p.pillar_number} – ${p.pillar_title}`; m.set(k, [...(m.get(k) ?? []), p]); }
    return [...m.entries()].sort();
  }, [planned]);

  const onDown = (e: React.PointerEvent, p: GanttProject, mode: "move" | "end") => {
    if (!p.can_edit) return;
    e.preventDefault(); (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id: p.id, mode, x0: e.clientX, s0: toMonth(p.start_date!), e0: toMonth(p.end_date!), ds: 0 });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag || !track.current) return;
    const w = track.current.getBoundingClientRect().width;
    setDrag({ ...drag, ds: Math.round(((e.clientX - drag.x0) / w) * span) });
  };
  const onUp = async () => {
    if (!drag) return;
    const d = drag; setDrag(null);
    if (d.ds === 0) return;
    const s = d.mode === "move" ? d.s0 + d.ds : d.s0;
    const en = d.mode === "move" ? d.e0 + d.ds : Math.max(d.s0, d.e0 + d.ds);
    const ns = fromMonth(s), ne = fromMonth(en, true);
    const prev = items;
    setItems(items.map((i) => (i.id === d.id ? { ...i, start_date: ns, end_date: ne } : i)));
    const r = await setProjectDates(d.id, ns, ne);
    toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error);
    if (!r.ok) setItems(prev); else refreshData();
  };
  const keyShift = async (p: GanttProject, delta: number) => {
    if (!p.can_edit || !p.start_date || !p.end_date) return;
    const ns = fromMonth(toMonth(p.start_date) + delta), ne = fromMonth(toMonth(p.end_date) + delta, true);
    setItems(items.map((i) => (i.id === p.id ? { ...i, start_date: ns, end_date: ne } : i)));
    const r = await setProjectDates(p.id, ns, ne);
    toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error);
  };

  const sel = (k: keyof typeof f, label: string, opts: { v: string; l: string }[]) => (
    <label className="flex flex-col gap-0.5 text-[12px] text-muted">{label}
      <select className={cn(inputClass, "h-8 py-0 text-[13px]")} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
        <option value="">Alle</option>{opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
  const uniq = <T,>(a: T[]) => [...new Set(a)];
  const years = Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i);
  const visibleDeadlines = deadlines.filter((d) => toMonth(d.date) >= start && toMonth(d.date) < start + span);

  return (
    <div className="rounded-lg border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-end gap-2 border-b border-line p-3">
        {sel("pillar", "Pijler", pillars.map((p) => ({ v: String(p.number), l: `${p.number}. ${p.title}` })))}
        {sel("discipline", "Discipline", disciplines.map((d) => ({ v: d, l: d })))}
        {sel("priority", "Prioriteit", ["P1", "P2", "P3", "P4"].map((p) => ({ v: p, l: p })))}
        {sel("status", "Projectstatus", uniq(items.map((p) => p.status)).map((s) => ({ v: s, l: s })))}
        {sel("leader", "Verantwoordelijke", uniq(items.filter((p) => p.leader_id).map((p) => `${p.leader_id}|${p.leader_name}`)).map((x) => ({ v: x.split("|")[0], l: x.split("|")[1] })))}
        {sel("program", "Programma", uniq(items.filter((p) => p.program_id).map((p) => `${p.program_id}|${p.program_name}`)).map((x) => ({ v: x.split("|")[0], l: x.split("|")[1] })))}
        {sel("year", "Jaar", Array.from({ length: to - from + 1 }, (_, i) => ({ v: String(from + i), l: String(from + i) })))}
        <label className="flex items-center gap-1.5 pb-1.5 text-[13px]"><input type="checkbox" checked={months} onChange={(e) => setMonths(e.target.checked)} />Maanden tonen</label>
        <div className="ml-auto flex gap-3 pb-1 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1"><span className="h-3 w-6 rounded-sm bg-[var(--chart-1)]" />Vastgesteld</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-6 rounded-sm border-2 border-dashed border-[var(--chart-1)] bg-[var(--brand-primary-soft)]" />Gepland</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rotate-45 bg-ink" />Mijlpaal</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-0.5 bg-bad" />Wettelijke deadline</span>
        </div>
      </div>
      <div className="overflow-x-auto" onPointerMove={onMove} onPointerUp={onUp}>
        <div className="min-w-[960px]">
          <div className="grid grid-cols-[280px_1fr] border-b border-line text-[12px] text-muted">
            <div className="px-3 py-1.5">Project</div>
            <div className="relative h-12">
              {years.map((y) => <div key={y} className="absolute top-0 border-l border-line px-1.5 font-semibold text-ink" style={{ left: `${pct(y * 12)}%`, width: `${(12 / span) * 100}%` }}>{y}</div>)}
              {years.flatMap((y) => [0, 1, 2, 3].map((q) => <div key={`${y}${q}`} className="absolute top-5 border-l border-line pl-1" style={{ left: `${pct(y * 12 + q * 3)}%` }}>Q{q + 1}</div>))}
              {months && years.flatMap((y) => MONTHS.map((m, i) => <div key={`${y}${m}`} className="absolute top-8 pl-0.5 text-[10px]" style={{ left: `${pct(y * 12 + i)}%` }}>{m}</div>))}
            </div>
          </div>
          <div className="grid grid-cols-[280px_1fr] border-b border-line">
            <div className="px-3 py-1.5 text-[12px] font-medium text-bad">Wettelijke deadlines</div>
            <div className="relative h-7">
              {visibleDeadlines.map((d, i) => <Link key={i} href={d.href} title={`${d.label} – ${fmtDate(d.date)}`} aria-label={`Wettelijke deadline: ${d.label}, ${fmtDate(d.date)}`}
                className="absolute top-1 h-5 w-1 -translate-x-1/2 rounded-sm bg-bad hover:w-1.5" style={{ left: `${pct(toMonth(d.date) + (Number(d.date.slice(8, 10)) - 1) / 30)}%` }} />)}
            </div>
          </div>
          {groups.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">Geen geplande projecten met deze filters. Geef projecten een start- en einddatum.</p>}
          {groups.map(([g, list]) => (
            <div key={g}>
              <div className="border-b border-line bg-surface-muted px-3 py-1 text-[12px] font-semibold">{g}</div>
              {list.map((p) => {
                const live = drag?.id === p.id;
                const s = toMonth(p.start_date!) + (live && drag!.mode === "move" ? drag!.ds : 0);
                const e = toMonth(p.end_date!) + (live ? drag!.ds : 0);
                const blocked = p.deps.filter((d) => d.kind === "Einde-start" && d.end_date && toMonth(d.end_date) >= s);
                const left = Math.max(0, pct(s)), right = Math.min(100, pct(e + 1));
                return (
                  <div key={p.id} className="grid grid-cols-[280px_1fr] border-b border-line hover:bg-surface-muted/50">
                    <div className="flex items-center gap-2 truncate px-3 py-1.5 text-[13px]">
                      {p.priority_category && <PriorityBadge category={p.priority_category} />}
                      <Link href={`/projecten/detail?id=${p.id}`} className="truncate hover:text-primary hover:underline" title={p.name}><span className="num text-muted">{p.number}</span> {p.name}</Link>
                    </div>
                    <div className="relative h-9" ref={list[0] === p && g === groups[0][0] ? track : undefined}>
                      {years.map((y) => <div key={y} className="absolute inset-y-0 border-l border-line" style={{ left: `${pct(y * 12)}%` }} />)}
                      {right > left && (
                        <div role="button" tabIndex={p.can_edit ? 0 : -1}
                          aria-label={`${p.number} ${p.name}: ${fmtDate(fromMonth(s))} tot ${fmtDate(fromMonth(e, true))}, ${p.planning_status.toLowerCase()}${p.can_edit ? ". Pijltjestoetsen verschuiven per maand." : ""}`}
                          onKeyDown={(ev) => { if (ev.key === "ArrowRight") { ev.preventDefault(); keyShift(p, 1); } if (ev.key === "ArrowLeft") { ev.preventDefault(); keyShift(p, -1); } }}
                          onPointerDown={(ev) => onDown(ev, p, "move")}
                          title={`${p.name}\n${fmtDate(fromMonth(s))} – ${fmtDate(fromMonth(e, true))}${blocked.length ? `\nKan niet eerder starten: wacht op ${blocked.map((b) => b.number).join(", ")}` : ""}`}
                          className={cn("absolute top-1.5 flex h-6 items-center overflow-hidden rounded px-1.5 text-[11px] font-medium",
                            p.planning_status === "Vastgesteld" ? "bg-[var(--chart-1)] text-white" : "border-2 border-dashed border-[var(--chart-1)] bg-primary-soft text-primary",
                            p.can_edit ? "cursor-grab active:cursor-grabbing" : "cursor-default", blocked.length && "ring-2 ring-bad ring-offset-1", live && "opacity-80")}
                          style={{ left: `${left}%`, width: `${right - left}%` }}>
                          <span className="truncate">{p.status}</span>
                          {p.can_edit && <span onPointerDown={(ev) => { ev.stopPropagation(); onDown(ev, p, "end"); }} aria-hidden className="absolute inset-y-0 right-0 w-2 cursor-ew-resize" />}
                        </div>
                      )}
                      {p.milestones.map((m, i) => toMonth(m.due_date) >= start && toMonth(m.due_date) < start + span && (
                        <span key={i} title={`${m.title} – ${fmtDate(m.due_date)}`} className={cn("absolute top-3 h-3 w-3 -translate-x-1/2 rotate-45 border border-white", m.legal ? "bg-bad" : "bg-ink")}
                          style={{ left: `${pct(toMonth(m.due_date) + (Number(m.due_date.slice(8, 10)) - 1) / 30)}%` }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {unplanned.length > 0 && (
        <details className="border-t border-line p-3 text-[13px]">
          <summary className="cursor-pointer text-muted">{unplanned.length} project(en) zonder volledige planning</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">{unplanned.map((p) => <li key={p.id}><Link className="text-primary hover:underline" href={`/projecten/detail?id=${p.id}&tab=bewerken`}>{p.number} {p.name}</Link></li>)}</ul>
        </details>
      )}
    </div>
  );
}
