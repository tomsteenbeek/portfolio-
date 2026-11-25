import { db, requirePermission } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserForm } from "@/components/admin/forms";
import { ROLE_LABELS, type RoleCode } from "@/lib/auth/permissions";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Gebruikers" };

export default async function UsersPage() {
  await requirePermission("users.manage");
  const d = await db(async (x) => ({
    users: await x.query<{ id: string; email: string; display_name: string; discipline_id: string | null; discipline: string | null; job_title: string | null; is_active: boolean; is_fictitious: boolean; last_login_at: string | null; external_id: string | null; roles: string[] }>(
      `select u.id, u.email, u.display_name, u.discipline_id, d.name as discipline, u.job_title, u.is_active, u.is_fictitious, u.last_login_at, u.external_id,
              coalesce(array_agg(r.code order by r.code) filter (where r.code is not null), '{}') as roles
         from users u left join disciplines d on d.id = u.discipline_id left join user_roles ur on ur.user_id = u.id left join roles r on r.id = ur.role_id
        group by u.id, d.name order by u.is_active desc, u.display_name`),
    disciplines: await x.query<{ id: string; name: string }>(`select id, name from disciplines order by sort_order`),
  }));
  return (
    <>
      <PageHeader title="Gebruikers" crumbs={[{ label: "Beheer" }, { label: "Gebruikers" }]}
        description="Gebruikers krijgen alleen toegang als ze hier zijn geregistreerd. Bij inloggen via Entra ID wordt gekoppeld op e-mailadres. Rolwijzigingen worden in de auditlog vastgelegd."
        actions={<Dialog trigger="Nieuwe gebruiker" triggerVariant="primary" title="Gebruiker toevoegen" wide><UserForm disciplines={d.disciplines} /></Dialog>} />
      <Card>
        <table className="w-full text-[13px]"><caption className="sr-only">Gebruikers</caption>
          <thead className="bg-surface-muted text-left text-[12px] text-muted"><tr>{["Naam", "E-mail", "Discipline", "Rollen", "Status", "Laatste login", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{d.users.map((u) => (
            <tr key={u.id} className="border-t border-line">
              <td className="px-3 py-2 font-medium">{u.display_name}{u.is_fictitious && <Badge className="ml-1">Fictief</Badge>}</td>
              <td className="px-3">{u.email}</td><td className="px-3">{u.discipline ?? "—"}</td>
              <td className="px-3"><span className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} tone="primary">{ROLE_LABELS[r as RoleCode]}</Badge>)}</span></td>
              <td className="px-3">{u.is_active ? <Badge tone="ok">Actief</Badge> : <Badge>Inactief</Badge>}{u.external_id && <Badge className="ml-1">Entra</Badge>}</td>
              <td className="px-3">{fmtDateTime(u.last_login_at)}</td>
              <td className="px-3 text-right"><Dialog trigger="Bewerken" triggerSize="sm" triggerVariant="ghost" title={`${u.display_name} bewerken`} wide><UserForm u={u} disciplines={d.disciplines} /></Dialog></td>
            </tr>))}</tbody>
        </table>
      </Card>
    </>
  );
}
