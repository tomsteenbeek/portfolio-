"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, CircleDot, Layers, Maximize2, Plus } from "lucide-react";
import { DeepdiveForm } from "@/components/topics/deepdive-form";
import { MaturityForm } from "@/components/topics/maturity-form";
import { Button, LinkButton, buttonClasses } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/components/ui/cn";
import { quickAddTopic, touchWorkSession } from "@/server/actions/sessions";

export type DDTopic = { id: string; code: string; title: string; status: string; description: string | null; program_name: string | null;
  priority_category: string | null; maturity_current: number | null; maturity_target: number | null; assessment_status: string | null; answers: Record<string, string> | null; flags: boolean };

export function Walkthrough({ pillar, topics, current, canEdit, canApprove, present }: {
  pillar: { id: string; number: number; title: string }; topics: DDTopic[]; current: string | null; canEdit: boolean; canApprove: boolean; present?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newTitle, setNewTitle] = useState("");
  const idx = Math.max(0, topics.findIndex((t) => t.id === current));
  const t = topics[idx];
  const base = present ? `/presentatie/deepdive/${pillar.number}` : `/deepdive/${pillar.number}`;
  const go = (i: number) => router.push(`${base}?t=${topics[i].id}`);

  useEffect(() => {
    if (t && canEdit) touchWorkSession("Deepdive", `Deepdive pijler ${pillar.number}`, pillar.id, { topicId: t.id, code: t.code });
  }, [t, canEdit, pillar]);

  const icon = (x: DDTopic) => x.assessment_status === "Goedgekeurd" ? <CheckCircle2 className="h-4 w-4 text-ok" aria-label="Goedgekeurd" />
    : x.answers && Object.keys(x.answers).length ? <CircleDot className="h-4 w-4 text-info" aria-label="In bewerking" /> : <Circle className="h-4 w-4 text-subtle" aria-label="Nog niet besproken" />;
  const done = topics.filter((x) => x.assessment_status === "Goedgekeurd").length;
  const started = topics.filter((x) => x.answers && Object.keys(x.answers).length).length;

  return (
    <div className={cn("grid gap-4", present ? "lg:grid-cols-[300px_1fr]" : "lg:grid-cols-[320px_1fr]")}>
      <aside className="rounded-lg border border-line bg-surface lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <div className="border-b border-line p-3 text-[13px]">
          <div className="num text-muted">{started} besproken · {done} goedgekeurd · {topics.length} totaal</div>
          <div className="mt-1.5 flex h-1.5 gap-[2px] overflow-hidden rounded" aria-hidden>
            <span className="bg-ok" style={{ width: `${(done / Math.max(1, topics.length)) * 100}%` }} />
            <span className="bg-info" style={{ width: `${((started - done) / Math.max(1, topics.length)) * 100}%` }} />
          </div>
        </div>
        <ol>
          {topics.map((x, i) => (
            <li key={x.id} className={cn("flex items-start gap-2 border-b border-line px-3 py-2 text-[13px]", i === idx && "bg-primary-soft")}>
              {canEdit && !present && (
                <input type="checkbox" className="mt-0.5 h-4 w-4" aria-label={`Selecteer ${x.code}`} checked={selected.has(x.id)}
                  onChange={(e) => { const s = new Set(selected); if (e.target.checked) s.add(x.id); else s.delete(x.id); setSelected(s); }} />
              )}
              <span className="mt-0.5">{icon(x)}</span>
              <Link href={`${base}?t=${x.id}`} aria-current={i === idx ? "step" : undefined} className={cn("min-w-0 flex-1 hover:text-primary", i === idx && "font-semibold text-primary")}>
                <span className="num text-muted">{x.code}</span> {x.title}
                {x.status === "Niet relevant" && <span className="ml-1 text-[11px] text-subtle">(niet relevant)</span>}
              </Link>
            </li>
          ))}
        </ol>
        {canEdit && (
          <form className="flex gap-2 p-3" onSubmit={(e) => {
            e.preventDefault();
            start(async () => { const r = await quickAddTopic(pillar.id, newTitle); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); if (r.ok) { setNewTitle(""); router.push(`${base}?t=${r.id}`); router.refresh(); } });
          }}>
            <label htmlFor="dd-new" className="sr-only">Nieuw onderwerp</label>
            <input id="dd-new" className={cn(inputClass, "h-8 text-[13px]")} placeholder="Nieuw onderwerp…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <button type="submit" className={buttonClasses("secondary", "sm")} aria-label="Onderwerp toevoegen"><Plus className="h-4 w-4" /></button>
          </form>
        )}
        {selected.size > 0 && (
          <div className="sticky bottom-0 border-t border-line bg-primary-soft p-3 text-[13px]">
            <strong>{selected.size} geselecteerd</strong>
            <Link className={cn(buttonClasses("primary", "sm"), "mt-2 w-full")} href={`/deepdive/bundelen?ids=${[...selected].join(",")}&terug=${pillar.number}`}>
              <Layers className="h-4 w-4" aria-hidden />Bundelen, samenvoegen of omzetten
            </Link>
          </div>
        )}
      </aside>
      {t ? (
        <section className="space-y-4" aria-labelledby="dd-title">
          <div className="rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] text-muted">Pijler {pillar.number} · onderwerp {idx + 1} van {topics.length}</div>
                <h2 id="dd-title" className={cn("font-semibold", present ? "text-3xl" : "text-xl")}><span className="num text-muted font-normal">{t.code}</span> {t.title}</h2>
                <div className="mt-1.5 flex flex-wrap gap-1.5"><StatusBadge status={t.status} /><PriorityBadge category={t.priority_category} />{t.program_name && <Badge tone="primary">{t.program_name}</Badge>}{t.flags && <Badge tone="accent">Verplicht/urgent</Badge>}</div>
                {t.description && <p className="mt-2 text-sm text-muted">{t.description}</p>}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => go(idx - 1)} disabled={idx === 0}><ChevronLeft className="h-4 w-4" aria-hidden />Vorige</Button>
                <Button onClick={() => go(idx + 1)} disabled={idx >= topics.length - 1}>Volgende<ChevronRight className="h-4 w-4" aria-hidden /></Button>
                {!present && <LinkButton href={`/presentatie/deepdive/${pillar.number}?t=${t.id}`} variant="ghost" aria-label="Presentatiemodus"><Maximize2 className="h-4 w-4" /></LinkButton>}
                {!present && <LinkButton href={`/onderwerpen/${t.id}`} variant="ghost">Details</LinkButton>}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-surface p-5">
            <DeepdiveForm key={t.id} topicId={t.id} answers={t.answers ?? {}} status={t.assessment_status} canEdit={canEdit} canApprove={canApprove} large={present} />
          </div>
          {canEdit && (
            <details className="rounded-lg border border-line bg-surface p-5">
              <summary className="cursor-pointer font-medium">Volwassenheid {t.maturity_current ? `(huidig ${t.maturity_current} → gewenst ${t.maturity_target})` : "(nog niet beoordeeld)"}</summary>
              <div className="mt-4"><MaturityForm key={t.id} topicId={t.id} current={t.maturity_current} target={t.maturity_target} /></div>
            </details>
          )}
        </section>
      ) : <p className="text-sm text-muted">Geen onderwerpen in deze pijler.</p>}
    </div>
  );
}
