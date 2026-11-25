"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { asSystem } from "@/lib/db";
import { isDevLoginEnabled } from "@/lib/auth/entra";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";

/** Ontwikkel-login: kies een fictieve gebruiker. Uitgeschakeld in productie. */
export async function devLogin(formData: FormData) {
  if (!isDevLoginEnabled()) throw new Error("Ontwikkel-login is uitgeschakeld");
  const userId = z.string().uuid().parse(formData.get("userId"));
  const next = String(formData.get("next") ?? "/");
  const ok = await asSystem((db) =>
    db.one<{ id: string }>(`update users set last_login_at = now() where id = $1 and is_active and is_fictitious returning id`, [userId]),
  );
  if (!ok) throw new Error("Onbekende gebruiker");
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(userId), sessionCookieOptions);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
