"use client";
import { OwnerLabel } from "@/components/team/owner-select";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { ProjectRow } from "@/server/queries/projects";
import { inputClass } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { fmtDate } from "@/lib/format";

export function ProjectList({ rows, pillars }: { rows: ProjectRow[]; pillars: { number: number; short_title: string | null; title: string }[] }) {
  const [pillar, setPillar] = useState("");
  const [status, setStatus] = useState("open");
  const [q, setQ] = useState("");
  const shown = useMemo(() => rows.filter((r) =>
    (!pillar || r.pillar_number === Number(pillar) || r.secondary_pillars.includes(Number(pillar))) &&
    (status === "" || (status === "open" ? !["Afgerond", "Geannuleerd"].includes(r.status) : r.status === status)) &&
    (!q || `${r.name} ${r.description ?? ""} ${r.lead_name ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [rows, pillar, status, q]);
  const statuses = [...new Set(rows.map((r) => r.status))];
  return (
    <div className="rounded-lg border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-end gap-2 border-b border-line p-3">
        <label className="flex flex-col gap-0.5 text-[12px] text-muted">Zoeken
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className={cn(inputClass, "h-8 w-56 text-[13px]")} /></label>
        <label className="flex flex-col gap-0.5 text-[12px] text-muted">Pijler
          <select value={pillar} onChange={(e) => setPillar(e.target.value)} className={cn(inputClass, "h-8 py-0 text-[13px]")}>
            <option value="">Alle</option>{pillars.map((p) => <option key={p.number} value={p.number}>{p.number}. {p.short_title ?? p.title}</option>)}</select></label>
        <label className="flex flex-col gap-0.5 text-[12px] text-muted">Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={cn(inputClass, "h-8 py-0 text-[13px]")}>
            <option value="open">Lopend en gepland</option><option value="">Alle</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label>
        <span className="ml-auto num text-[13px] text-muted" aria-live="polite">{shown.length} van {rows.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]"><caption className="sr-only">Projecten en initiatieven</caption>
          <thead className="bg-surface-muted text-left text-[12px] text-muted"><tr>
            {["Project / initiatief", "Pijler(s)", "Onderwerpen", "Trekker", "Status", "Einddatum", "Planner"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.id} className="border-t border-line align-top">
              <td className="px-3 py-2"><Link href={`/projecten/detail?id=${r.id}`} className="font-medium hover:text-primary hover:underline">{r.name}</Link>
                {r.description && <p className="line-clamp-1 text-[12px] text-muted">{r.description}</p>}</td>
              <td className="px-3 py-2 whitespace-nowrap">{[r.pillar_number, ...r.secondary_pillars].map((n, i) => (
                <span key={n} title={`Pijler ${n}${i === 0 ? " (hoofdpijler)" : ""}`} className={cn("num mr-1 inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[11px] font-semibold", i === 0 ? "text-white" : "border bg-surface")}
                  style={i === 0 ? { background: `var(--pillar-${n})` } : { borderColor: `var(--pillar-${n})`, color: "var(--text)" }}>{n}</span>))}</td>
              <td className="px-3 py-2">{r.topics.length ? r.topics.map((t) => <Link key={t.id} href={`/onderwerpen/detail?id=${t.id}`} title={t.title} className="mr-1.5 num text-primary hover:underline">{t.code}</Link>) : <span className="text-subtle">–</span>}</td>
              <td className="px-3 py-2"><OwnerLabel name={r.lead_name} empty="–" /></td>
              <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
              <td className="num px-3 py-2 whitespace-nowrap">{fmtDate(r.end_date)}</td>
              <td className="px-3 py-2">{r.planner_url ? <a href={r.planner_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Openen<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a> : <span className="text-subtle">–</span>}</td>
            </tr>))}</tbody>
        </table>
        {shown.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">{rows.length ? "Geen projecten met deze filters." : "Nog geen projecten of initiatieven. Voeg ze toe met de knop rechtsboven."}</p>}
      </div>
    </div>
  );
}
