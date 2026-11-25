import type { ReactNode } from "react";
import { cn } from "./cn";

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral" | "primary" | "accent";

const toneClass: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  info: "bg-info-bg text-info",
  neutral: "bg-neutral-bg text-neutral",
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
};

export function Badge({ tone = "neutral", children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px] font-medium leading-none whitespace-nowrap", toneClass[tone], className)}>
      {children}
    </span>
  );
}

const pColor: Record<string, string> = { P1: "bg-p1 text-white", P2: "bg-p2 text-white", P3: "bg-p3 text-ink", P4: "bg-p4 text-ink" };

export function PriorityBadge({ category, final }: { category: string | null | undefined; final?: boolean }) {
  if (!category) return <span className="text-[12px] text-subtle">Nog niet beoordeeld</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-flex h-5 min-w-7 items-center justify-center rounded px-1 text-[12px] font-semibold", pColor[category])}>{category}</span>
      {final === false && <span className="text-[11px] text-subtle">voorlopig</span>}
    </span>
  );
}

const statusTone: Record<string, Tone> = {
  "Te valideren": "warn",
  "In beoordeling": "info",
  Gevalideerd: "ok",
  "Niet relevant": "neutral",
  Samengevoegd: "neutral",
  Gesplitst: "neutral",
  "Omgezet naar project": "primary",
  Idee: "neutral",
  "Te onderzoeken": "neutral",
  "In voorbereiding": "info",
  "Ter besluitvorming": "warn",
  Goedgekeurd: "ok",
  Gepland: "info",
  "In uitvoering": "primary",
  Geblokkeerd: "bad",
  Gepauzeerd: "warn",
  Afgerond: "ok",
  Geannuleerd: "neutral",
  Concept: "neutral",
  "In bespreking": "info",
  Vastgesteld: "ok",
  "Geëvalueerd": "neutral",
  Openstaand: "warn",
  Akkoord: "ok",
  "Akkoord met wijzigingen": "ok",
  Uitgesteld: "warn",
  Afgewezen: "bad",
  Ingetrokken: "neutral",
  Signaal: "warn",
  Geaccepteerd: "neutral",
  Gesloten: "neutral",
  "Open voor beoordeling": "info",
  Bespreking: "warn",
  "Ter goedkeuring": "warn",
  Actief: "primary",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-subtle">—</span>;
  return <Badge tone={statusTone[status] ?? "neutral"}>{status}</Badge>;
}

const ragColor: Record<string, string> = { groen: "bg-ok", oranje: "bg-[#d69e2e]", rood: "bg-bad" };

export function Rag({ value, label }: { value: string | null | undefined; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]" title={`${label}: ${value ?? "onbekend"}`}>
      <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full border border-black/10", value ? ragColor[value] : "bg-surface-muted")} />
      <span className="text-muted">{label}</span>
      <span className="sr-only">{value ?? "onbekend"}</span>
    </span>
  );
}

export const MATURITY_LABELS = ["", "Ad hoc", "Reactief", "Gestandaardiseerd", "Beheerst", "Geoptimaliseerd"];

export function Maturity({ level }: { level: number | null | undefined }) {
  if (!level) return <span className="text-[12px] text-subtle">Nog niet beoordeeld</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]" title={`Niveau ${level}: ${MATURITY_LABELS[level]}`}>
      <span className="inline-flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn("h-2.5 w-2.5 rounded-sm", i <= level ? "bg-primary" : "bg-line")} />
        ))}
      </span>
      <span>{level} · {MATURITY_LABELS[level]}</span>
    </span>
  );
}
