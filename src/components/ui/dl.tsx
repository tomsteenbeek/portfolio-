import type { ReactNode } from "react";

export function DescriptionList({ items, cols = 2 }: { items: { label: string; value: ReactNode }[]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cols === 1 ? "grid gap-3" : cols === 3 ? "grid gap-x-6 gap-y-3 sm:grid-cols-3" : "grid gap-x-6 gap-y-3 sm:grid-cols-2"}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-[12px] font-medium uppercase tracking-wide text-muted">{i.label}</dt>
          <dd className="mt-0.5 text-sm whitespace-pre-wrap break-words">{i.value ?? <span className="text-subtle">Onbekend</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Text({ value, empty = "Nog niet ingevuld" }: { value: string | null | undefined; empty?: string }) {
  return value ? <>{value}</> : <span className="text-subtle">{empty}</span>;
}
