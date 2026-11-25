"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Columns3, Copy, Download, Filter, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { TopicRow, Lookups } from "@/server/queries/topics";
import { bulkTopics, deleteView, duplicateTopic, inlineUpdateTopic, saveView } from "@/server/actions/topics";
import { PriorityBadge, StatusBadge, Badge } from "@/components/ui/badge";
import { Button, LinkButton, buttonClasses } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { SOURCE_TYPES, TOPIC_STATUSES, WORK_TYPES } from "@/lib/domain";
import { fmtDate, fmtEuro, fmtHours } from "@/lib/format";

type Col = {
  key: keyof TopicRow | "pillar";
  label: string;
  def?: boolean;
  width?: string;
  edit?: "text" | "status" | "number" | "user" | "program" | "date" | "textarea";
  render?: (r: TopicRow) => React.ReactNode;
  sort?: (r: TopicRow) => string | number | null;
  text?: (r: TopicRow) => string;
};

const list = (v: string[]) => (v.length ? v.join(", ") : "");
const t = (v: string | null) => v ?? "";

const COLUMNS: Col[] = [
  { key: "code", label: "ID", def: true, width: "w-16", sort: (r) => r.pillar_number * 1000 + Number(r.code.split(".")[1]) },
  { key: "title", label: "Titel", def: true, edit: "text", width: "min-w-[240px]" },
  { key: "pillar", label: "Pijler", def: true, render: (r) => <span className="whitespace-nowrap">Pijler {r.pillar_number}</span>, sort: (r) => r.pillar_number, text: (r) => `${r.pillar_number}. ${r.pillar_title}` },
  { key: "subcategory", label: "Subcategorie", edit: "text" },
  { key: "program_name", label: "Programma", def: true, edit: "program" },
  { key: "description", label: "Omschrijving", edit: "textarea" },
  { key: "reason", label: "Aanleiding" },
  { key: "current_situation", label: "Huidige situatie" },
  { key: "desired_situation", label: "Gewenste situatie" },
  { key: "problem_statement", label: "Probleemstelling" },
  { key: "intended_result", label: "Beoogd resultaat" },
  { key: "sources", label: "Bron", def: true, render: (r) => list(r.sources), text: (r) => list(r.sources) },
  { key: "classifications", label: "Type werkzaamheden", render: (r) => list(r.classifications), text: (r) => list(r.classifications) },
  { key: "owner_name", label: "Verantwoordelijke", def: true, edit: "user" },
  { key: "disciplines", label: "Betrokken disciplines", render: (r) => list(r.disciplines), text: (r) => list(r.disciplines) },
  { key: "strategic_contribution", label: "Strategische bijdrage" },
  { key: "legal_basis", label: "Wettelijke grondslag" },
  { key: "legal_deadline", label: "Wettelijke deadline", edit: "date", render: (r) => fmtDate(r.legal_deadline, "") },
  { key: "risk_if_not_done", label: "Risico bij niet uitvoeren" },
  { key: "service_impact", label: "Impact op dienstverlening" },
  { key: "dependencies_text", label: "Afhankelijkheden" },
  { key: "maturity_current", label: "Volwassenheid", render: (r) => (r.maturity_current ? `${r.maturity_current} → ${r.maturity_target ?? "?"}` : "") },
  { key: "priority_category", label: "Prioriteit", def: true, render: (r) => <PriorityBadge category={r.priority_category} final={r.priority_category ? r.priority_is_final : undefined} />, sort: (r) => r.priority_score ?? -1 },
  { key: "flags", label: "Markeringen", def: true, render: (r) => r.flags.length ? <span className="flex flex-wrap gap-1">{r.flags.map((f) => <Badge key={f} tone="accent">{f}</Badge>)}</span> : "", text: (r) => list(r.flags) },
  { key: "required_capacity_hours", label: "Benodigde capaciteit", edit: "number", render: (r) => fmtHours(r.required_capacity_hours, ""), sort: (r) => r.required_capacity_hours },
  { key: "required_budget", label: "Benodigd budget", edit: "number", render: (r) => fmtEuro(r.required_budget, ""), sort: (r) => r.required_budget },
  { key: "status", label: "Status", def: true, edit: "status", render: (r) => <StatusBadge status={r.status} /> },
  { key: "remarks", label: "Opmerkingen", edit: "textarea" },
  { key: "updated_at", label: "Laatst gewijzigd", def: true, render: (r) => fmtDate(r.updated_at), sort: (r) => r.updated_at },
];

