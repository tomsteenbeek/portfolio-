export type NavItem = { label: string; href: string; icon: string };
export type NavGroup = { label: string; items: NavItem[] };

export const NAVIGATION: NavGroup[] = [
  {
    label: "Overzicht",
    items: [
      { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
      { label: "Onderwerpen", href: "/onderwerpen", icon: "Table2" },
      { label: "KPI's", href: "/kpis", icon: "Target" },
      { label: "Projecten & initiatieven", href: "/projecten", icon: "FolderKanban" },
    ],
  },
  {
    label: "Sturing",
    items: [
      { label: "Prioritering", href: "/prioritering", icon: "Scale" },
      { label: "Jaarplan", href: "/jaarplan", icon: "CalendarRange" },
      { label: "Roadmap", href: "/roadmap", icon: "Map" },
    ],
  },
];
