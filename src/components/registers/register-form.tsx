"use client";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveRecord } from "@/server/actions/registers";
import type { RegisterDef } from "@/lib/registers";
import type { RefOptions } from "@/server/queries/registers";
import { cn } from "@/components/ui/cn";

export function RegisterForm({ def, record, refs, disabled, defaults }: {
  def: RegisterDef; record?: Record<string, unknown> | null; refs: RefOptions; disabled?: boolean; defaults?: Record<string, string>;
}) {
  const sections = [...new Set(def.fields.map((f) => f.section ?? ""))];
  const val = (n: string) => {
    const v = record?.[n] ?? defaults?.[n];
    return v === null || v === undefined ? "" : String(v);
  };
  return (
    <ActionForm action={saveRecord} success="Opgeslagen" className="space-y-6">
      {(state) => (
        <>
          <input type="hidden" name="__register" value={def.key} />
          {record?.id ? <input type="hidden" name="id" value={String(record.id)} /> : null}
          {sections.map((s) => (
            <fieldset key={s} className="grid gap-4 md:grid-cols-2" disabled={disabled}>
              {s && <legend className="mb-1 text-sm font-semibold md:col-span-2">{s}</legend>}
              {def.fields.filter((f) => (f.section ?? "") === s).map((f) => {
                const id = `${def.key}-${f.name}`;
                const err = fieldError(state, f.name);
                const common = { id, name: f.name, "aria-invalid": Boolean(err), "aria-describedby": f.hint ? `${id}-hint` : undefined };
                if (f.type === "bool") return <div key={f.name} className={cn("md:col-span-2")}><Checkbox name={f.name} label={f.label} defaultChecked={record?.[f.name] === true} />{f.hint && <p className="ml-6 text-[12px] text-muted">{f.hint}</p>}</div>;
                return (
                  <Field key={f.name} label={f.label} htmlFor={id} required={f.required} hint={f.hint} error={err} className={cn((f.wide || f.type === "textarea") && "md:col-span-2")}>
                    {f.type === "textarea" ? <Textarea {...common} defaultValue={val(f.name)} rows={3} />
                      : f.type === "select" ? <Select {...common} options={f.options ?? []} placeholder={f.required ? undefined : "—"} defaultValue={val(f.name)} required={f.required} />
                      : f.type === "ref" ? <Select {...common} options={(refs[f.ref!] ?? []).map((o) => ({ value: o.id, label: o.label }))} placeholder={f.required ? "Kies…" : "—"} defaultValue={val(f.name)} required={f.required} />
                      : f.type === "score" ? <Select {...common} options={["1", "2", "3", "4", "5"]} placeholder="Nog niet beoordeeld" defaultValue={val(f.name)} />
                      : <Input {...common} type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "url" ? "url" : "text"} step={f.type === "number" ? "any" : undefined}
                          min={f.min} max={f.max} defaultValue={val(f.name)} required={f.required} />}
                  </Field>
                );
              })}
            </fieldset>
          ))}
          {!disabled && <div className="border-t border-line pt-4"><SubmitButton>{record?.id ? "Opslaan" : `${def.singular[0].toUpperCase()}${def.singular.slice(1)} toevoegen`}</SubmitButton></div>}
        </>
      )}
    </ActionForm>
  );
}
