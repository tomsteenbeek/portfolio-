/**
 * Werkomgeving zonder login: standaard werk je als "Team Digitale Informatie"
 * (alle rechten). Alleen bij prioriteringssessies kies je wie er beoordeelt.
 */
import { dbFor, demoUsers, type Db, type DemoUser } from "@/lib/db";
import { can, type Permission } from "./permissions";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  discipline: string | null;
  disciplineId: string | null;
  roles: string[];
};

const KEY = "di.demo.user";
export const DEFAULT_DEMO_EMAIL = "team@voorbeeld.test";

let current: CurrentUser | null = null;
let cachedUsers: DemoUser[] | null = null;

const toUser = (u: DemoUser): CurrentUser => ({
  id: u.id, email: u.email, displayName: u.display_name, discipline: u.discipline, disciplineId: u.discipline_id, roles: u.roles,
});

export async function listDemoUsers(force = false) {
  if (!cachedUsers || force) cachedUsers = await demoUsers();
  return cachedUsers;
}

/** Laadt de gekozen demogebruiker (of de standaard teamleider). */
export async function loadCurrentUser(): Promise<CurrentUser> {
  const users = await listDemoUsers();
  if (!users.length) throw new Error("Er zijn geen demogebruikers gevonden. Is de database ingericht (migraties en seed)?");
  let email = DEFAULT_DEMO_EMAIL;
  try { email = sessionStorage.getItem(KEY) ?? DEFAULT_DEMO_EMAIL; } catch {}
  const u = users.find((x) => x.email === email) ?? users.find((x) => x.email === DEFAULT_DEMO_EMAIL)
    ?? users.find((x) => x.roles.includes("teamleider")) ?? users[0];
  current = toUser(u);
  return current;
}

/** Tijdelijk (dit tabblad) als een andere deelnemer werken, bv. om te beoordelen in een prioriteringssessie. */
export function setDemoUser(email: string | null) {
  try { if (email) sessionStorage.setItem(KEY, email); else sessionStorage.removeItem(KEY); } catch {}
}

export function getCurrentUser(): CurrentUser | null {
  return current;
}

export async function requireUser(): Promise<CurrentUser> {
  return current ?? loadCurrentUser();
}

export class AuthorizationError extends Error {
  constructor(message = "Hiervoor zijn geen rechten. Werk je als deelnemer in een prioriteringssessie? Ga terug naar Team Digitale Informatie.") {
    super(message);
  }
}

export async function requirePermission(perm: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.roles, perm)) throw new AuthorizationError();
  return user;
}

/** Query's uitvoeren namens de huidige demogebruiker (RLS actief in de database). */
export async function db<T>(fn: (db: Db, user: CurrentUser) => Promise<T>): Promise<T> {
  const user = await requireUser();
  return fn(dbFor(user.id), user);
}
