"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Presentation, Search, UserRound } from "lucide-react";
import { GetForm } from "@/components/common/get-form";
import { listDemoUsers, setDemoUser, type CurrentUser } from "@/lib/auth/current-user";
import { ROLE_LABELS, type RoleCode } from "@/lib/auth/permissions";
import type { DemoUser } from "@/lib/db";

export function Topbar({ user }: { user: CurrentUser }) {
  const [users, setUsers] = useState<DemoUser[]>([]);
  useEffect(() => { listDemoUsers().then(setUsers).catch(() => {}); }, []);
  return (
    <header data-topbar className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-line bg-surface/95 px-4 pl-16 backdrop-blur lg:pl-8">
      <GetForm path="/zoeken" role="search" className="relative w-full max-w-md">
        <label htmlFor="global-search" className="sr-only">Zoeken in onderwerpen, projecten, risico&apos;s en besluiten</label>
        <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input id="global-search" name="q" type="search" placeholder="Zoeken…"
          className="h-9 w-full rounded-md border border-line bg-surface-muted pl-8 pr-3 text-sm placeholder:text-subtle focus:bg-surface focus:border-primary" />
      </GetForm>
      <div className="ml-auto flex items-center gap-3">
        <Link href="/directie" className="hidden md:inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted hover:bg-surface-muted hover:text-ink">
          <Presentation className="h-4 w-4" aria-hidden /> Directieweergave
        </Link>
        <div className="flex items-center gap-2">
          <UserRound className="hidden h-4 w-4 text-subtle sm:block" aria-hidden />
          <label htmlFor="demo-user" className="sr-only">Bekijk als (demorol)</label>
          <select id="demo-user" value={user.email} title="Demo zonder login: kies met welke rol je de applicatie bekijkt"
            onChange={(e) => { setDemoUser(e.target.value); window.location.reload(); }}
            className="h-9 max-w-[220px] rounded-md border border-line bg-surface px-2 text-[13px]">
            {(users.length ? users : [{ email: user.email, display_name: user.displayName, roles: user.roles } as DemoUser]).map((u) => (
              <option key={u.email} value={u.email}>{u.display_name.replace(" (fictief)", "")} – {u.roles.map((r) => ROLE_LABELS[r as RoleCode]).join(", ")}</option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
