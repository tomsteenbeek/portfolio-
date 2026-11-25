import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { asSystem, withUser, type Db } from "@/lib/db";
import { can, type Permission } from "./permissions";
import { SESSION_COOKIE, verifySession } from "./session";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  discipline: string | null;
  disciplineId: string | null;
  roles: string[];
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return asSystem(async (db) => {
    const u = await db.one<{
      id: string; email: string; display_name: string; discipline: string | null; discipline_id: string | null; roles: string[];
    }>(
      `select u.id, u.email, u.display_name, d.name as discipline, u.discipline_id,
              coalesce(array_agg(r.code) filter (where r.code is not null), '{}') as roles
         from users u left join disciplines d on d.id = u.discipline_id
         left join user_roles ur on ur.user_id = u.id left join roles r on r.id = ur.role_id
        where u.id = $1 and u.is_active group by u.id, d.name`,
      [session.sub],
    );
    return u
      ? { id: u.id, email: u.email, displayName: u.display_name, discipline: u.discipline, disciplineId: u.discipline_id, roles: u.roles }
      : null;
  });
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(perm: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.roles, perm)) throw new AuthorizationError();
  return user;
}

export class AuthorizationError extends Error {
  constructor(message = "U heeft geen rechten voor deze actie.") {
    super(message);
  }
}

/** Shortcut: query's uitvoeren onder de identiteit van de huidige gebruiker (RLS actief). */
export async function db<T>(fn: (db: Db, user: CurrentUser) => Promise<T>): Promise<T> {
  const user = await requireUser();
  return withUser(user.id, (d) => fn(d, user));
}
