/**
 * Demomodus zonder login: de gebruiker wordt gekozen in de bovenbalk
 * (standaard de teamleider) en in de browser onthouden.
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
export const DEFAULT_DEMO_EMAIL = "teamleider@voorbeeld.test";

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
  try { email = localStorage.getItem(KEY) ?? DEFAULT_DEMO_EMAIL; } catch {}
  const u = users.find((x) => x.email === email) ?? users.find((x) => x.email === DEFAULT_DEMO_EMAIL) ?? users[0];
  current = toUser(u);
  return current;
}

export function setDemoUser(email: string) {
  try { localStorage.setItem(KEY, email); } catch {}
}

export function getCurrentUser(): CurrentUser | null {
  return current;
}

export async function requireUser(): Promise<CurrentUser> {
  return current ?? loadCurrentUser();
}

export class AuthorizationError extends Error {
  constructor(message = "Deze demorol heeft geen rechten voor deze actie. Wissel rechtsboven van rol.") {
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
