"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { RegisterDef } from "@/lib/registers";
import { inputClass } from "@/components/ui/field";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { fmtDate, fmtNumber } from "@/lib/format";

const STATUS_FIELDS = new Set(["outcome", "stage", "status"]);

export function RegisterTable({ def, rows, initialFilter }: { def: RegisterDef; rows: (Record<string, unknown> & { id: string })[]; initialFilter?: Record<string, string> }) {
  const cols = def.fields.filter((f) => f.list);
  const selects = def.fields.filter((f) => f.list && (f.type === "select" || f.type === "ref"));
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>(initialFilter ?? {});
  const [sort, setSort] = useState<{ k: string; d: 1 | -1 } | null>(null);
  const label = (r: Record<string, unknown>, f: (typeof cols)[number]) => (f.type === "ref" ? (r[`${f.name}__label`] as string | null) : r[f.name]);
  const shown = useMemo(() => {
    let out = rows.filter((r) => {
      for (const [k, v] of Object.entries(filters)) if (v && String(r[k] ?? "") !== v) return false;
      if (!q) return true;
      return JSON.stringify(r).toLowerCase().includes(q.toLowerCase());
    });
    if (sort) {
      const f = cols.find((c) => c.name === sort.k)!;
      out = [...out].sort((a, b) => {
        const x = label(a, f), y = label(b, f);
        if (x === y) return 0; if (x == null) return 1; if (y == null) return -1;
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "nl", { numeric: true })) * sort.d;
      });
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, filters, sort]);
  const opts = (f: (typeof selects)[number]) => f.type === "select" ? (f.options ?? []).map((o) => ({ v: o, l: o }))
    : [...new Map(rows.filter((r) => r[f.name]).map((r) => [String(r[f.name]), String(r[`${f.name}__label`])])).entries()].map(([v, l]) => ({ v, l }));
  const render = (r: Record<string, unknown>, f: (typeof cols)[number]) => {
    const v = label(r, f);
    if (v === null || v === undefined || v === "") return <span className="text-subtle">—</span>;
    if (STATUS_FIELDS.has(f.name)) return <StatusBadge status={String(v)} />;
    if (f.type === "date") return fmtDate(String(v));
    if (f.type === "bool") return v ? <Badge tone="primary">Ja</Badge> : "Nee";
    if (f.type === "number" || f.type === "score") return <span className="num">{fmtNumber(Number(v))}</span>;
    return String(v);
  };
  return (
    <div>
      <div className="flex flex-wrap items-end gap-2 border-b border-line p-3">
        <label className="flex flex-col gap-0.5 text-[12px] text-muted">Zoeken
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className={cn(inputClass, "h-8 w-56 text-[13px]")} />
        </label>
        {selects.map((f) => (
          <label key={f.name} className="flex flex-col gap-0.5 text-[12px] text-muted">{f.label}
            <select className={cn(inputClass, "h-8 py-0 text-[13px]")} value={filters[f.name] ?? ""} onChange={(e) => setFilters({ ...filters, [f.name]: e.target.value })}>
              <option value="">Alle</option>
              {opts(f).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </label>
        ))}
        <span className="ml-auto text-[13px] text-muted num" aria-live="polite">{shown.length} van {rows.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <caption className="sr-only">{def.title}</caption>
          <thead className="bg-surface-muted text-left text-[12px] text-muted">
            <tr>
              {def.numberField && <th className="px-3 py-2 font-medium">Nr.</th>}
              {cols.map((f) => (
                <th key={f.name} className="px-3 py-2 font-medium whitespace-nowrap" aria-sort={sort?.k === f.name ? (sort.d === 1 ? "ascending" : "descending") : "none"}>
                  <button type="button" className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setSort({ k: f.name, d: sort?.k === f.name && sort.d === 1 ? -1 : 1 })}>
                    {f.label}{sort?.k === f.name && (sort.d === 1 ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />)}
                  </button>
                </th>
              ))}
              {def.key === "risks" && <th className="px-3 py-2 font-medium">Score</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-line hover:bg-surface-muted/60">
                {def.numberField && <td className="num px-3 py-2 text-muted whitespace-nowrap">{String(r[def.numberField])}</td>}
                {cols.map((f) => (
                  <td key={f.name} className="px-3 py-2 align-top">
                    {f.name === def.titleField ? <Link href={`${def.path}/detail?id=${r.id}`} className="font-medium text-ink hover:text-primary hover:underline">{String(r[f.name])}</Link> : render(r, f)}
                  </td>
                ))}
                {def.key === "risks" && <td className="px-3 py-2"><RiskScore gross={r.gross_score as number | null} residual={r.residual_score as number | null} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">{rows.length ? "Geen resultaten met deze filters." : def.emptyText ?? `Nog geen ${def.title.toLowerCase()} geregistreerd.`}</p>}
      </div>
    </div>
  );
}

export function RiskScore({ gross, residual }: { gross: number | null; residual: number | null }) {
  const s = residual ?? gross;
  if (s === null) return <span className="text-subtle">Nog niet beoordeeld</span>;
  return <Badge tone={s >= 15 ? "bad" : s >= 8 ? "warn" : "ok"}>{residual !== null ? `Rest ${residual}` : `Bruto ${gross}`}</Badge>;
}
