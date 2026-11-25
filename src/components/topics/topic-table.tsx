"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Archive, ArrowDown, ArrowUp, Download, Pencil, Plus, X } from "lucide-react";
import type { TopicRow, Lookups } from "@/server/queries/topics";
import { bulkTopics, inlineUpdateTopic } from "@/server/actions/topics";
import { exportTopics } from "@/server/reports";
import type { ExportFormat } from "@/server/export";
import { Button, LinkButton } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { refreshData } from "@/lib/refresh";

type SortKey = "code" | "title" | "owner_name" | "kpi_count" | "project_count";
const PAGE = 60;

/** Overzicht van onderwerpen: zoeken, filteren op pijler/eigenaar, eigenaar inline aanpassen. */
export function TopicTable({ rows, lookups, initialPillar, initialQ }: { rows: TopicRow[]; lookups: Lookups; initialPillar?: string; initialQ?: string }) {
  const toast = useToast();
  const [, start] = useTransition();
  const [q, setQ] = useState(initialQ ?? "");
  const [pillar, setPillar] = useState(initialPillar ?? "");
  const [owner, setOwner] = useState("");
  const [sort, setSort] = useState<{ k: SortKey; d: 1 | -1 }>({ k: "code", d: 1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const owners = useMemo(() => [...new Set(rows.map((r) => r.owner_name).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "nl")), [rows]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    const out = rows.filter((r) =>
      (!pillar || String(r.pillar_number) === pillar) &&
      (!owner || (owner === "-" ? !r.owner_name : r.owner_name === owner)) &&
      (!n || `${r.code} ${r.title} ${r.description ?? ""} ${r.scope ?? ""} ${r.owner_name ?? ""}`.toLowerCase().includes(n)));
    const val = (r: TopicRow) => (sort.k === "code" ? r.pillar_number * 1000 + Number(r.code.split(".")[1]) : r[sort.k]);
    return out.sort((a, b) => {
      const x = val(a), y = val(b);
      if (x === y) return 0; if (x == null || x === "") return 1; if (y == null || y === "") return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "nl")) * sort.d;
    });
  }, [rows, q, pillar, owner, sort]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const pageRows = shown.slice(page * PAGE, page * PAGE + PAGE);

  const head = (k: SortKey, label: string, cls = "") => (
    <th scope="col" className={cn("px-3 py-2 font-medium", cls)} aria-sort={sort.k === k ? (sort.d === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setSort({ k, d: sort.k === k && sort.d === 1 ? -1 : 1 })}>
        {label}{sort.k === k && (sort.d === 1 ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />)}
      </button>
    </th>
  );
  const bulk = (op: "owner" | "archive", value?: string | null) => start(async () => {
    const r = await bulkTopics([...selected], op, value);
    toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error);
    if (r.ok) { setSelected(new Set()); refreshData(); }
  });
  const exp = async (f: ExportFormat) => {
    try { await exportTopics(shown.map((r) => r.id), ["code", "title", "pillar", "owner_name", "description", "scope", "intended_result", "remarks"], f); }
    catch (e) { toast("error", e instanceof Error ? e.message : "Export mislukt"); }
  };

  return (
    <div className="rounded-lg border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-end gap-2 border-b border-line p-3">
        <label className="flex flex-col gap-0.5 text-[12px] text-muted">Zoeken
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="ID, titel, inhoud…" className={cn(inputClass, "h-8 w-60 text-[13px]")} />
        </label>
        <label className="flex flex-col gap-0.5 text-[12px] text-muted">Pijler
          <select className={cn(inputClass, "h-8 py-0 text-[13px]")} value={pillar} onChange={(e) => { setPillar(e.target.value); setPage(0); }}>
            <option value="">Alle pijlers</option>{lookups.pillars.map((p) => <option key={p.id} value={p.number}>{p.number}. {p.short_title ?? p.title}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-0.5 text-[12px] text-muted">Eigenaar
          <select className={cn(inputClass, "h-8 py-0 text-[13px]")} value={owner} onChange={(e) => { setOwner(e.target.value); setPage(0); }}>
            <option value="">Alle</option><option value="-">Nog geen eigenaar</option>{owners.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        {(q || pillar || owner) && <Button size="sm" variant="ghost" onClick={() => { setQ(""); setPillar(""); setOwner(""); }}><X className="h-3.5 w-3.5" aria-hidden />Wis filters</Button>}
        <div className="ml-auto flex items-end gap-2">
          <Button size="sm" onClick={() => exp("xlsx")}><Download className="h-4 w-4" aria-hidden />Excel</Button>
          <Button size="sm" onClick={() => exp("html")}>Print / PDF</Button>
          <LinkButton size="sm" variant="primary" href={`/onderwerpen/nieuw${pillar ? `?pijler=${pillar}` : ""}`}><Plus className="h-4 w-4" aria-hidden />Onderwerp</LinkButton>
        </div>
      </div>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-primary-soft px-3 py-2 text-[13px]" role="region" aria-label="Bulkacties">
          <strong>{selected.size} geselecteerd</strong>
          <Button size="sm" onClick={() => { const v = prompt("Eigenaar voor de geselecteerde onderwerpen (leeg = verwijderen)"); if (v !== null) bulk("owner", v); }}>Eigenaar instellen</Button>
          <Button size="sm" variant="danger" onClick={() => confirm(`${selected.size} onderwerp(en) archiveren?`) && bulk("archive")}><Archive className="h-4 w-4" aria-hidden />Archiveren</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Selectie opheffen</Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <caption className="sr-only">Onderwerpen</caption>
          <thead className="bg-surface-muted text-[12px] text-muted">
            <tr>
              <th className="w-8 px-2 py-2"><input type="checkbox" aria-label="Alles op deze pagina selecteren" className="h-4 w-4"
                checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                onChange={(e) => { const s = new Set(selected); pageRows.forEach((r) => (e.target.checked ? s.add(r.id) : s.delete(r.id))); setSelected(s); }} /></th>
              {head("code", "ID", "w-16")}{head("title", "Onderwerp")}{head("owner_name", "Eigenaar", "w-56")}
              <th className="px-3 py-2 font-medium">Omschrijving</th>
              {head("kpi_count", "KPI's", "w-16")}{head("project_count", "Projecten", "w-20")}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className={cn("border-t border-line align-top hover:bg-surface-muted/60", selected.has(r.id) && "bg-primary-soft/60")}>
                <td className="px-2 py-2"><input type="checkbox" aria-label={`Selecteer ${r.code}`} className="h-4 w-4" checked={selected.has(r.id)}
                  onChange={(e) => { const s = new Set(selected); if (e.target.checked) s.add(r.id); else s.delete(r.id); setSelected(s); }} /></td>
                <td className="num px-3 py-2 text-muted whitespace-nowrap">{r.code}</td>
                <td className="px-3 py-2"><Link href={`/onderwerpen/detail?id=${r.id}`} className="font-medium text-ink hover:text-primary hover:underline">{r.title}</Link>
                  <div className="text-[12px] text-muted">Pijler {r.pillar_number}</div></td>
                <td className="px-3 py-2">
                  {editing === r.id ? (
                    <input autoFocus aria-label={`Eigenaar van ${r.code}`} defaultValue={r.owner_name ?? ""} className={cn(inputClass, "h-8 text-[13px]")}
                      onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); if (e.key === "Enter") e.currentTarget.blur(); }}
                      onBlur={async (e) => {
                        const v = e.currentTarget.value; setEditing(null);
                        if (v === (r.owner_name ?? "")) return;
                        const res = await inlineUpdateTopic(r.id, "owner_name", v);
                        toast(res.ok ? "ok" : "error", res.ok ? `${r.code}: eigenaar bijgewerkt` : res.error); if (res.ok) refreshData();
                      }} />
                  ) : (
                    <button type="button" onClick={() => setEditing(r.id)} className="group inline-flex items-center gap-1 text-left" aria-label={`Eigenaar van ${r.code} bewerken`}>
                      {r.owner_name ?? <span className="text-subtle">Nog geen eigenaar</span>}
                      <Pencil className="h-3.5 w-3.5 text-subtle opacity-0 group-hover:opacity-100 group-focus:opacity-100" aria-hidden />
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 text-muted"><span className="line-clamp-2">{r.description ?? <span className="text-subtle">Nog aan te vullen</span>}</span></td>
                <td className="num px-3 py-2">{r.kpi_count || <span className="text-subtle">–</span>}</td>
                <td className="num px-3 py-2">{r.project_count || <span className="text-subtle">–</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">Geen onderwerpen gevonden.</p>}
      </div>
      <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[13px]">
        <span className="num text-muted" aria-live="polite">{shown.length} van {rows.length} onderwerpen</span>
        {pages > 1 && <div className="flex gap-1">
          <Button size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Vorige</Button>
          <Button size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Volgende</Button>
        </div>}
      </div>
    </div>
  );
}
