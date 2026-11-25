import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function PageHeader({ title, description, crumbs = [], actions, meta }: {
  title: ReactNode; description?: ReactNode; crumbs?: Crumb[]; actions?: ReactNode; meta?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {crumbs.length > 0 && (
        <nav aria-label="Kruimelpad" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight aria-hidden className="h-3.5 w-3.5" />}
                {c.href ? <Link className="hover:text-ink hover:underline" href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-[26px] font-semibold leading-tight">{title}</h1>
          {description && <p className="mt-1.5 text-[15px] text-muted">{description}</p>}
          {meta && <div className="mt-2 flex flex-wrap gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div>}
      </div>
    </div>
  );
}