type Filters = { pillar: string; status: string; source: string; classification: string; priority: string; flag: string; program: string; archived: string };
const EMPTY: Filters = { pillar: "", status: "", source: "", classification: "", priority: "", flag: "", program: "", archived: "" };
const GROUPS = { "": "Geen groepering", pillar: "Pijler", status: "Status", program_name: "Programma", priority_category: "Prioriteit", owner_name: "Verantwoordelijke" } as const;
type ViewConfig = { q: string; filters: Filters; sort: { key: string; dir: 1 | -1 }; group: string; cols: string[] };
const PAGE = 50;
const COLS_KEY = "di.topics.cols";

export function TopicTable({ rows, lookups, canEdit, initial, views }: {
  rows: TopicRow[]; lookups: Lookups; canEdit: boolean; initial: Partial<Filters> & { q?: string };
  views: { id: string; name: string; config: ViewConfig }[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(initial.q ?? "");
  const [filters, setFilters] = useState<Filters>({ ...EMPTY, ...Object.fromEntries(Object.entries(initial).filter(([k]) => k !== "q")) });
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: "code", dir: 1 });
  const [group, setGroup] = useState<string>("");
  const [cols, setCols] = useState<string[]>(COLUMNS.filter((c) => c.def).map((c) => c.key));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<{ id: string; key: string } | null>(null);
  const [showCols, setShowCols] = useState(false);

  useEffect(() => {
    try { const c = JSON.parse(localStorage.getItem(COLS_KEY) ?? "null"); if (Array.isArray(c)) setCols(c); } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(COLS_KEY, JSON.stringify(cols)); } catch {} }, [cols]);
  useEffect(() => setPage(0), [q, filters, group]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.archived === "1" ? !r.archived_at : r.archived_at) return false;
      if (filters.pillar && String(r.pillar_number) !== filters.pillar) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.source && !r.sources.includes(filters.source)) return false;
      if (filters.classification && !r.classifications.includes(filters.classification)) return false;
      if (filters.priority === "none" ? r.priority_category : filters.priority && r.priority_category !== filters.priority) return false;
      if (filters.flag && !r.flags.length) return false;
      if (filters.program === "none" ? r.program_id : filters.program && r.program_id !== filters.program) return false;
      if (needle) {
        const hay = `${r.code} ${r.title} ${r.description ?? ""} ${r.remarks ?? ""} ${r.program_name ?? ""} ${r.owner_name ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, filters]);

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sort.key);
    const val = (r: TopicRow) => (col?.sort ? col.sort(r) : (r[sort.key as keyof TopicRow] as string | number | null));
    return [...filtered].sort((a, b) => {
      const x = val(a), y = val(b);
      if (x === y) return 0;
      if (x === null || x === undefined || x === "") return 1;
      if (y === null || y === undefined || y === "") return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "nl", { numeric: true })) * sort.dir;
    });
  }, [filtered, sort]);

  const groups = useMemo(() => {
    if (!group) return [{ key: "", rows: sorted }];
    const m = new Map<string, TopicRow[]>();
    for (const r of sorted) {
      const k = group === "pillar" ? `Pijler ${r.pillar_number} – ${r.pillar_title}` : String((r[group as keyof TopicRow] as string) ?? "Niet ingevuld");
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return [...m.entries()].map(([key, rows]) => ({ key, rows }));
  }, [sorted, group]);

  const pageRows = group ? null : sorted.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const visible = COLUMNS.filter((c) => cols.includes(c.key));
  const activeFilters = Object.values(filters).filter(Boolean).length + (q ? 1 : 0);

  const doBulk = (op: Parameters<typeof bulkTopics>[1], value?: string | null) => {
    if (op === "archive" && !confirm(`${selected.size} onderwerp(en) archiveren? Ze blijven herstelbaar.`)) return;
    start(async () => {
      const r = await bulkTopics([...selected], op, value);
      toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "Bijgewerkt" : r.error);
      if (r.ok) { setSelected(new Set()); router.refresh(); }
    });
  };

  const config: ViewConfig = { q, filters, sort, group, cols };
  const applyView = (c: ViewConfig) => { setQ(c.q); setFilters({ ...EMPTY, ...c.filters }); setSort(c.sort); setGroup(c.group); setCols(c.cols); };

  const renderRow = (r: TopicRow) => (
    <tr key={r.id} className={cn("border-t border-line align-top hover:bg-surface-muted/60", selected.has(r.id) && "bg-primary-soft/60")}>
      {canEdit && (
        <td className="w-8 px-2 py-2">
          <input type="checkbox" aria-label={`Selecteer ${r.code} ${r.title}`} className="h-4 w-4 accent-[var(--brand-primary)]"
            checked={selected.has(r.id)} onChange={(e) => { const s = new Set(selected); if (e.target.checked) s.add(r.id); else s.delete(r.id); setSelected(s); }} />
        </td>
      )}
      {visible.map((c) => (
        <td key={c.key} className={cn("px-2.5 py-2 text-[13px]", c.width, c.key === "code" && "num text-muted whitespace-nowrap")}>
          {editing?.id === r.id && editing.key === c.key && c.edit ? (
            <InlineEditor row={r} col={c} lookups={lookups} onDone={(changed) => { setEditing(null); if (changed) router.refresh(); }} />
          ) : (
            <div className="group/cell flex items-start gap-1">
              <div className={cn("min-w-0 flex-1", !["title", "status", "priority_category", "flags"].includes(c.key) && "line-clamp-3")}>
                {c.key === "title" ? (
                  <Link href={`/onderwerpen/${r.id}`} className="font-medium text-ink hover:text-primary hover:underline">{r.title}</Link>
                ) : c.render ? c.render(r) : t(r[c.key as keyof TopicRow] as string | null)}
              </div>
              {canEdit && c.edit && !r.archived_at && (
                <button type="button" onClick={() => setEditing({ id: r.id, key: c.key })} aria-label={`${c.label} bewerken voor ${r.code}`}
                  className="shrink-0 rounded p-0.5 text-subtle opacity-0 hover:text-primary group-hover/cell:opacity-100 focus:opacity-100">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </td>
      ))}
      {canEdit && (
        <td className="whitespace-nowrap px-2 py-2 text-right">
          <button type="button" className="rounded p-1 text-subtle hover:text-primary" aria-label={`Dupliceer ${r.code}`} title="Dupliceren"
            onClick={() => start(async () => { const res = await duplicateTopic(r.id); toast(res.ok ? "ok" : "error", res.ok ? res.message ?? "" : res.error); if (res.ok && res.redirect) router.push(res.redirect); })}>
            <Copy className="h-4 w-4" />
          </button>
          <button type="button" className="rounded p-1 text-subtle hover:text-primary" aria-label={`${r.archived_at ? "Herstel" : "Archiveer"} ${r.code}`} title={r.archived_at ? "Herstellen" : "Archiveren"}
            onClick={() => {
              if (!r.archived_at && !confirm(`${r.code} ${r.title} archiveren?`)) return;
              start(async () => { const res = await bulkTopics([r.id], r.archived_at ? "restore" : "archive"); toast(res.ok ? "ok" : "error", res.ok ? (r.archived_at ? "Hersteld" : "Gearchiveerd") : res.error); router.refresh(); });
            }}>
            {r.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </button>
        </td>
      )}
    </tr>
  );

  const sel = (key: keyof Filters, label: string, options: { value: string; label: string }[]) => (
    <label className="flex flex-col gap-0.5 text-[12px] text-muted">
      {label}
      <select className={cn(inputClass, "h-8 py-0 text-[13px] min-w-[130px]")} value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}>
        <option value="">Alle</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );

  return (
    <div className="rounded-lg border border-line bg-surface shadow-card">
      {/* Werkbalk */}
      <div className="flex flex-wrap items-end gap-2 border-b border-line p-3">
        <label className="flex flex-col gap-0.5 text-[12px] text-muted">
          Zoeken
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID, titel, omschrijving…" className={cn(inputClass, "h-8 w-56 text-[13px]")} />
        </label>
        {sel("pillar", "Pijler", lookups.pillars.map((p) => ({ value: String(p.number), label: `${p.number}. ${p.short_title ?? p.title}` })))}
        {sel("status", "Status", TOPIC_STATUSES.map((s) => ({ value: s, label: s })))}
        {sel("source", "Bron", SOURCE_TYPES.map((s) => ({ value: s, label: s })))}
        {sel("classification", "Type", WORK_TYPES.map((s) => ({ value: s, label: s })))}
        {sel("priority", "Prioriteit", [...["P1", "P2", "P3", "P4"].map((p) => ({ value: p, label: p })), { value: "none", label: "Nog niet beoordeeld" }])}
        {sel("program", "Programma", [...lookups.programs.map((p) => ({ value: p.id, label: p.name })), { value: "none", label: "Geen programma" }])}
        {sel("flag", "Markering", [{ value: "1", label: "Verplicht / urgent" }])}
        {sel("archived", "Archief", [{ value: "1", label: "Alleen gearchiveerd" }])}
        <label className="flex flex-col gap-0.5 text-[12px] text-muted">
          Groeperen
          <select className={cn(inputClass, "h-8 py-0 text-[13px]")} value={group} onChange={(e) => setGroup(e.target.value)}>
            {Object.entries(GROUPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        {activeFilters > 0 && (
          <Button size="sm" variant="ghost" onClick={() => { setQ(""); setFilters(EMPTY); }}><X className="h-3.5 w-3.5" aria-hidden />Wis filters</Button>
        )}
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <div className="relative">
            <Button size="sm" onClick={() => setShowCols((s) => !s)} aria-expanded={showCols}><Columns3 className="h-4 w-4" aria-hidden />Kolommen</Button>
            {showCols && (
              <div className="absolute right-0 z-20 mt-1 max-h-96 w-64 overflow-y-auto rounded-md border border-line bg-surface p-2 shadow-lg" role="group" aria-label="Kolommen tonen of verbergen">
                {COLUMNS.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-surface-muted">
                    <input type="checkbox" checked={cols.includes(c.key)} disabled={c.key === "title"}
                      onChange={(e) => setCols(e.target.checked ? COLUMNS.filter((x) => cols.includes(x.key) || x.key === c.key).map((x) => x.key) : cols.filter((k) => k !== c.key))} />
                    {c.label}
                  </label>
                ))}
                <div className="mt-1 flex gap-1 border-t border-line pt-2">
                  <Button size="sm" variant="ghost" onClick={() => setCols(COLUMNS.map((c) => c.key))}>Alle</Button>
                  <Button size="sm" variant="ghost" onClick={() => setCols(COLUMNS.filter((c) => c.def).map((c) => c.key))}>Standaard</Button>
                </div>
              </div>
            )}
          </div>
          <ExportMenu ids={sorted.map((r) => r.id)} cols={visible.map((c) => c.key)} />
          {canEdit && <LinkButton size="sm" variant="primary" href="/onderwerpen/nieuw"><Plus className="h-4 w-4" aria-hidden />Onderwerp</LinkButton>}
        </div>
      </div>

      {/* Opgeslagen weergaven */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 text-[13px]">
        <Filter className="h-3.5 w-3.5 text-subtle" aria-hidden />
        <span className="text-muted">Weergaven:</span>
        {views.length === 0 && <span className="text-subtle">nog geen opgeslagen weergaven</span>}
        {views.map((v) => (
          <span key={v.id} className="inline-flex items-center rounded border border-line">
            <button type="button" className="px-2 py-0.5 hover:bg-surface-muted" onClick={() => applyView(v.config)}>{v.name}</button>
            <button type="button" aria-label={`Weergave ${v.name} verwijderen`} className="border-l border-line px-1 py-0.5 text-subtle hover:text-bad"
              onClick={() => start(async () => { await deleteView(v.id); router.refresh(); })}><Trash2 className="h-3 w-3" /></button>
          </span>
        ))}
        <button type="button" className="inline-flex items-center gap-1 text-primary hover:underline"
          onClick={() => { const name = prompt("Naam van deze weergave"); if (name) start(async () => { const r = await saveView("inventarisatie", name, config); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); router.refresh(); }); }}>
          <Save className="h-3.5 w-3.5" aria-hidden />Huidige weergave opslaan
        </button>
        <span className="ml-auto text-muted num" aria-live="polite">{sorted.length} van {rows.filter((r) => !r.archived_at).length} onderwerpen</span>
      </div>

      {/* Bulkacties */}
      {canEdit && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-primary-soft px-3 py-2 text-[13px]" role="region" aria-label="Bulkacties">
          <strong>{selected.size} geselecteerd</strong>
          <select aria-label="Status wijzigen" className={cn(inputClass, "h-8 w-auto py-0 text-[13px]")} defaultValue="" onChange={(e) => { if (e.target.value) doBulk("status", e.target.value); e.target.value = ""; }}>
            <option value="">Status wijzigen…</option>
            {TOPIC_STATUSES.filter((s) => s !== "Samengevoegd" && s !== "Gesplitst").map((s) => <option key={s}>{s}</option>)}
          </select>
          <select aria-label="Programma koppelen" className={cn(inputClass, "h-8 w-auto py-0 text-[13px]")} defaultValue="" onChange={(e) => { if (e.target.value) doBulk("program", e.target.value === "none" ? null : e.target.value); e.target.value = ""; }}>
            <option value="">Programma koppelen…</option>
            {lookups.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="none">Ontkoppelen</option>
          </select>
          <select aria-label="Verantwoordelijke toewijzen" className={cn(inputClass, "h-8 w-auto py-0 text-[13px]")} defaultValue="" onChange={(e) => { if (e.target.value) doBulk("owner", e.target.value === "none" ? null : e.target.value); e.target.value = ""; }}>
            <option value="">Verantwoordelijke…</option>
            {lookups.users.map((u) => <option key={u.id} value={u.id}>{u.display_name}</option>)}
            <option value="none">Leegmaken</option>
          </select>
          <Link className={buttonClasses("secondary", "sm")} href={`/deepdive/bundelen?ids=${[...selected].join(",")}`}>Bundelen / samenvoegen / omzetten…</Link>
          <Button size="sm" variant="danger" onClick={() => doBulk(filters.archived ? "restore" : "archive")}>{filters.archived ? "Herstellen" : "Archiveren"}</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Selectie opheffen</Button>
          {pending && <span className="text-muted">Bezig…</span>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Totale inventarisatie van onderwerpen</caption>
          <thead className="bg-surface-muted text-[12px] text-muted">
            <tr>
              {canEdit && (
                <th className="w-8 px-2 py-2">
                  <input type="checkbox" aria-label="Alles op deze pagina selecteren" className="h-4 w-4 accent-[var(--brand-primary)]"
                    checked={(pageRows ?? sorted).length > 0 && (pageRows ?? sorted).every((r) => selected.has(r.id))}
                    onChange={(e) => { const s = new Set(selected); (pageRows ?? sorted).forEach((r) => (e.target.checked ? s.add(r.id) : s.delete(r.id))); setSelected(s); }} />
                </th>
              )}
              {visible.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className="px-2.5 py-2 font-medium whitespace-nowrap">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setSort({ key: c.key, dir: sort.key === c.key ? (sort.dir === 1 ? -1 : 1) : 1 })}>
                    {c.label}
                    {sort.key === c.key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />)}
                  </button>
                </th>
              ))}
              {canEdit && <th className="px-2 py-2"><span className="sr-only">Acties</span></th>}
            </tr>
          </thead>
          {group ? (
            groups.map((g) => (
              <tbody key={g.key}>
                <tr><th colSpan={visible.length + 2} scope="rowgroup" className="bg-surface-muted/60 px-3 py-1.5 text-left text-[13px] font-semibold">{g.key} <span className="font-normal text-muted">({g.rows.length})</span></th></tr>
                {g.rows.map(renderRow)}
              </tbody>
            ))
          ) : (
            <tbody>{pageRows!.map(renderRow)}</tbody>
          )}
        </table>
        {sorted.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">Geen onderwerpen gevonden met deze filters.</p>}
      </div>
      {!group && pages > 1 && (
        <nav aria-label="Paginering" className="flex items-center justify-between border-t border-line px-3 py-2 text-[13px]">
          <span className="text-muted num">Pagina {page + 1} van {pages}</span>
          <div className="flex gap-1">
            <Button size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Vorige</Button>
            <Button size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Volgende</Button>
          </div>
        </nav>
      )}
    </div>
  );
}

function InlineEditor({ row, col, lookups, onDone }: { row: TopicRow; col: Col; lookups: Lookups; onDone: (changed: boolean) => void }) {
  const toast = useToast();
  const field = col.key === "owner_name" ? "owner_user_id" : col.key === "program_name" ? "program_id" : col.key;
  const initial = String((row[field as keyof TopicRow] as string | number | null) ?? "");
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const commit = async (v = value) => {
    if (v === initial) return onDone(false);
    setBusy(true);
    const r = await inlineUpdateTopic(row.id, field, v || null);
    setBusy(false);
    toast(r.ok ? "ok" : "error", r.ok ? `${row.code}: ${col.label} bijgewerkt` : r.error);
    onDone(r.ok);
  };
  const common = {
    autoFocus: true, disabled: busy, "aria-label": `${col.label} voor ${row.code}`,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Escape") onDone(false); if (e.key === "Enter" && col.edit !== "textarea") { e.preventDefault(); commit(); } },
    className: cn(inputClass, "h-8 py-1 text-[13px]"),
  };
  if (col.edit === "status" || col.edit === "user" || col.edit === "program") {
    const options = col.edit === "status" ? TOPIC_STATUSES.map((s) => ({ value: s, label: s }))
      : col.edit === "user" ? lookups.users.map((u) => ({ value: u.id, label: u.display_name }))
      : lookups.programs.map((p) => ({ value: p.id, label: p.name }));
    return (
      <select {...common} value={value} onChange={(e) => { setValue(e.target.value); commit(e.target.value); }} onBlur={() => onDone(false)}>
        {col.edit !== "status" && <option value="">— Leeg —</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (col.edit === "textarea") return <textarea {...common} className={cn(inputClass, "text-[13px]")} rows={3} value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => commit()} />;
  return <input {...common} type={col.edit === "number" ? "number" : col.edit === "date" ? "date" : "text"} min={0} value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => commit()} />;
}

function ExportMenu({ ids, cols }: { ids: string[]; cols: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}><Download className="h-4 w-4" aria-hidden />Exporteren</Button>
      {open && (
        <form method="post" action="/api/export/topics" className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-line bg-surface p-1 shadow-lg" onSubmit={() => setTimeout(() => setOpen(false), 0)}>
          <input type="hidden" name="ids" value={ids.join(",")} />
          <input type="hidden" name="cols" value={cols.join(",")} />
          <p className="px-2 py-1 text-[12px] text-muted">{ids.length} gefilterde onderwerpen, zichtbare kolommen</p>
          {[["xlsx", "Excel (.xlsx)"], ["csv", "CSV"], ["json", "JSON"], ["html", "Printvriendelijke HTML / PDF"]].map(([f, l]) => (
            <button key={f} name="format" value={f} type="submit" className="block w-full rounded px-2 py-1.5 text-left text-[13px] hover:bg-surface-muted">{l}</button>
          ))}
        </form>
      )}
    </div>
  );
}
