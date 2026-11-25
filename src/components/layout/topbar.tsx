"use client";
import { Search, UserRound, X } from "lucide-react";
import { GetForm } from "@/components/common/get-form";
import { DEFAULT_DEMO_EMAIL, setDemoUser, type CurrentUser } from "@/lib/auth/current-user";

export function Topbar({ user }: { user: CurrentUser }) {
  const asParticipant = user.email !== DEFAULT_DEMO_EMAIL;
  return (
    <header data-topbar className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-line bg-surface/95 px-4 pl-16 backdrop-blur lg:pl-8">
      <GetForm path="/zoeken" role="search" className="relative w-full max-w-md">
        <label htmlFor="global-search" className="sr-only">Zoeken in pijlers, onderwerpen, KPI&apos;s en projecten</label>
        <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input id="global-search" name="q" type="search" placeholder="Zoeken…"
          className="h-9 w-full rounded-md border border-line bg-surface-muted pl-8 pr-3 text-sm placeholder:text-subtle focus:bg-surface focus:border-primary" />
      </GetForm>
      {asParticipant && (
        <div className="ml-auto flex items-center gap-2 rounded-md bg-warn-bg px-3 py-1.5 text-[13px] text-warn">
          <UserRound className="h-4 w-4" aria-hidden />
          Je beoordeelt als <strong>{user.displayName.replace(" (fictief)", "")}</strong>
          <button type="button" className="ml-1 inline-flex items-center gap-1 underline" onClick={() => { setDemoUser(null); window.location.reload(); }}>
            <X className="h-3.5 w-3.5" aria-hidden />Stoppen
          </button>
        </div>
      )}
    </header>
  );
}
