"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import type { Criterion, SessionData } from "@/server/queries/priority";
import { ScoreInput } from "./score-input";
import { Button, LinkButton } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { finalizePriority, saveConsensus, setSessionStatus, submitAssessment } from "@/server/actions/priority";
import { SESSION_STATUSES } from "@/lib/domain";
import { cn } from "@/components/ui/cn";
import type { Category } from "@/lib/priority";

type Item = SessionData["items"][number];
type Assessment = SessionData["assessments"][number];

function ItemHeader({ item, large }: { item: Item; large?: boolean }) {
  return (
    <div>
      <div className="text-[12px] text-muted">{item.topic_id ? "Onderwerp" : "Project"} {item.code}{item.pillar_number ? ` · Pijler ${item.pillar_number}` : ""}</div>
      <h3 className={cn("font-semibold", large ? "text-2xl" : "text-[15px]")}>{item.label}</h3>
      {item.description && <p className={cn("mt-1 text-muted", large ? "text-[16px]" : "text-[13px]")}>{item.description}</p>}
      {item.flags.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{item.flags.map((f) => <Badge key={f} tone="accent">{f}</Badge>)}</div>}
    </div>
  );
}

/** Individueel beoordelen; in presentatiemodus één item tegelijk. */
export function AssessPanel({ data, userId, isMember, present }: { data: SessionData; userId: string; isMember: boolean; present?: boolean }) {
  const open = data.session.status === "Open voor beoordeling";
  const mine = (itemId: string) => data.assessments.find((a) => a.session_item_id === itemId && a.user_id === userId && !a.is_consensus);
  const [idx, setIdx] = useState(0);
  if (!isMember) return <p className="text-sm text-muted">U bent geen deelnemer aan deze sessie. De teamleider kan deelnemers toevoegen via Instellingen.</p>;
  if (!data.items.length) return <p className="text-sm text-muted">Er zijn nog geen onderwerpen aan deze sessie toegevoegd.</p>;
  const done = data.items.filter((i) => mine(i.id)).length;
  if (present) {
    const item = data.items[idx];
    return (
      <div className="presentation">
        <div className="mb-4 flex items-center justify-between">
          <span className="num text-muted">Item {idx + 1} van {data.items.length} · {done} beoordeeld</span>
          <div className="flex gap-2">
            <Button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}><ChevronLeft className="h-4 w-4" aria-hidden />Vorige</Button>
            <Button onClick={() => setIdx(Math.min(data.items.length - 1, idx + 1))} disabled={idx === data.items.length - 1}>Volgende<ChevronRight className="h-4 w-4" aria-hidden /></Button>
          </div>
        </div>
        <AssessItem key={item.id} item={item} criteria={data.criteria} existing={mine(item.id)} open={open} large onSaved={() => idx < data.items.length - 1 && setIdx(idx + 1)} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {open ? "Geef per onderwerp uw eigen, onafhankelijke beoordeling." : "Beoordelen is alleen mogelijk wanneer de sessie de status 'Open voor beoordeling' heeft."}
        {data.session.hide_individual && " Beoordelingen van anderen zijn verborgen tot de bespreking start."} <span className="num">{done} van {data.items.length} beoordeeld.</span>
      </p>
      {data.items.map((item) => (
        <details key={item.id} className="rounded-lg border border-line bg-surface" open={!mine(item.id) && open}>
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0"><span className="num text-muted">{item.code}</span> <span className="font-medium">{item.label}</span></span>
            {mine(item.id) ? <span className="flex items-center gap-2 text-[13px]"><PriorityBadge category={mine(item.id)!.category} /> <span className="num">{mine(item.id)!.total_score.toFixed(1).replace(".", ",")}</span></span> : <Badge tone="warn">Nog te beoordelen</Badge>}
          </summary>
          <div className="border-t border-line p-4"><AssessItem item={item} criteria={data.criteria} existing={mine(item.id)} open={open} /></div>
        </details>
      ))}
    </div>
  );
}

function AssessItem({ item, criteria, existing, open, large, onSaved }: { item: Item; criteria: Criterion[]; existing?: Assessment; open: boolean; large?: boolean; onSaved?: () => void }) {
  const [scores, setScores] = useState<Record<string, number | null>>(existing?.scores ?? {});
  const [rationale, setRationale] = useState(existing?.rationale ?? "");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="space-y-4">
      <ItemHeader item={item} large={large} />
      <ScoreInput criteria={criteria} value={scores} onChange={setScores} idPrefix={`a-${item.id}`} disabled={!open} large={large} />
      <div>
        <label htmlFor={`r-${item.id}`} className="text-[13px] font-medium">Onderbouwing</label>
        <textarea id={`r-${item.id}`} className={cn(inputClass, "mt-1")} rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} disabled={!open} />
      </div>
      {open && (
        <Button variant="primary" disabled={pending} onClick={() => start(async () => {
          const r = await submitAssessment(item.id, scores, rationale);
          toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error);
          if (r.ok) { router.refresh(); onSaved?.(); }
        })}>{existing ? `Beoordeling bijwerken (revisie ${existing.revision + 1})` : "Beoordeling opslaan"}</Button>
      )}
    </div>
  );
}

/** Consensus en definitieve vaststelling (teamleider). */
export function ConsensusPanel({ data, canConsensus, canFinalize, medians }: {
  data: SessionData; canConsensus: boolean; canFinalize: boolean; medians: Record<string, Record<string, number>>;
}) {
  const consensus = (itemId: string) => data.assessments.find((a) => a.session_item_id === itemId && a.is_consensus);
  return (
    <div className="space-y-4">
      {!canConsensus && !canFinalize && <p className="text-sm text-muted">Consensus wordt vastgelegd door de teamleider tijdens de bespreking.</p>}
      {data.items.map((item) => <ConsensusItem key={item.id} item={item} criteria={data.criteria} existing={consensus(item.id)} median={medians[item.id] ?? {}}
        canConsensus={canConsensus && data.session.status !== "Concept"} canFinalize={canFinalize} />)}
    </div>
  );
}

