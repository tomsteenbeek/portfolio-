"use client";
import { refreshData } from "@/lib/refresh";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { DEEPDIVE_QUESTIONS } from "@/lib/domain";
import { approveAssessment, saveAssessment } from "@/server/actions/topics";
import { inputClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { cn } from "@/components/ui/cn";

/** De 15 deepdivevragen met autosave (1,2 s na laatste wijziging). */
export function DeepdiveForm({ topicId, answers, status, canEdit, canApprove, large }: {
  topicId: string; answers: Record<string, string>; status: string | null; canEdit: boolean; canApprove: boolean; large?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(answers ?? {});
  const [state, setState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();
  const router = useRouter();
  const [, start] = useTransition();
  const locked = status === "Goedgekeurd" && !canApprove;

  useEffect(() => { setValues(answers ?? {}); setState("idle"); }, [topicId, answers]);

  const persist = async (v: Record<string, string>, submit?: "Ter goedkeuring") => {
    setState("saving");
    const r = await saveAssessment(topicId, v, submit);
    setState(r.ok ? "saved" : "error");
    if (!r.ok) toast("error", r.error);
    else if (submit) { toast("ok", r.message ?? ""); refreshData(); }
  };
  const onChange = (k: string, val: string) => {
    const next = { ...values, [k]: val };
    setValues(next);
    setState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(next), 1200);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const answered = DEEPDIVE_QUESTIONS.filter((q) => values[q.key]?.trim()).length;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-[13px]">
        <span className="text-muted">Beoordeling:</span> <StatusBadge status={status ?? "Concept"} />
        <span className="num text-muted">{answered} van {DEEPDIVE_QUESTIONS.length} vragen beantwoord</span>
        <span aria-live="polite" className="ml-auto inline-flex items-center gap-1 text-muted">
          {state === "saving" && <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Opslaan…</>}
          {state === "saved" && <><Check className="h-3.5 w-3.5 text-ok" aria-hidden />Automatisch opgeslagen</>}
          {state === "dirty" && "Wijzigingen niet opgeslagen"}
          {state === "error" && <span className="text-bad">Opslaan mislukt</span>}
        </span>
      </div>
      <ol className={cn("grid gap-4", large ? "md:grid-cols-2" : "")}>
        {DEEPDIVE_QUESTIONS.map((q, i) => (
          <li key={q.key}>
            <label htmlFor={`${topicId}-${q.key}`} className={cn("block font-medium", large ? "text-[16px]" : "text-[13px]")}>
              <span className="num text-muted">{i + 1}.</span> {q.label}
            </label>
            {"hint" in q && q.hint && <p id={`${topicId}-${q.key}-hint`} className="text-[12px] text-muted">{q.hint}</p>}
            <textarea
              id={`${topicId}-${q.key}`}
              aria-describedby={"hint" in q && q.hint ? `${topicId}-${q.key}-hint` : undefined}
              className={cn(inputClass, "mt-1", large && "text-[15px]")}
              rows={q.key === "q1" || q.key === "q15" || q.key === "q13" ? 2 : 3}
              value={values[q.key] ?? ""}
              disabled={!canEdit || locked}
              onChange={(e) => onChange(q.key, e.target.value)}
              onBlur={() => { if (state === "dirty") { if (timer.current) clearTimeout(timer.current); persist(values); } }}
            />
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        {canEdit && status !== "Goedgekeurd" && status !== "Ter goedkeuring" && (
          <Button variant="secondary" onClick={() => persist(values, "Ter goedkeuring")}>Aanbieden ter goedkeuring</Button>
        )}
        {canApprove && status !== "Goedgekeurd" && (
          <>
            <Button variant="primary" onClick={() => start(async () => { const r = await approveAssessment(topicId, "approve"); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); refreshData(); })}>
              Goedkeuren en valideren
            </Button>
            <Button variant="danger" onClick={() => { if (confirm("Onderwerp als niet relevant vaststellen? Het blijft bewaard en raadpleegbaar.")) start(async () => { const r = await approveAssessment(topicId, "notRelevant"); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); refreshData(); }); }}>
              Niet relevant
            </Button>
          </>
        )}
        {canApprove && status === "Goedgekeurd" && (
          <Button variant="ghost" onClick={() => start(async () => { const r = await approveAssessment(topicId, "reopen"); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); refreshData(); })}>Heropenen</Button>
        )}
        {locked && <p className="text-[13px] text-muted">Goedgekeurde beoordelingen kunnen alleen door de teamleider worden gewijzigd.</p>}
      </div>
    </div>
  );
}
