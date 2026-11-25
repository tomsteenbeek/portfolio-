"use client";
import Link from "next/link";
import { useState } from "react";
import { effectiveQuadrant, type Quadrant } from "@/lib/feasibility";

type Pt = { id: string; kind: "topic" | "project"; code: string; title: string; pillar_number: number; priority_score: number | null;
  priority_category: string | null; feasibility: number | null; protected: boolean; blocking: string[] };

const Q: { q: Quadrant; x: number; y: number; anchor: "start" | "end" }[] = [
  { q: "Randvoorwaarden organiseren", x: 6, y: 6, anchor: "start" },
  { q: "Direct oppakken", x: 94, y: 6, anchor: "end" },
  { q: "Uitstellen of heroverwegen", x: 6, y: 97, anchor: "start" },
  { q: "Mogelijke quick win", x: 94, y: 97, anchor: "end" },
];

/** Prioriteit (y) versus haalbaarheid (x). Ieder punt is aanklikbaar en toetsenbordbedienbaar. */
export function PriorityFeasibilityMatrix({ points, pT, fT }: { points: Pt[]; pT: number; fT: number }) {
  const [hover, setHover] = useState<Pt | null>(null);
  const placed = points.filter((p) => p.priority_score !== null && p.feasibility !== null);
  const missing = points.filter((p) => p.priority_score === null || p.feasibility === null);
  const href = (p: Pt) => (p.kind === "topic" ? `/onderwerpen/detail?id=${p.id}&tab=prioriteit` : `/projecten/detail?id=${p.id}`);
  const X = (f: number) => 8 + (f / 100) * 88;
  const Y = (p: number) => 94 - (p / 100) * 88;
  const byQ = (q: Quadrant) => placed.filter((p) => effectiveQuadrant(p.priority_score!, p.feasibility!, p.protected, pT, fT) === q);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-full rounded-lg border border-line bg-surface" role="group" aria-label="Matrix prioriteit versus haalbaarheid">
          <rect x={X(fT)} y={Y(100)} width={X(100) - X(fT)} height={Y(pT) - Y(100)} fill="var(--status-green-bg)" />
          <rect x={X(0)} y={Y(100)} width={X(fT) - X(0)} height={Y(pT) - Y(100)} fill="var(--status-amber-bg)" />
          <line x1={X(fT)} x2={X(fT)} y1={Y(100)} y2={Y(0)} stroke="var(--border-strong)" strokeWidth={0.2} />
          <line x1={X(0)} x2={X(100)} y1={Y(pT)} y2={Y(pT)} stroke="var(--border-strong)" strokeWidth={0.2} />
          {Q.map((q) => <text key={q.q} x={q.x} y={q.y} textAnchor={q.anchor} fontSize={2.4} fill="var(--text-muted)" fontWeight={600}>{q.q}</text>)}
          <text x={52} y={99.4} textAnchor="middle" fontSize={2.2} fill="var(--text-muted)">Haalbaarheid →</text>
          <text x={2} y={50} textAnchor="middle" fontSize={2.2} fill="var(--text-muted)" transform="rotate(-90 2 50)">Prioriteit →</text>
          {placed.map((p) => (
            <a key={p.id} href={href(p)} aria-label={`${p.code} ${p.title}: prioriteit ${Math.round(p.priority_score!)}, haalbaarheid ${Math.round(p.feasibility!)}`}
              onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(p)} onBlur={() => setHover(null)}>
              <circle cx={X(p.feasibility!)} cy={Y(p.priority_score!)} r={2.6} fill="transparent" />
              <circle cx={X(p.feasibility!)} cy={Y(p.priority_score!)} r={1.3} fill={p.kind === "project" ? "var(--chart-2)" : "var(--chart-1)"} stroke="var(--surface)" strokeWidth={0.4} />
              {p.protected && <circle cx={X(p.feasibility!)} cy={Y(p.priority_score!)} r={2} fill="none" stroke="var(--brand-accent)" strokeWidth={0.35} />}
            </a>
          ))}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute left-3 top-3 max-w-xs rounded-md border border-line bg-surface p-2.5 text-[13px] shadow-lg">
            <div className="font-medium">{hover.code} {hover.title}</div>
            <div className="num text-muted">Prioriteit {Math.round(hover.priority_score!)} {hover.priority_category ? `(${hover.priority_category})` : ""} · haalbaarheid {Math.round(hover.feasibility!)}</div>
            {hover.protected && <div className="text-accent">Verplicht/urgent – blijft in portfolio</div>}
            {hover.blocking.length > 0 && <div className="text-bad">Tekort: {hover.blocking.join(", ")}</div>}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-1)" }} />Onderwerp</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-2)" }} />Project</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2" style={{ borderColor: "var(--brand-accent)" }} />Verplicht / urgent</span>
          <span>Drempels: prioriteit {pT}, haalbaarheid {fT} (instelbaar)</span>
        </div>
      </div>
      <div className="space-y-3">
        {Q.map(({ q }) => (
          <details key={q} open={q !== "Mogelijke quick win"} className="rounded-lg border border-line bg-surface">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">{q} <span className="num text-muted">({byQ(q).length})</span></summary>
            <ul className="max-h-56 overflow-y-auto border-t border-line text-[13px]">
              {byQ(q).map((p) => <li key={p.id}><Link href={href(p)} className="block px-3 py-1.5 hover:bg-surface-muted">{p.code} {p.title}{p.blocking.length ? <span className="text-bad"> · tekort {p.blocking.join(", ").toLowerCase()}</span> : ""}</Link></li>)}
              {byQ(q).length === 0 && <li className="px-3 py-2 text-muted">Geen items</li>}
            </ul>
          </details>
        ))}
        {missing.length > 0 && (
          <details className="rounded-lg border border-line bg-surface">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Nog niet volledig beoordeeld <span className="num text-muted">({missing.length})</span></summary>
            <ul className="max-h-56 overflow-y-auto border-t border-line text-[13px]">
              {missing.map((p) => <li key={p.id}><Link href={href(p)} className="block px-3 py-1.5 hover:bg-surface-muted">{p.code} {p.title} <span className="text-muted">– {p.priority_score === null ? "prioriteit" : "haalbaarheid"} ontbreekt</span></Link></li>)}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
