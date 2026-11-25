import { OWNER_NO_CAPACITY, OWNER_NO_PERSON } from "@/lib/domain";

export type OwnershipCounts = { person: number; capacity: number; none: number; open: number };

export const OWNERSHIP_SERIES = [
  { key: "person", label: "Eigenaar uit het team", color: "var(--own-person)" },
  { key: "capacity", label: OWNER_NO_CAPACITY, color: "var(--own-capacity)" },
  { key: "none", label: OWNER_NO_PERSON, color: "var(--own-none)" },
  { key: "open", label: "Nog niet bepaald", color: "var(--own-open)" },
] as const;

export function ownershipOf(p: { topics: number; topics_with_owner: number; topics_no_capacity: number; topics_no_person: number }): OwnershipCounts {
  return { person: p.topics_with_owner, capacity: p.topics_no_capacity, none: p.topics_no_person,
    open: Math.max(0, p.topics - p.topics_with_owner - p.topics_no_capacity - p.topics_no_person) };
}

/** Gestapelde balk (100%) met hover-titel per segment; 2px tussenruimte tussen segmenten. */
export function OwnershipBar({ c, label, height = "h-2.5" }: { c: OwnershipCounts; label: string; height?: string }) {
  const total = c.person + c.capacity + c.none + c.open;
  const parts = OWNERSHIP_SERIES.map((s) => ({ ...s, n: c[s.key] })).filter((s) => s.n > 0);
  return (
    <div className={`flex ${height} w-full gap-[2px] overflow-hidden rounded-full`} role="img"
      aria-label={`${label}: ${parts.map((s) => `${s.label} ${s.n}`).join(", ") || "geen onderwerpen"}`}>
      {total === 0 ? <span className="h-full w-full bg-line" /> : parts.map((s) => (
        <span key={s.key} title={`${s.label}: ${s.n} van ${total}`} className="h-full first:rounded-l-full last:rounded-r-full"
          style={{ width: `${(s.n / total) * 100}%`, background: s.color }} />
      ))}
    </div>
  );
}

export function OwnershipLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
      {OWNERSHIP_SERIES.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />{s.label}</li>
      ))}
    </ul>
  );
}
