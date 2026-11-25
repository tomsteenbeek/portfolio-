"use client";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BrandBar } from "@/components/layout/brand-bar";
import { UserGate } from "@/components/layout/user-gate";
import { NAVIGATION } from "@/config/navigation";
import { can } from "@/lib/auth/permissions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserGate>
      {(user) => {
        const groups = NAVIGATION.map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || can(user.roles, i.perm)) })).filter((g) => g.items.length);
        return (
          <div className="flex min-h-screen">
            <a href="#inhoud" className="skip-link">Direct naar de inhoud</a>
            <Sidebar groups={groups} />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="no-print"><BrandBar /></div>
              <Topbar user={user} />
              <main id="inhoud" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
            </div>
          </div>
        );
      }}
    </UserGate>
  );
}
