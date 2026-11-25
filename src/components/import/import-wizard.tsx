"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Select, inputClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cancelImport, commitImport, previewImport, uploadImport } from "@/server/actions/import";
import { IMPORT_KINDS } from "@/lib/import-config";

export function UploadForm() {
  const [kind, setKind] = useState("medewerkersinput");
  return (
    <ActionForm action={uploadImport} success="Bestand ingelezen" className="grid gap-4 md:grid-cols-[260px_1fr_auto] md:items-end">
      <Field label="Soort import" htmlFor="imp-kind"><Select id="imp-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)} options={Object.entries(IMPORT_KINDS).map(([k, v]) => ({ value: k, label: v.label }))} /></Field>
      <Field label="Bestand (.xlsx, .csv of .json, max. 10 MB)" htmlFor="imp-file" hint={IMPORT_KINDS[kind].description}>
        <input id="imp-file" name="file" type="file" required accept=".xlsx,.csv,.json" className={`${inputClass} py-1.5`} />
      </Field>
      <SubmitButton>Inlezen en voorbeeld tonen</SubmitButton>
    </ActionForm>
  );
}

type Preview = Awaited<ReturnType<typeof previewImport>>;

export function MappingStep({ batch }: { batch: { id: string; kind: string; file_name: string; row_count: number; headers: string[]; mapping: Record<string, string> | null } }) {
  const cfg = IMPORT_KINDS[batch.kind];
  const guess = (label: string, key: string) => batch.headers.find((h) => { const x = h.toLowerCase(); return x === key || x.includes(label.toLowerCase().split(" ")[0]); }) ?? "";
  const [mapping, setMapping] = useState<Record<string, string>>(batch.mapping ?? Object.fromEntries(cfg.fields.map((f) => [f.key, guess(f.label, f.key)])));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [skip, setSkip] = useState(true);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const refresh = () => start(async () => setPreview(await previewImport(batch.id, mapping)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);
  const ok = preview?.ok ? preview : null;
  return (
    <div className="space-y-5">
      <p className="text-sm">Bestand <strong>{batch.file_name}</strong> · {batch.row_count} rijen · {cfg.label}. Er is nog niets opgeslagen.</p>
      <fieldset className="grid gap-3 md:grid-cols-3">
        <legend className="mb-1 text-sm font-semibold">Kolommen koppelen aan velden</legend>
        {cfg.fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-[13px]">
            <span className="font-medium">{f.label}{f.required && <span className="text-bad"> *</span>}</span>
            <select className={inputClass} value={mapping[f.key] ?? ""} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}>
              <option value="">— niet importeren —</option>{batch.headers.map((h) => <option key={h}>{h}</option>)}
            </select>
            {f.hint && <span className="text-[12px] text-muted">{f.hint}</span>}
          </label>
        ))}
      </fieldset>
      <Button onClick={refresh} disabled={pending}>Voorbeeld bijwerken</Button>
      {preview && !preview.ok && <p className="text-sm text-bad">{preview.error}</p>}
      {ok && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge tone="info">{ok.total} rijen</Badge><Badge tone={ok.errors ? "bad" : "ok"}>{ok.errors} met fouten</Badge><Badge tone={ok.duplicates ? "warn" : "ok"}>{ok.duplicates} mogelijke duplicaten</Badge>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-md border border-line">
            <table className="w-full text-[12px]"><caption className="sr-only">Voorbeeld import</caption>
              <thead className="sticky top-0 bg-surface-muted text-left text-muted"><tr><th className="p-1.5">#</th>{cfg.fields.filter((f) => mapping[f.key]).map((f) => <th key={f.key} className="p-1.5">{f.label}</th>)}<th className="p-1.5">Controle</th></tr></thead>
              <tbody>{ok.rows.map((r, i) => (
                <tr key={i} className="border-t border-line align-top">
                  <td className="p-1.5 text-muted">{i + 2}</td>
                  {cfg.fields.filter((f) => mapping[f.key]).map((f) => <td key={f.key} className="max-w-56 truncate p-1.5">{String(r.v[f.key] ?? r.v[`${f.key}_id`] ?? r.v[f.key === "pillar" ? "pillar_id" : f.key] ?? "")}</td>)}
                  <td className="p-1.5">{r.errors.map((e) => <div key={e} className="text-bad">{e}</div>)}{r.duplicate && <Badge tone="warn">{r.duplicate}</Badge>}{!r.errors.length && !r.duplicate && <span className="text-ok">OK</span>}</td>
                </tr>))}</tbody>
            </table>
          </div>
          {ok.total > 200 && <p className="text-[12px] text-muted">Eerste 200 rijen getoond.</p>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} /> Duplicaten overslaan</label>
          <div className="flex gap-2">
            <Button variant="primary" disabled={pending || ok.errors > 0} onClick={() => {
              if (!confirm(`Import definitief uitvoeren? ${ok.total - (skip ? ok.duplicates : 0)} rij(en) worden opgeslagen.`)) return;
              start(async () => { const r = await commitImport(batch.id, mapping, skip); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); if (r.ok) router.push("/beheer/import-export"); });
            }}>Import bevestigen</Button>
            <Button variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await cancelImport(batch.id); toast(r.ok ? "ok" : "error", r.ok ? r.message ?? "" : r.error); router.push("/beheer/import-export"); })}>Annuleren</Button>
          </div>
          {ok.errors > 0 && <p className="text-[13px] text-bad">Los eerst de fouten op (andere kolomkoppeling of gecorrigeerd bestand).</p>}
        </>
      )}
    </div>
  );
}
