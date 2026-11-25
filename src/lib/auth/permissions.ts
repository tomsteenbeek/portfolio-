/**
 * Centrale rechtenmatrix voor de frontend en server actions.
 * De database dwingt dezelfde regels af via RLS (zie db/migrations/0002).
 */
export type RoleCode = "admin" | "teamleider" | "medewerker" | "projectleider" | "management";

export const PERMISSIONS = {
  "topics.edit": ["admin", "teamleider", "medewerker"],
  "topics.approve": ["admin", "teamleider"],
  "topics.delete": ["admin"],
  "pillars.edit": ["admin", "teamleider"],
  "programs.edit": ["admin", "teamleider", "medewerker"],
  "projects.create": ["admin", "teamleider", "medewerker"],
  "projects.manage": ["admin", "teamleider"],
  "priority.assess": ["admin", "teamleider", "medewerker", "projectleider"],
  "priority.sessions": ["admin", "teamleider"],
  "priority.finalize": ["teamleider"],
  "priority.model": ["admin", "teamleider"],
  "feasibility.edit": ["admin", "teamleider", "medewerker"],
  "decisions.edit": ["admin", "teamleider", "management"],
  "annualplan.edit": ["admin", "teamleider"],
  "registers.edit": ["admin", "teamleider", "medewerker"],
  "risks.create": ["admin", "teamleider", "medewerker", "projectleider"],
  "staffing.view": ["admin", "teamleider", "management"],
  "staffing.edit": ["admin", "teamleider"],
  "finance.view": ["admin", "teamleider", "management"],
  "capacity.edit": ["admin", "teamleider"],
  "users.manage": ["admin"],
  "settings.edit": ["admin", "teamleider"],
  "import.run": ["admin", "teamleider"],
  "audit.view": ["admin", "teamleider"],
  "comments.add": ["admin", "teamleider", "medewerker", "projectleider", "management"],
} as const satisfies Record<string, readonly RoleCode[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(roles: readonly string[] | undefined, perm: Permission): boolean {
  if (!roles) return false;
  return (PERMISSIONS[perm] as readonly string[]).some((r) => roles.includes(r));
}

export const ROLE_LABELS: Record<RoleCode, string> = {
  admin: "Administrator",
  teamleider: "Teamleider",
  medewerker: "Medewerker",
  projectleider: "Projectleider",
  management: "Management / Directie",
};
