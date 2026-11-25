"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import type { NavGroup } from "@/config/navigation";
import { BRAND } from "@/config/brand";
import { cn } from "@/components/ui/cn";

const KEY = "di.sidebar.collapsed";

export function Sidebar({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(KEY) === "1"); } catch {}
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);

  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(KEY, c ? "0" : "1"); } catch {}
      return !c;
    });
  };
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      <button
        type="button"
        className="fixed left-3 top-3 z-40 rounded-md border border-line bg-surface p-2 text-ink shadow-card lg:hidden no-print"
        aria-label={mobileOpen ? "Menu sluiten" : "Menu openen"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((o) => !o)}
      >
        {mobileOpen ? <Icons.X className="h-5 w-5" /> : <Icons.PanelLeftOpen className="h-5 w-5" />}
      </button>
      <aside
        className={cn(
          "sidebar no-print fixed inset-y-0 left-0 z-30 flex flex-col border-r border-line bg-sidebar text-sidebar-fg transition-[width,transform] duration-150",
          collapsed ? "lg:w-[64px]" : "lg:w-[256px]",
          "w-[272px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        aria-label="Hoofdnavigatie"
      >
        <div className={cn("border-b border-line px-4 py-3 shrink-0", collapsed && "lg:px-2")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logoUrl} alt={BRAND.organisation} className={cn("h-9 w-auto max-w-full object-contain", collapsed && "lg:hidden")} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.markUrl} alt={BRAND.organisation} className={cn("mx-auto hidden h-9 w-auto object-contain", collapsed && "lg:block")} />
          <div className={cn("mt-2 leading-tight", collapsed && "lg:hidden")}>
            <div className="text-[14px] font-semibold text-sidebar-active-fg">{BRAND.appName}</div>
            <div className="text-[12px] text-sidebar-muted">{BRAND.appSubtitle}</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3" aria-label="Modules">
          {groups.map((g) => (
            <div key={g.label} className="mb-3">
              <div className={cn("px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted", collapsed && "lg:sr-only")}>{g.label}</div>
              <ul>
                {g.items.map((item) => {
                  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[item.icon] ?? Icons.Circle;
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "mx-2 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[14px]",
                          active ? "bg-sidebar-active text-sidebar-active-fg font-semibold" : "text-sidebar-fg hover:bg-surface-muted",
                          collapsed && "lg:justify-center lg:px-0",
                        )}
                      >
                        <Icon aria-hidden className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-sidebar-muted")} />
                        <span className={cn("truncate", collapsed && "lg:sr-only")}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <button
          type="button"
          onClick={toggle}
          className="hidden lg:flex items-center gap-2 border-t border-line px-4 h-11 text-[13px] text-sidebar-muted hover:text-ink"
          aria-label={collapsed ? "Zijbalk uitklappen" : "Zijbalk inklappen"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <Icons.PanelLeftOpen className="h-4 w-4 mx-auto" /> : <><Icons.PanelLeftClose className="h-4 w-4" /> Inklappen</>}
        </button>
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />}
      <SidebarSpacer collapsed={collapsed} />
    </>
  );
}

function SidebarSpacer({ collapsed }: { collapsed: boolean }) {
  return <div aria-hidden className={cn("hidden lg:block shrink-0 transition-[width] no-print", collapsed ? "w-[64px]" : "w-[256px]")} />;
}
