import type { Permission } from "@/lib/auth/permissions";

export type NavItem = { label: string; href: string; icon: string; perm?: Permission };
export type NavGroup = { label: string; items: NavItem[] };

export const NAVIGATION: NavGroup[] = [
  {
    label: "Strategie",
    items: [
      { label: "Managementdashboard", href: "/", icon: "LayoutDashboard" },
      { label: "Strategische pijlers", href: "/pijlers", icon: "Landmark" },
      { label: "Jaarplan", href: "/jaarplan", icon: "CalendarRange" },
      { label: "Meerjarenroadmap", href: "/roadmap", icon: "Map" },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { label: "Totale inventarisatie", href: "/inventarisatie", icon: "Table2" },
      { label: "Deepdive", href: "/deepdive", icon: "Layers" },
      { label: "Programma's", href: "/programmas", icon: "Network" },
      { label: "Projecten", href: "/projecten", icon: "FolderKanban" },
      { label: "Prioritering", href: "/prioritering", icon: "Scale" },
      { label: "Kanbanbord", href: "/kanban", icon: "Columns3" },
      { label: "Afhankelijkheden", href: "/afhankelijkheden", icon: "GitBranch" },
      { label: "Besluiten", href: "/besluiten", icon: "Gavel" },
    ],
  },
  {
    label: "Organisatie",
    items: [
      { label: "Reguliere werkzaamheden", href: "/reguliere-werkzaamheden", icon: "Repeat" },
      { label: "Formatie en bezetting", href: "/formatie", icon: "Users", perm: "staffing.view" },
      { label: "Capaciteitsplanning", href: "/capaciteit", icon: "Gauge" },
      { label: "Expertise en competenties", href: "/expertise", icon: "GraduationCap" },
      { label: "Teamontwikkeling", href: "/teamontwikkeling", icon: "Sprout" },
    ],
  },
  {
    label: "Governance",
    items: [
      { label: "Risicoregister", href: "/risicos", icon: "ShieldAlert" },
      { label: "Wet- en regelgeving", href: "/wetgeving", icon: "BookOpen" },
      { label: "Leveranciers", href: "/leveranciers", icon: "Truck" },
      { label: "KPI's en resultaten", href: "/kpis", icon: "Target" },
    ],
  },
  {
    label: "Beheer",
    items: [
      { label: "Gebruikers", href: "/beheer/gebruikers", icon: "UserCog", perm: "users.manage" },
      { label: "Rollen en rechten", href: "/beheer/rollen", icon: "KeyRound" },
      { label: "Instellingen", href: "/beheer/instellingen", icon: "Settings", perm: "settings.edit" },
      { label: "Prioriteringsmodel", href: "/beheer/prioriteringsmodel", icon: "SlidersHorizontal" },
      { label: "Import en export", href: "/beheer/import-export", icon: "ArrowLeftRight" },
      { label: "Wijzigingshistorie", href: "/beheer/historie", icon: "History", perm: "audit.view" },
    ],
  },
];
