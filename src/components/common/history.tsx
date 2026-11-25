import { fmtDateTime } from "@/lib/format";

const ACTION: Record<string, string> = { INSERT: "Aangemaakt", UPDATE: "Gewijzigd", DELETE: "Verwijderd" };
const short = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "leeg";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
};

export function History({ entries, allowed }: {
  entries: { id: number; table_name: string; action: string; changed_fields: string[] | null; changed_at: string; by_name: string | null;
    old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null }[];
  allowed: boolean;
}) {
  if (!allowed) return <p className="text-sm text-muted">De volledige wijzigingshistorie is zichtbaar voor de teamleider en beheerders.</p>;
  if (!entries.length) return <p className="text-sm text-muted">Nog geen wijzigingen vastgelegd.</p>;
  return (
    <ol className="relative space-y-3 border-l border-line pl-4">
      {entries.map((e) => (
        <li key={e.id} className="text-[13px]">
          <div className="text-muted">{fmtDateTime(e.changed_at)} · {e.by_name ?? "Systeem/seed"} · {ACTION[e.action] ?? e.action}{e.table_name !== "topics" ? ` (${e.table_name})` : ""}</div>
          {e.action === "UPDATE" && e.changed_fields && (
            <ul className="mt-0.5 space-y-0.5">
              {e.changed_fields.filter((f) => f !== "version").map((f) => (
                <li key={f}><span className="font-medium">{f}</span>: <span className="text-muted line-through">{short(e.old_data?.[f])}</span> → {short(e.new_data?.[f])}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
