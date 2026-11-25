"use client";
import { refreshData } from "@/lib/refresh";
import { useRouter } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input, Select } from "@/components/ui/field";
import { addSource, removeSource } from "@/server/actions/topics";
import { SOURCE_TYPES } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { fmtDate } from "@/lib/format";

type Src = { id: string; source_type: string; reference: string | null; note: string | null; created_at: string; raw: Record<string, unknown> | null; batch_file: string | null; row_number: number | null };

export function SourcesPanel({ topicId, sources, canEdit }: { topicId: string; sources: Src[]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {sources.map((s) => (
          <li key={s.id} className="rounded-md border border-line p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={s.source_type === "Nog te valideren" ? "warn" : "primary"}>{s.source_type}</Badge>
              {s.reference && <span>{s.reference}</span>}
              <span className="text-[12px] text-muted">{fmtDate(s.created_at)}</span>
              {canEdit && (
                <button type="button" className="ml-auto text-[12px] text-bad hover:underline"
                  onClick={async () => { if (!confirm("Koppeling verwijderen? De oorspronkelijke input blijft bewaard.")) return; const r = await removeSource(s.id); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); refreshData(); }}>
                  Ontkoppelen
                </button>
              )}
            </div>
            {s.note && <p className="mt-1 text-[13px] text-muted">{s.note}</p>}
            {s.raw && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[13px] text-primary">Oorspronkelijke input{ s.batch_file ? ` (${s.batch_file}, rij ${s.row_number})` : ""}</summary>
                <dl className="mt-2 grid gap-1 rounded bg-surface-muted p-2 text-[13px]">
                  {Object.entries(s.raw).map(([k, v]) => <div key={k} className="grid grid-cols-[160px_1fr] gap-2"><dt className="text-muted">{k}</dt><dd className="whitespace-pre-wrap">{String(v ?? "")}</dd></div>)}
                </dl>
              </details>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
        <ActionForm action={addSource} success="Bron gekoppeld" resetOnSuccess className="grid gap-3 rounded-md border border-dashed border-line-strong p-3 sm:grid-cols-[200px_1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="topic_id" value={topicId} />
          <Field label="Brontype" htmlFor="src-type"><Select id="src-type" name="source_type" options={SOURCE_TYPES} /></Field>
          <Field label="Verwijzing" htmlFor="src-ref"><Input id="src-ref" name="reference" placeholder="bv. besluitnummer, wetsartikel" /></Field>
          <Field label="Toelichting" htmlFor="src-note"><Input id="src-note" name="note" /></Field>
          <SubmitButton variant="secondary">Toevoegen</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
