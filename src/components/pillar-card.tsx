import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PillarCard as P } from "@/server/queries/dashboard";
import { fmtDate, fmtEuro, fmtHours, fmtPct } from "@/lib/format";
import { Badge, Maturity } from "@/components/ui/badge";

function riskTone(score: number | null): { tone: "ok" | "warn" | "bad" | "neutral"; label: string } {
  if (score === null) return { tone: "neutral", label: "Geen open risico's" };
  if (score >= 15) return { tone: "bad", label: `Hoog (max. ${score})` };
  if (score >= 8) return { tone: "warn", label: `Midden (max. ${score})` };
  return { tone: "ok", label: `Laag (max. ${score})` };
}

export function PriorityDistribution({ p1, p2, p3, p4, unprioritized }: { p1: number; p2: number; p3: number; p4: number; unprioritized: number }) {
  const total = p1 + p2 + p3 + p4 + unprioritized;
  const seg = [
    { k: "P1", v: p1, c: "bg-p1" }, { k: "P2", v: p2, c: "bg-p2" }, { k: "P3", v: p3, c: "bg-p3" }, { k: "P4", v: p4, c: "bg-p4" },
    { k: "Nog niet beoordeeld", v: unprioritized, c: "bg-line" },
  ];
  if (total === 0) return <span className="text-[12px] text-subtle">Geen onderwerpen</span>;
  return (
    <div>
      <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-sm" aria-hidden>
        {seg.filter((s) => s.v > 0).map((s) => <span key={s.k} className={s.c} style={{ width: `${(s.v / total) * 100}%` }} />)}
      </div>
      <p className="mt-1 text-[12px] text-muted num">
        {p1 + p2 + p3 + p4 === 0
          ? `${unprioritized} nog niet geprioriteerd`
          : `P1 ${p1} · P2 ${p2} · P3 ${p3} · P4 ${p4} · open ${unprioritized}`}
      </p>
    </div>
  );
}

export function PillarCard({ p, canFinance }: { p: P; canFinance: boolean }) {
  const risk = riskTone(p.max_risk);
  return (
    <Link href={`/pijlers/detail?nr=${p.number}`} className="group flex flex-col rounded-lg border border-line bg-surface p-4 shadow-card transition-colors hover:border-primary">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-primary">Pijler {p.number}</div>
        <ArrowUpRight aria-hidden className="h-4 w-4 text-subtle group-hover:text-primary" />
      </div>
      <h3 className="mt-1 text-[16px] font-semibold leading-snug">{p.title}</h3>
      <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-muted">{p.objective}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
        <div><dt className="text-[11px] text-muted">Onderwerpen</dt><dd className="num text-lg font-semibold">{p.topics}</dd></div>
        <div><dt className="text-[11px] text-muted">Programma&apos;s</dt><dd className="num text-lg font-semibold">{p.programs}</dd></div>
        <div><dt className="text-[11px] text-muted">Actief</dt><dd className="num text-lg font-semibold">{p.active_projects}</dd></div>
      </dl>
      <div className="mt-3"><PriorityDistribution {...p} /></div>
      <dl className="mt-3 space-y-1.5 text-[13px]">
        <Row label="Voortgang" value={p.progress === null ? <span className="text-subtle">Onbekend</span> : fmtPct(p.progress)} />
        <Row label="Volwassenheid" value={<Maturity level={p.maturity_current} />} />
        <Row label="Risicostatus" value={<Badge tone={risk.tone}>{risk.label}</Badge>} />
        <Row label="Capaciteit" value={p.req_hours === null ? <span className="text-subtle">Nog niet geraamd</span> : `${fmtHours(p.req_hours)} benodigd`} />
        <Row label="Budget" value={!canFinance ? <span className="text-subtle">Afgeschermd</span>
          : p.req_budget === null && p.avail_budget === null ? <span className="text-subtle">Nog niet geraamd</span>
          : `${fmtEuro(p.req_budget)} / ${fmtEuro(p.avail_budget)}`} />
      </dl>
      <div className="mt-auto pt-3 text-[12px] text-subtle">Laatste update: {fmtDate(p.last_update)}</div>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
