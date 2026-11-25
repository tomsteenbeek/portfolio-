import { redirect } from "next/navigation";
import { asSystem } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isDevLoginEnabled, isEntraEnabled } from "@/lib/auth/entra";
import { ROLE_LABELS, type RoleCode } from "@/lib/auth/permissions";
import { BRAND } from "@/config/brand";
import { devLogin } from "./actions";

export const metadata = { title: "Inloggen" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  if (await getCurrentUser()) redirect("/");
  const dev = isDevLoginEnabled();
  const entra = isEntraEnabled();
  const users = dev
    ? await asSystem((db) =>
        db.query<{ id: string; display_name: string; discipline: string | null; roles: string[] }>(
          `select u.id, u.display_name, d.name as discipline, array_agg(r.code order by r.code) as roles
             from users u left join disciplines d on d.id = u.discipline_id
             join user_roles ur on ur.user_id = u.id join roles r on r.id = ur.role_id
            where u.is_active and u.is_fictitious group by u.id, d.name order by u.display_name`,
        ),
      )
    : [];
  return (
    <main className="min-h-screen grid lg:grid-cols-[1fr_520px]">
      <section className="brand-waves hidden lg:flex flex-col justify-between p-12" aria-label="Over deze applicatie">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.logoUrl} alt={BRAND.organisation} className="h-12 w-auto self-start" />
        <div className="max-w-lg rounded-lg bg-surface/85 p-8 backdrop-blur-sm">
          <h1 className="text-4xl font-semibold leading-tight text-[var(--sidebar-active-fg)]">{BRAND.appName}<br /><span className="font-normal text-muted">{BRAND.appSubtitle}</span></h1>
          <p className="mt-6 text-[17px] leading-relaxed text-ink">
            Van reactief beheer naar proactieve regie – een betrouwbare digitale basis voor een toekomstbestendige gemeente.
          </p>
        </div>
        <div className="text-[12px] text-muted">Intern gebruik · team Digitale Informatie</div>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12 bg-surface">
        <div className="w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logoUrl} alt={BRAND.organisation} className="mb-8 h-10 w-auto lg:hidden" />
          <h2 className="text-2xl font-semibold">Inloggen</h2>
          {sp.error && <p role="alert" className="mt-3 rounded-md bg-bad-bg px-3 py-2 text-sm text-bad">{sp.error}</p>}
          {entra && (
            <a href={`/api/auth/entra/login${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`}
               className="mt-6 flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-white hover:bg-primary-hover">
              Inloggen met gemeentelijk account
            </a>
          )}
          {dev && (
            <div className="mt-6">
              <p className="text-sm text-muted">
                <strong className="text-ink">Ontwikkelomgeving.</strong> Kies een fictieve gebruiker om de applicatie per rol te testen. Deze login is uitgeschakeld in productie.
              </p>
              <ul className="mt-4 space-y-2">
                {users.map((u) => (
                  <li key={u.id}>
                    <form action={devLogin}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="next" value={sp.next ?? "/"} />
                      <button type="submit" className="w-full rounded-md border border-line px-3 py-2.5 text-left hover:border-primary hover:bg-primary-soft">
                        <div className="text-sm font-medium">{u.display_name}</div>
                        <div className="text-[12px] text-muted">
                          {u.roles.map((r) => ROLE_LABELS[r as RoleCode]).join(", ")}{u.discipline ? ` · ${u.discipline}` : ""}
                        </div>
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
              {users.length === 0 && <p className="mt-4 text-sm text-bad">Geen fictieve gebruikers gevonden. Voer <code>npm run db:seed</code> uit.</p>}
            </div>
          )}
          {!dev && !entra && (
            <p className="mt-6 rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">
              Er is geen inlogmethode geconfigureerd. Stel AUTH_MODE in (zie README).
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
