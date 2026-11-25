import Link from "next/link";
import { LogOut, Presentation, Search } from "lucide-react";
import type { CurrentUser } from "@/lib/auth/current-user";
import { ROLE_LABELS, type RoleCode } from "@/lib/auth/permissions";

export function Topbar({ user }: { user: CurrentUser }) {
  return (
    <header data-topbar className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-line bg-surface/95 px-4 pl-16 backdrop-blur lg:pl-8">
      <form action="/zoeken" method="get" role="search" className="relative w-full max-w-md">
        <label htmlFor="global-search" className="sr-only">Zoeken in onderwerpen, projecten, risico&apos;s en besluiten</label>
        <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input
          id="global-search"
          name="q"
          type="search"
          placeholder="Zoeken…"
          className="h-9 w-full rounded-md border border-line bg-surface-muted pl-8 pr-3 text-sm placeholder:text-subtle focus:bg-surface focus:border-primary"
        />
      </form>
      <div className="ml-auto flex items-center gap-3">
        <Link href="/directie" className="hidden md:inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted hover:bg-surface-muted hover:text-ink">
          <Presentation className="h-4 w-4" aria-hidden /> Directieweergave
        </Link>
        <div className="hidden sm:block text-right leading-tight">
          <div className="text-[13px] font-medium">{user.displayName}</div>
          <div className="text-[12px] text-muted">{user.roles.map((r) => ROLE_LABELS[r as RoleCode] ?? r).join(", ") || "Geen rol"}</div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="rounded-md p-2 text-muted hover:bg-surface-muted hover:text-ink" aria-label="Uitloggen" title="Uitloggen">
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
