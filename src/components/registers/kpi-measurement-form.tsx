"use client";
import { ActionForm, SubmitButton, fieldError } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/field";
import { addMeasurement } from "@/server/actions/kpi";

export function KpiMeasurementForm({ kpiId }: { kpiId: string }) {
  return (
    <ActionForm action={addMeasurement} success="Meting vastgelegd" resetOnSuccess className="grid gap-3 sm:grid-cols-[160px_140px_1fr_auto] sm:items-end">
      {(state) => (<>
        <input type="hidden" name="kpi_id" value={kpiId} />
        <Field label="Meetdatum" htmlFor="m-date" required error={fieldError(state, "measured_on")}><Input id="m-date" name="measured_on" type="date" required /></Field>
        <Field label="Waarde" htmlFor="m-val" required error={fieldError(state, "value")}><Input id="m-val" name="value" type="number" step="any" required /></Field>
        <Field label="Toelichting / bron" htmlFor="m-note"><Input id="m-note" name="note" /></Field>
        <SubmitButton variant="secondary">Toevoegen</SubmitButton>
      </>)}
    </ActionForm>
  );
}
