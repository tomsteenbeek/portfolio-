import { db } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { activeModel, modelVersions } from "@/server/queries/priority";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ModelForm } from "@/components/admin/forms";
import { RubricTable } from "@/components/priority/score-input";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/format";

export const metadata = { title: "Prioriteringsmodel" };

export default async function ModelPage() {
  const d = await db(async (x, user) => ({ model: await activeModel(x), versions: await modelVersions(x), user }));
  const edit = can(d.user.roles, "priority.model");
  return (
    <>
      <PageHeader title="Prioriteringsmodel" crumbs={[{ label: "Beheer" }, { label: "Prioriteringsmodel" }]}
        description="PriorityScore = Σ (score / 5 × gewicht). Wijzigingen worden opgeslagen als nieuwe versie; bestaande sessies blijven hun versie gebruiken (reproduceerbaar)." />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card><CardHeader title={`Actieve versie ${d.model?.version}`} /><CardBody>{edit && d.model ? <ModelForm criteria={d.model.criteria} /> : d.model && <RubricTable criteria={d.model.criteria} />}</CardBody></Card>
        <Card><CardHeader title="Versiegeschiedenis" /><ul className="divide-y divide-line text-[13px]">
          {d.versions.map((v) => <li key={v.id} className="px-5 py-2.5"><div className="flex items-center gap-2 font-medium">Versie {v.version}{v.is_active && <Badge tone="ok">Actief</Badge>}<span className="font-normal text-muted">· {v.sessions} sessie(s)</span></div>
            <div className="text-muted">{fmtDateTime(v.created_at)}{v.description ? ` – ${v.description}` : ""}</div><div className="num text-[12px]">{v.weights}</div></li>)}</ul></Card>
      </div>
    </>
  );
}