function ConsensusItem({ item, criteria, existing, median, canConsensus, canFinalize }: {
  item: Item; criteria: Criterion[]; existing?: Assessment; median: Record<string, number>; canConsensus: boolean; canFinalize: boolean;
}) {
  const [scores, setScores] = useState<Record<string, number | null>>(existing?.scores ?? median);
  const [note, setNote] = useState(existing?.rationale ?? "");
  const [final, setFinal] = useState<string>(item.final_category ?? item.consensus_category ?? "");
  const [why, setWhy] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const deviates = item.consensus_category && final && final !== item.consensus_category;
  return (
    <details className="rounded-lg border border-line bg-surface">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
        <span className="min-w-0"><span className="num text-muted">{item.code}</span> <span className="font-medium">{item.label}</span></span>
        <span className="flex items-center gap-2 text-[13px]">
          {item.consensus_category ? <>Consensus <PriorityBadge category={item.consensus_category} /></> : <span className="text-muted">Geen consensus</span>}
          {item.final_category && <>· Definitief <PriorityBadge category={item.final_category} /></>}
        </span>
      </summary>
      <div className="grid gap-6 border-t border-line p-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Gezamenlijke consensusbeoordeling</h4>
          <p className="text-[12px] text-muted">Voorgevuld met de mediaan per criterium van de individuele beoordelingen.</p>
          <ScoreInput criteria={criteria} value={scores} onChange={setScores} idPrefix={`c-${item.id}`} disabled={!canConsensus} />
          <label htmlFor={`cn-${item.id}`} className="text-[13px] font-medium">Toelichting consensus</label>
          <textarea id={`cn-${item.id}`} className={inputClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} disabled={!canConsensus} />
          {canConsensus && <Button variant="secondary" disabled={pending} onClick={() => start(async () => {
            const r = await saveConsensus(item.id, scores, note); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); router.refresh();
          })}>Consensus vastleggen</Button>}
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Definitieve prioriteit</h4>
          {item.final_category && <p className="text-[13px]">Vastgesteld: <PriorityBadge category={item.final_category} />{item.final_rationale ? ` – ${item.final_rationale}` : ""}</p>}
          {canFinalize ? (
            <>
              <label htmlFor={`f-${item.id}`} className="text-[13px] font-medium">Categorie</label>
              <select id={`f-${item.id}`} className={inputClass} value={final} onChange={(e) => setFinal(e.target.value)}>
                <option value="">Kies…</option>{["P1", "P2", "P3", "P4"].map((p) => <option key={p}>{p}</option>)}
              </select>
              <label htmlFor={`w-${item.id}`} className="text-[13px] font-medium">Motivering {deviates && <span className="text-bad">(verplicht: afwijking van consensus {item.consensus_category})</span>}</label>
              <textarea id={`w-${item.id}`} className={inputClass} rows={2} value={why} onChange={(e) => setWhy(e.target.value)} aria-invalid={Boolean(deviates && why.trim().length < 10)} />
              {item.flags.length > 0 && (final === "P3" || final === "P4") && (
                <p className="rounded bg-accent-soft px-2 py-1.5 text-[12px] text-accent">Let op: dit initiatief is gemarkeerd als {item.flags.join(", ").toLowerCase()}. Een lage prioriteit mag het niet uitsluiten; leg vast hoe aan de verplichting wordt voldaan.</p>
              )}
              <Button variant="primary" disabled={pending || !final} onClick={() => start(async () => {
                const r = await finalizePriority(item.id, final as Category, why); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); if (r.ok) { setWhy(""); router.refresh(); }
              })}>Definitief vaststellen</Button>
            </>
          ) : <p className="text-[13px] text-muted">Alleen de teamleider stelt de definitieve prioriteit vast.</p>}
        </div>
      </div>
    </details>
  );
}

export function StatusControl({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const next: Record<string, string | undefined> = { Concept: "Open voor beoordeling", "Open voor beoordeling": "Bespreking", Bespreking: "Afgerond" };
  const label: Record<string, string> = { "Open voor beoordeling": "Open stemmen", Bespreking: "Stemmen sluiten en resultaten tonen", Afgerond: "Sessie afronden" };
  const n = next[status];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {n && <Button variant="primary" disabled={pending} onClick={() => {
        if (!confirm(`${label[n]}?`)) return;
        start(async () => { const r = await setSessionStatus(id, n as (typeof SESSION_STATUSES)[number]); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); router.refresh(); });
      }}>{label[n]}</Button>}
      {status !== "Concept" && status !== "Open voor beoordeling" && (
        <Button variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await setSessionStatus(id, "Open voor beoordeling"); toast(r.ok ? "ok" : "error", r.ok ? "Sessie heropend" : r.error); router.refresh(); })}>Heropenen</Button>
      )}
    </div>
  );
}

export function PresentLink({ id, tab }: { id: string; tab: string }) {
  return <LinkButton href={`/prioritering/${id}/presentatie?tab=${tab}`} variant="secondary"><Maximize2 className="h-4 w-4" aria-hidden />Presentatiemodus</LinkButton>;
}

export function BackLink({ href }: { href: string }) {
  return <Link href={href} className="text-[13px] text-primary hover:underline">← Terug</Link>;
}
