import Link from "next/link";
import { cn } from "./cn";

/** Server-vriendelijke tabbladen op basis van ?tab= (deelbaar, werkt zonder JS). */
export function TabLinks({ tabs, active, base }: { tabs: { key: string; label: string; count?: number | null }[]; active: string; base: string }) {
  return (
    <nav aria-label="Tabbladen" className="mb-5 border-b border-line overflow-x-auto no-print">
      <ul className="flex gap-1 min-w-max">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={`${base}${base.includes("?") ? "&" : "?"}tab=${t.key}`}
              aria-current={active === t.key ? "page" : undefined}
              className={cn("inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px",
                active === t.key ? "border-primary text-primary font-medium" : "border-transparent text-muted hover:text-ink")}
            >
              {t.label}
              {t.count != null && <span className="num rounded bg-surface-muted px-1.5 text-[11px] text-muted">{t.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
