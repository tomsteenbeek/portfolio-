import { ActionFormComments } from "./comments-form";
import { fmtDateTime } from "@/lib/format";

export function Comments({ entityType, entityId, comments, canAdd }: {
  entityType: string; entityId: string; comments: { id: string; body: string; created_at: string; by_name: string | null }[]; canAdd: boolean;
}) {
  return (
    <div className="space-y-4">
      {canAdd && <ActionFormComments entityType={entityType} entityId={entityId} />}
      {comments.length === 0 ? <p className="text-sm text-muted">Nog geen opmerkingen.</p> : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md border border-line p-3">
              <div className="text-[12px] text-muted">{c.by_name ?? "Systeem"} · {fmtDateTime(c.created_at)}</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
