import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PERMISSIONS, ROLE_LABELS, type RoleCode } from "@/lib/auth/permissions";
import { Check } from "lucide-react";

export const metadata = { title: "Rollen en rechten" };

const LABELS: Record<string, string> = {
  "topics.edit": "Onderwerpen aanvullen en bewerken", "topics.approve": "Inhoudelijke beoordelingen goedkeuren", "topics.delete": "Onderwerpen definitief verwijderen",
  "pillars.edit": "Pijlers bewerken", "programs.edit": "Programma's beheren", "projects.create": "Projecten aanmaken", "projects.manage": "Alle projecten beheren",
  "priority.assess": "Prioriteiten beoordelen", "priority.sessions": "Prioriteringssessies beheren, consensus vastleggen", "priority.finalize": "Definitieve prioriteit vaststellen",
  "priority.model": "Prioriteringsmodel beheren", "feasibility.edit": "Haalbaarheid beoordelen", "decisions.edit": "Besluiten registreren", "annualplan.edit": "Jaarplan samenstellen",
  "registers.edit": "KPI's, leveranciers, wetgeving, reguliere werkzaamheden bewerken", "risks.create": "Risico's registreren", "staffing.view": "Formatie- en kostengegevens inzien",
  "staffing.edit": "Formatie beheren", "finance.view": "Financiële informatie inzien", "capacity.edit": "Capaciteit plannen", "users.manage": "Gebruikers en rollen beheren",
  "settings.edit": "Instellingen wijzigen", "import.run": "Gegevens importeren", "audit.view": "Wijzigingshistorie inzien", "comments.add": "Opmerkingen plaatsen",
};

export default function RolesPage() {
  const roles = Object.keys(ROLE_LABELS) as RoleCode[];
  return (
    <>
      <PageHeader title="Rollen en rechten" crumbs={[{ label: "Beheer" }, { label: "Rollen en rechten" }]}
        description="Rechten worden in de interface, in server actions én in de database (Row Level Security) afgedwongen. Projectleiders beheren hun eigen projecten; projectleden kunnen projecten bijwerken waarvoor zij zijn toegevoegd." />
      <Card><CardHeader title="Rechtenmatrix" /><CardBody className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]"><caption className="sr-only">Rechten per rol</caption>
          <thead className="text-left text-[12px] text-muted"><tr><th className="py-2">Recht</th>{roles.map((r) => <th key={r} className="px-2 text-center">{ROLE_LABELS[r]}</th>)}</tr></thead>
          <tbody>{Object.entries(PERMISSIONS).map(([p, rs]) => (
            <tr key={p} className="border-t border-line"><th scope="row" className="py-1.5 text-left font-normal">{LABELS[p] ?? p}</th>
              {roles.map((r) => <td key={r} className="text-center">{(rs as readonly string[]).includes(r) ? <Check className="mx-auto h-4 w-4 text-ok" aria-label="Ja" /> : <span className="sr-only">Nee</span>}</td>)}</tr>))}</tbody>
        </table>
      </CardBody></Card>
    </>
  );
}
