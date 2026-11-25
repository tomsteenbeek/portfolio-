"use client";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Textarea } from "@/components/ui/field";
import { addComment } from "@/server/actions/topics";

export function ActionFormComments({ entityType, entityId }: { entityType: string; entityId: string }) {
  return (
    <ActionForm action={addComment} success="Opmerking geplaatst" resetOnSuccess className="space-y-2">
      <input type="hidden" name="entity_type" value={entityType} />
      <input type="hidden" name="entity_id" value={entityId} />
      <label htmlFor={`c-${entityId}`} className="sr-only">Nieuwe opmerking</label>
      <Textarea id={`c-${entityId}`} name="body" rows={2} placeholder="Opmerking toevoegen…" required maxLength={5000} />
      <SubmitButton size="sm" variant="secondary">Plaatsen</SubmitButton>
    </ActionForm>
  );
}
